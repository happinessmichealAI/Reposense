import simpleGit from 'simple-git';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Temporary directory for cloning repos
const TEMP_DIR = path.join(__dirname, 'temp');

// Maximum files to analyze
const MAX_FILES = 250;

// Timeout for operations (30 seconds)
const TIMEOUT_MS = 30000;

/**
 * Parse a GitHub repository and extract dependency graph
 * @param {string} repoUrl - GitHub repository URL or name (e.g., "facebook/react" or "https://github.com/facebook/react")
 * @returns {Promise<Object>} - { nodes, links, sampled, totalFiles }
 */
export async function parseRepository(repoUrl) {
  const startTime = Date.now();
  
  // Normalize repo URL
  const normalizedUrl = normalizeRepoUrl(repoUrl);
  const repoName = extractRepoName(repoUrl);
  const clonePath = path.join(TEMP_DIR, repoName.replace('/', '-'));

  try {
    // Ensure temp directory exists
    await fs.mkdir(TEMP_DIR, { recursive: true });

    // Clone repository (shallow clone for speed)
    console.log(`[Parser] Cloning ${normalizedUrl}...`);
    await cloneRepository(normalizedUrl, clonePath);

    // Check timeout
    if (Date.now() - startTime > TIMEOUT_MS) {
      throw new Error('Analysis timeout - repository too large');
    }

    // Scan for JS/TS files
    console.log(`[Parser] Scanning for JS/TS files...`);
    const files = await scanFiles(clonePath);
    console.log(`[Parser] Found ${files.length} JS/TS files`);

    // Parse dependencies
    console.log(`[Parser] Parsing dependencies...`);
    const { nodes, links } = await parseDependencies(files, clonePath);

    // Apply sampling if needed
    let finalNodes = nodes;
    let finalLinks = links;
    let sampled = false;
    const totalFiles = nodes.length;

    if (nodes.length > MAX_FILES) {
      console.log(`[Parser] Sampling ${MAX_FILES} files from ${totalFiles}...`);
      const sampledData = sampleNodes(nodes, links, MAX_FILES);
      finalNodes = sampledData.nodes;
      finalLinks = sampledData.links;
      sampled = true;
    }

    // Cleanup
    await cleanupRepo(clonePath);

    console.log(`[Parser] Analysis complete: ${finalNodes.length} nodes, ${finalLinks.length} links`);

    return {
      nodes: finalNodes,
      links: finalLinks,
      sampled,
      totalFiles,
    };

  } catch (error) {
    // Cleanup on error
    await cleanupRepo(clonePath);
    throw error;
  }
}

/**
 * Normalize repository URL
 */
function normalizeRepoUrl(repoUrl) {
  // If it's already a full URL, return it
  if (repoUrl.startsWith('http://') || repoUrl.startsWith('https://')) {
    return repoUrl;
  }
  
  // If it's in format "owner/repo", convert to GitHub URL
  if (repoUrl.includes('/') && !repoUrl.includes('\\')) {
    return `https://github.com/${repoUrl}.git`;
  }
  
  throw new Error('Invalid repository URL format');
}

/**
 * Extract repository name from URL
 */
function extractRepoName(repoUrl) {
  if (repoUrl.includes('/') && !repoUrl.includes('\\')) {
    const parts = repoUrl.split('/');
    return parts.slice(-2).join('/').replace('.git', '');
  }
  return repoUrl;
}

/**
 * Clone repository using simple-git
 */
async function cloneRepository(url, targetPath) {
  const git = simpleGit();
  
  try {
    await git.clone(url, targetPath, ['--depth', '1']);
  } catch (error) {
    if (error.message.includes('not found') || error.message.includes('404')) {
      throw new Error('Repository not found');
    }
    throw new Error(`Clone failed: ${error.message}`);
  }
}

/**
 * Recursively scan directory for JS/TS files
 */
