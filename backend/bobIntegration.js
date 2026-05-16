import { exec } from 'child_process';
import { promisify } from 'util';
import { saveToSupabase } from './supabase.js';

const execAsync = promisify(exec);

/**
 * Merge IBM Bob data with parser data
 * CRITICAL: Preserves importCount from parser
 */
export function mergeBobWithParser(bobData, parserData) {
  // Build a lookup of parserData nodes by id
  const parserMap = Object.fromEntries(parserData.nodes.map(n => [n.id, n]));

  const mergedNodes = bobData.nodes.map(bobNode => ({
    ...bobNode,
    // importCount ALWAYS comes from parserData — never from Bob
    importCount: parserMap[bobNode.id]?.importCount ?? 0,
  }));

  // Add any parserData nodes Bob missed entirely
  parserData.nodes.forEach(pNode => {
    if (!mergedNodes.find(n => n.id === pNode.id)) {
      mergedNodes.push(pNode);
    }
  });

  return { 
    ...bobData, 
    nodes: mergedNodes,
    sampled: parserData.sampled,
    totalFiles: parserData.totalFiles,
  };
}

/**
 * Call IBM Bob Shell for repository analysis
 * @param {string} repoPath - Path to cloned repository
 * @param {object} parserData - Parser output with nodes and links
 * @param {string} repoName - Repository name for logging
 * @returns {Promise<Object>} - Bob's analysis merged with parser data
 */
export async function analyzeWithBob(repoPath, parserData, repoName) {
  try {
    console.log('[IBM Bob] Starting analysis...');

    // Build the prompt for IBM Bob
    const fileList = parserData.nodes
      .slice(0, 50) // Send top 50 files to Bob for context
      .map(n => `${n.id} (imported by ${n.importCount} files, risk: ${n.risk})`)
      .join('\n');

    const prompt = `Analyze this repository for dependency impact intelligence. Prioritize dependency impact and operational risk over completeness. Return ONLY valid JSON — no prose, no markdown, no explanation. Schema:
{
  "nodes": [
    {
      "id": "paymentProcessor.ts",
      "group": "service",
      "risk": "high",
      "blastRadius": 14,
      "reason": "Used by authentication and payment services"
    }
  ],
  "links": [{ "source": "paymentProcessor.ts", "target": "auth.ts" }]
}

Repository files:
${fileList}

Analyze the dependency relationships and provide blast radius estimates with reasoning for high-risk modules.`;

    // Call IBM Bob Shell
    // NOTE: This is a placeholder for the actual IBM Bob Shell integration
    // Replace with the actual Bob Shell command when available
    const bobCommand = `echo '${JSON.stringify({ 
      prompt,
      model: 'ibm-bob-shell',
      temperature: 0.3,
    })}'`;

    const { stdout, stderr } = await execAsync(bobCommand, {
      timeout: 15000, // 15 second timeout for Bob
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
    });

    if (stderr) {
      console.warn('[IBM Bob] Warning:', stderr);
    }

    // Parse Bob's response
    let bobData;
    try {
      bobData = JSON.parse(stdout);
    } catch (parseError) {
      throw new Error('IBM Bob returned invalid JSON');
    }

    // Validate Bob's response structure
    if (!bobData.nodes || !Array.isArray(bobData.nodes)) {
      throw new Error('IBM Bob response missing nodes array');
    }

    if (!bobData.links || !Array.isArray(bobData.links)) {
      throw new Error('IBM Bob response missing links array');
    }

    console.log(`[IBM Bob] Analysis complete: ${bobData.nodes.length} nodes analyzed`);

    // Merge Bob's intelligence with parser data
    const mergedData = mergeBobWithParser(bobData, parserData);

    // Save to Supabase (wrapped in try/catch so Supabase failure never crashes analysis)
    try {
      await saveToSupabase(repoName, mergedData, false);
    } catch (supabaseError) {
      console.warn('[IBM Bob] Supabase save failed, continuing anyway:', supabaseError.message);
    }

    return mergedData;

  } catch (error) {
    console.error('[IBM Bob] Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Check if IBM Bob Shell is available
 * @returns {Promise<boolean>}
 */
export async function isBobAvailable() {
  try {
    // Check if Bob Shell is installed/accessible
    // This is a placeholder - replace with actual Bob Shell check
    const { stdout } = await execAsync('echo "bob-check"', { timeout: 2000 });
    return stdout.includes('bob-check');
  } catch (error) {
    return false;
  }
}

// Made with Bob
