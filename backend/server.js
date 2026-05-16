import express from 'express';
import cors from 'cors';
import { parseRepository } from './parser.js';
import { analyzeWithBob, isBobAvailable } from './bobIntegration.js';
import { analyzeWithGroq, isGroqAvailable } from './groqFallback.js';
import { askRepo } from './askRepo.js';
import { exportBobSessions } from './supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ═══════════════════════════════════════════════════════════
// CRITICAL: CORS MUST BE FIRST
// ═══════════════════════════════════════════════════════════
app.use(cors({ origin: '*' })); // Development - Vercel handles CORS in production

// Middleware
app.use(express.json());

// Demo data fallback (Level 4) - MUST match Graph.jsx DEMO_NODES exactly
const DEMO_DATA = {
  nodes: [
    { id:"paymentProcessor.ts",    group:"service", risk:"high",   blastRadius:14, importCount:8,  reason:"Used by authentication and payment services — critical path for all transactions" },
    { id:"auth.ts",                group:"auth",    risk:"high",   blastRadius:11, importCount:12, reason:"Core auth module imported by every protected route and service" },
    { id:"userController.ts",      group:"service", risk:"medium", importCount:4 },
    { id:"database.ts",            group:"service", risk:"high",   blastRadius:9,  importCount:15, reason:"Shared DB layer — failure cascades into all services" },
    { id:"emailService.ts",        group:"service", risk:"medium", importCount:3 },
    { id:"logger.ts",              group:"utils",   risk:"low",    importCount:1 },
    { id:"config.ts",              group:"utils",   risk:"medium", importCount:5 },
    { id:"middleware.ts",          group:"auth",    risk:"medium", importCount:6 },
    { id:"orderService.ts",        group:"service", risk:"high",   importCount:7 },
    { id:"notificationService.ts", group:"service", risk:"medium", importCount:4 },
    { id:"helpers.ts",             group:"utils",   risk:"low",    importCount:2 },
    { id:"routes.ts",              group:"service", risk:"medium", importCount:5 },
    { id:"validationUtils.ts",     group:"utils",   risk:"low",    importCount:1 },
    { id:"sessionManager.ts",      group:"auth",    risk:"high",   importCount:8 },
    { id:"cacheService.ts",        group:"service", risk:"medium", importCount:6 },
    { id:"rateLimiter.ts",         group:"auth",    risk:"medium", importCount:4 },
    { id:"errorHandler.ts",        group:"utils",   risk:"low",    importCount:2 },
    { id:"apiGateway.ts",          group:"service", risk:"high",   importCount:9 },
  ],
  links: [
    { source:"paymentProcessor.ts",    target:"database.ts"            },
    { source:"paymentProcessor.ts",    target:"auth.ts"                },
    { source:"paymentProcessor.ts",    target:"logger.ts"              },
    { source:"paymentProcessor.ts",    target:"orderService.ts"        },
    { source:"auth.ts",                target:"database.ts"            },
    { source:"auth.ts",                target:"sessionManager.ts"      },
    { source:"auth.ts",                target:"config.ts"              },
    { source:"userController.ts",      target:"auth.ts"                },
    { source:"userController.ts",      target:"emailService.ts"        },
    { source:"userController.ts",      target:"database.ts"            },
    { source:"orderService.ts",        target:"database.ts"            },
    { source:"orderService.ts",        target:"notificationService.ts" },
    { source:"orderService.ts",        target:"cacheService.ts"        },
    { source:"middleware.ts",          target:"auth.ts"                },
    { source:"middleware.ts",          target:"logger.ts"              },
    { source:"middleware.ts",          target:"rateLimiter.ts"         },
    { source:"routes.ts",              target:"middleware.ts"          },
    { source:"routes.ts",              target:"userController.ts"      },
    { source:"routes.ts",              target:"apiGateway.ts"          },
    { source:"emailService.ts",        target:"config.ts"              },
    { source:"emailService.ts",        target:"logger.ts"              },
    { source:"notificationService.ts", target:"config.ts"              },
    { source:"notificationService.ts", target:"emailService.ts"        },
    { source:"helpers.ts",             target:"logger.ts"              },
    { source:"validationUtils.ts",     target:"helpers.ts"             },
    { source:"sessionManager.ts",      target:"database.ts"            },
    { source:"sessionManager.ts",      target:"cacheService.ts"        },
    { source:"cacheService.ts",        target:"config.ts"              },
    { source:"apiGateway.ts",          target:"auth.ts"                },
    { source:"apiGateway.ts",          target:"rateLimiter.ts"         },
    { source:"errorHandler.ts",        target:"logger.ts"              },
    { source:"rateLimiter.ts",         target:"cacheService.ts"        },
  ],
  sampled: false,
  totalFiles: 18,
  demoMode: true,
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'RepoSense API is running',
    bobAvailable: isBobAvailable(),
    groqAvailable: isGroqAvailable(),
  });
});

// Main analysis endpoint with 4-level fallback
app.post('/api/analyze', async (req, res) => {
  try {
    const { repoUrl } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ error: 'Repository URL is required' });
    }

    console.log(`[API] Analyzing repository: ${repoUrl}`);

    // Parse the repository (Level 3 fallback)
    const parserData = await parseRepository(repoUrl);
    console.log(`[API] Parser complete: ${parserData.nodes.length} nodes`);

    // 4-LEVEL FALLBACK PIPELINE
    // Level 1: Try IBM Bob
    try {
      console.log('[API] Attempting IBM Bob analysis...');
      const bobData = await analyzeWithBob(repoUrl, parserData, repoUrl);
      console.log('[API] ✓ IBM Bob analysis successful');
      return res.json(bobData);
    } catch (bobError) {
      console.log('[API] ✗ IBM Bob failed:', bobError.message);
      
      // Level 2: Try Groq
      if (isGroqAvailable()) {
        try {
          console.log('[API] Attempting Groq fallback...');
          const groqData = await analyzeWithGroq(parserData, repoUrl);
          console.log('[API] ✓ Groq analysis successful');
          return res.json(groqData);
        } catch (groqError) {
          console.log('[API] ✗ Groq failed:', groqError.message);
        }
      }
      
      // Level 3: Return parser data only
      console.log('[API] Using parser data only');
      return res.json(parserData);
    }

  } catch (error) {
    console.error('[API] All analysis methods failed:', error);
    
    // Level 4: Return demo data (demo never dies)
    console.log('[API] ⚠ Returning demo data as final fallback');
    return res.json(DEMO_DATA);
  }
});

// Ask the Repo endpoint
app.post('/api/ask-repo', async (req, res) => {
  try {
    const { question, graphData } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    const response = await askRepo(question, graphData);
    res.json(response);

  } catch (error) {
    console.error('[API] Ask repo error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// Export Bob sessions for judge evidence
app.get('/api/export-sessions', async (req, res) => {
  try {
    const sessions = await exportBobSessions();
    res.json({ sessions, count: sessions.length });
  } catch (error) {
    console.error('[API] Export error:', error);
    res.status(500).json({ error: 'Failed to export sessions' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 RepoSense API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔍 Analysis endpoint: POST http://localhost:${PORT}/api/analyze\n`);
});

// Made with Bob