async function scanFiles(dirPath) {
  const files = [];
  const extensions = ['.js', '.jsx', '.ts', '.tsx'];

  async function scan(currentPath) {
    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        
        // Skip node_modules, .git, dist, build, etc.
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage', '.next', 'out'];
          if (!skipDirs.includes(entry.name)) {
            await scan(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
      console.warn(`[Parser] Skipping ${currentPath}: ${error.message}`);
    }
  }

  await scan(dirPath);
  return files;
}

/**
 * Parse dependencies from files
 */
async function parseDependencies(files, basePath) {
  const nodes = [];
  const links = [];
  const fileMap = new Map();

  // First pass: create nodes and count imports
  for (const filePath of files) {
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');
    const content = await fs.readFile(filePath, 'utf-8');
    
    // Count how many files import this file (will be calculated in second pass)
    const node = {
      id: relativePath,
      group: determineGroup(relativePath),
      risk: 'low', // Will be calculated based on importCount
      importCount: 0, // CRITICAL: This field must be preserved
    };

    nodes.push(node);
    fileMap.set(relativePath, { node, imports: parseImports(content, relativePath, basePath) });
  }

  // Second pass: create links and calculate importCount
  for (const [sourceFile, data] of fileMap.entries()) {
    for (const targetFile of data.imports) {
      if (fileMap.has(targetFile)) {
        links.push({ source: sourceFile, target: targetFile });
        
        // Increment importCount for the target file
        const targetNode = fileMap.get(targetFile).node;
        targetNode.importCount++;
      }
    }
  }

  // Third pass: calculate risk based on importCount
  for (const node of nodes) {
    if (node.importCount > 5) {
      node.risk = 'high';
    } else if (node.importCount >= 2) {
      node.risk = 'medium';
    } else {
      node.risk = 'low';
    }
  }

  return { nodes, links };
}

/**
 * Parse import/require statements from file content
 */
function parseImports(content, currentFile, basePath) {
  const imports = [];
  const currentDir = path.dirname(currentFile);

  // Match ES6 imports: import ... from '...'
  const es6ImportRegex = /import\s+(?:[\w\s{},*]+\s+from\s+)?['"]([^'"]+)['"]/g;
  
  // Match CommonJS requires: require('...')
  const cjsRequireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

  let match;

  // Parse ES6 imports
  while ((match = es6ImportRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolved = resolveImportPath(importPath, currentDir, basePath);
      if (resolved) imports.push(resolved);
    }
  }

  // Parse CommonJS requires
  while ((match = cjsRequireRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      const resolved = resolveImportPath(importPath, currentDir, basePath);
      if (resolved) imports.push(resolved);
    }
  }

  return imports;
}

/**
 * Resolve relative import path to absolute file path
 */
function resolveImportPath(importPath, currentDir, basePath) {
  try {
    // Remove leading './'
    const cleanPath = importPath.replace(/^\.\//, '');
    
    // Resolve relative to current directory
    let resolved = path.join(currentDir, cleanPath);
    
    // Try adding extensions if not present
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '/index.js', '/index.ts'];
    
    for (const ext of extensions) {
      const testPath = resolved + ext;
      const relativePath = path.relative(basePath, testPath).replace(/\\/g, '/');
      
      // Check if this file exists in our file map (we'll validate later)
      return relativePath;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Determine node group based on file path
 */
function determineGroup(filePath) {
  const lower = filePath.toLowerCase();
  
  if (lower.includes('auth') || lower.includes('middleware') || lower.includes('session')) {
    return 'auth';
  }
  
  if (lower.includes('util') || lower.includes('helper') || lower.includes('lib')) {
    return 'utils';
  }
  
  return 'service';
}

/**
 * Sample nodes using import score algorithm
 */
function sampleNodes(nodes, links, maxNodes) {
  // Sort nodes by importCount descending
  const sortedNodes = [...nodes].sort((a, b) => b.importCount - a.importCount);
  
  // Take top maxNodes
  const sampledNodes = sortedNodes.slice(0, maxNodes);
  const sampledNodeIds = new Set(sampledNodes.map(n => n.id));
  
  // Filter links to only include those where both source and target are in sampled nodes
  const sampledLinks = links.filter(
    link => sampledNodeIds.has(link.source) && sampledNodeIds.has(link.target)
  );
  
  // If we have fewer than 50 nodes, lower the threshold
  if (sampledNodes.length < 50) {
    const additionalNodes = sortedNodes.slice(maxNodes, maxNodes + 50);
    sampledNodes.push(...additionalNodes);
    
    const updatedNodeIds = new Set(sampledNodes.map(n => n.id));
    const updatedLinks = links.filter(
      link => updatedNodeIds.has(link.source) && updatedNodeIds.has(link.target)
    );
    
    return { nodes: sampledNodes, links: updatedLinks };
  }
  
  return { nodes: sampledNodes, links: sampledLinks };
}

/**
 * Cleanup cloned repository
 */
async function cleanupRepo(repoPath) {
  try {
    await fs.rm(repoPath, { recursive: true, force: true });
    console.log(`[Parser] Cleaned up ${repoPath}`);
  } catch (error) {
    console.warn(`[Parser] Cleanup failed: ${error.message}`);
  }
}

// Made with Bob
