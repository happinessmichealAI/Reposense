import Groq from 'groq-sdk';

// Initialize Groq client
let groq = null;

if (process.env.GROQ_API_KEY) {
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  console.log('[Ask Repo] Groq client initialized');
} else {
  console.warn('[Ask Repo] Groq API key not found - chat disabled');
}

/**
 * Answer questions about the repository using Groq
 * @param {string} question - User's question
 * @param {object} graphData - Repository graph data for context
 * @returns {Promise<Object>} - { question, answer }
 */
export async function askRepo(question, graphData) {
  if (!groq) {
    return {
      question,
      answer: 'Chat functionality requires a Groq API key. Please configure GROQ_API_KEY in your environment variables.',
    };
  }

  try {
    console.log('[Ask Repo] Processing question:', question);

    // Build context from graph data
    const context = buildContext(graphData);

    const response = await groq.chat.completions.create({
      model: 'llama3-70b-8192',
      max_tokens: 500,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: 'You are a repository intelligence assistant. Answer questions about this codebase using the dependency data provided. Be concise and specific. Focus on practical insights about dependencies, risks, and blast radius.',
        },
        {
          role: 'user',
          content: `Repository data:\n${context}\n\nQuestion: ${question}`,
        },
      ],
    });

    const answer = response.choices[0].message.content;
    console.log('[Ask Repo] Answer generated');

    return { question, answer };

  } catch (error) {
    console.error('[Ask Repo] Error:', error.message);
    
    return {
      question,
      answer: `I encountered an error processing your question: ${error.message}. Please try rephrasing or ask something else.`,
    };
  }
}

/**
 * Build context string from graph data
 * @param {object} graphData - Repository graph data
 * @returns {string} - Formatted context
 */
function buildContext(graphData) {
  if (!graphData || !graphData.nodes) {
    return 'No repository data available.';
  }

  // Get top 50 nodes by import count
  const topNodes = [...graphData.nodes]
    .sort((a, b) => (b.importCount || 0) - (a.importCount || 0))
    .slice(0, 50);

  // Format as readable context
  const nodeContext = topNodes.map(n => {
    const parts = [
      `- ${n.id}`,
      `risk: ${n.risk}`,
      `imported by ${n.importCount || 0} files`,
    ];
    
    if (n.blastRadius) {
      parts.push(`blast radius: ${n.blastRadius}`);
    }
    
    if (n.reason) {
      parts.push(`reason: ${n.reason}`);
    }
    
    return parts.join(', ');
  }).join('\n');

  // Add summary stats
  const stats = {
    totalFiles: graphData.totalFiles || graphData.nodes.length,
    highRisk: graphData.nodes.filter(n => n.risk === 'high').length,
    mediumRisk: graphData.nodes.filter(n => n.risk === 'medium').length,
    lowRisk: graphData.nodes.filter(n => n.risk === 'low').length,
  };

  return `Repository Statistics:
- Total files: ${stats.totalFiles}
- High risk: ${stats.highRisk}
- Medium risk: ${stats.mediumRisk}
- Low risk: ${stats.lowRisk}

Top Files by Import Count:
${nodeContext}`;
}

/**
 * Get suggested questions based on graph data
 * @param {object} graphData - Repository graph data
 * @returns {Array<string>} - Suggested questions
 */
export function getSuggestedQuestions(graphData) {
  const questions = [
    'What is the riskiest file to modify?',
    'Which files have the highest blast radius?',
    'What would break if I deleted auth.ts?',
  ];

  // Add dynamic questions based on actual data
  if (graphData && graphData.nodes) {
    const highRiskFiles = graphData.nodes
      .filter(n => n.risk === 'high')
      .slice(0, 3);

    if (highRiskFiles.length > 0) {
      questions.push(`Why is ${highRiskFiles[0].id} considered high risk?`);
    }

    const topImported = [...graphData.nodes]
      .sort((a, b) => (b.importCount || 0) - (a.importCount || 0))[0];

    if (topImported) {
      questions.push(`What depends on ${topImported.id}?`);
    }
  }

  return questions;
}

// Made with Bob
