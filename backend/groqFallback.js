import Groq from 'groq-sdk';
import { saveToSupabase } from './supabase.js';

// Initialize Groq client
let groq = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('[Groq] Client initialized');
} else {
  console.warn('[Groq] API key not found - fallback disabled');
}

/**
 * Merge Groq data with parser data
 * CRITICAL: Preserves importCount from parser
 */
export function mergeGroqWithParser(groqData, parserData) {
  // Build a lookup of parserData nodes by id
  const parserMap = Object.fromEntries(parserData.nodes.map(n => [n.id, n]));

  const mergedNodes = groqData.nodes.map(groqNode => ({
    ...groqNode,
    // importCount ALWAYS comes from parserData — never from Groq
    importCount: parserMap[groqNode.id]?.importCount ?? 0,
  }));

  // Add any parserData nodes Groq missed entirely
  parserData.nodes.forEach(pNode => {
    if (!mergedNodes.find(n => n.id === pNode.id)) {
      mergedNodes.push(pNode);
    }
  });

  return { 
    ...groqData, 
    nodes: mergedNodes,
    sampled: parserData.sampled,
    totalFiles: parserData.totalFiles,
  };
}

/**
 * Analyze repository using Groq API
 * @param {object} parserData - Parser output with nodes and links
 * @param {string} repoName - Repository name for logging
 * @returns {Promise<Object>} - Groq's analysis merged with parser data
 */
export async function analyzeWithGroq(parserData, repoName) {
  if (!groq) {
    throw new Error('Groq API key not configured');
  }

  try {
    console.log('[Groq] Starting analysis...');

    // Build file list with import counts for context
    const fileList = parserData.nodes
      .slice(0, 50) // Send top 50 files for context
      .map(n => `${n.id} (imported by ${n.importCount} files)`)
      .join('\n');

    const prompt = `Analyze these repository files for dependency risk. Return ONLY valid JSON, no prose, no markdown. Schema: { "nodes": [{ "id": string, "group": "service"|"auth"|"utils", "risk": "high"|"medium"|"low", "blastRadius": number, "reason": string }], "links": [{ "source": string, "target": string }] }

Files:
${fileList}

Focus on high-risk modules with many dependencies. Provide blast radius estimates and reasoning.`;

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      max_tokens: 1500,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt,
      }],
    });

    const content = response.choices[0].message.content;
    console.log('[Groq] Raw response:', content.substring(0, 200) + '...');

    // Parse Groq's response
    let groqData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      groqData = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('[Groq] Parse error:', parseError.message);
      throw new Error('Groq returned invalid JSON');
    }

    // Validate Groq's response structure
    if (!groqData.nodes || !Array.isArray(groqData.nodes)) {
      throw new Error('Groq response missing nodes array');
    }

    if (!groqData.links || !Array.isArray(groqData.links)) {
      throw new Error('Groq response missing links array');
    }

    console.log(`[Groq] Analysis complete: ${groqData.nodes.length} nodes analyzed`);

    // Merge Groq's intelligence with parser data
    const mergedData = mergeGroqWithParser(groqData, parserData);

    // Save to Supabase (wrapped in try/catch so Supabase failure never crashes analysis)
    try {
      await saveToSupabase(repoName, mergedData, true);
    } catch (supabaseError) {
      console.warn('[Groq] Supabase save failed, continuing anyway:', supabaseError.message);
    }

    return mergedData;

  } catch (error) {
    console.error('[Groq] Analysis failed:', error.message);
    throw error;
  }
}

/**
 * Check if Groq API is available
 * @returns {boolean}
 */
export function isGroqAvailable() {
  return groq !== null;
}

// Made with Bob
