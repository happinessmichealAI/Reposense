import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";

// ══════════════════════════════════════════════════════════════
// Graph.jsx — RepoSense D3 Force Graph  (FIXED v2)
// ══════════════════════════════════════════════════════════════
//
// FIXES APPLIED:
//   [1] Stale closure bug — focusMode now read via ref inside D3
//   [2] Blast radius count-up animation (0 → final)
//   [3] IBM Bob `reason` field rendered in panel
//   [4] "Powered by IBM Bob" badge bottom-right
//
// HOW TO USE ON HACKATHON DAY:
//   1. npm install d3
//   2. Drop this file into src/Graph.jsx
//   3. Pass real repo data from IBM Bob as `nodes`, `links`, `repoName` props
//   4. If no props passed, demo data renders immediately
//
// PROPS:
//   nodes    → [{ id, group: "service"|"auth"|"utils", risk: "high"|"medium"|"low", blastRadius?, reason? }]
//   links    → [{ source, target }]
//   repoName → string e.g. "facebook/react"
//
// ══════════════════════════════════════════════════════════════

// ── DEMO DATA ────────────────────────────────────────────────
const DEMO_NODES = [
  { id:"paymentProcessor.ts",   group:"service", risk:"high",   blastRadius:14, reason:"Used by authentication and payment services — critical path for all transactions" },
  { id:"auth.ts",               group:"auth",    risk:"high",   blastRadius:11, reason:"Core auth module imported by every protected route and service" },
  { id:"userController.ts",     group:"service", risk:"medium"  },
  { id:"database.ts",           group:"service", risk:"high",   blastRadius:9,  reason:"Shared DB layer — failure cascades into all services" },
  { id:"emailService.ts",       group:"service", risk:"medium"  },
  { id:"logger.ts",             group:"utils",   risk:"low"     },
  { id:"config.ts",             group:"utils",   risk:"medium"  },
  { id:"middleware.ts",         group:"auth",    risk:"medium"  },
  { id:"orderService.ts",       group:"service", risk:"high"    },
  { id:"notificationService.ts",group:"service", risk:"medium"  },
  { id:"helpers.ts",            group:"utils",   risk:"low"     },
  { id:"routes.ts",             group:"service", risk:"medium"  },
  { id:"validationUtils.ts",    group:"utils",   risk:"low"     },
  { id:"sessionManager.ts",     group:"auth",    risk:"high"    },
  { id:"cacheService.ts",       group:"service", risk:"medium"  },
  { id:"rateLimiter.ts",        group:"auth",    risk:"medium"  },
  { id:"errorHandler.ts",       group:"utils",   risk:"low"     },
  { id:"apiGateway.ts",         group:"service", risk:"high"    },
];

const DEMO_LINKS = [
  { source:"paymentProcessor.ts", target:"database.ts"             },
  { source:"paymentProcessor.ts", target:"auth.ts"                 },
  { source:"paymentProcessor.ts", target:"logger.ts"               },
  { source:"paymentProcessor.ts", target:"orderService.ts"         },
  { source:"auth.ts",             target:"database.ts"             },
  { source:"auth.ts",             target:"sessionManager.ts"       },
  { source:"auth.ts",             target:"config.ts"               },
  { source:"userController.ts",   target:"auth.ts"                 },
  { source:"userController.ts",   target:"emailService.ts"         },
  { source:"userController.ts",   target:"database.ts"             },
  { source:"orderService.ts",     target:"database.ts"             },
  { source:"orderService.ts",     target:"notificationService.ts"  },
  { source:"orderService.ts",     target:"cacheService.ts"         },
  { source:"middleware.ts",       target:"auth.ts"                 },
  { source:"middleware.ts",       target:"logger.ts"               },
  { source:"middleware.ts",       target:"rateLimiter.ts"          },
  { source:"routes.ts",           target:"middleware.ts"           },
  { source:"routes.ts",           target:"userController.ts"       },
  { source:"routes.ts",           target:"apiGateway.ts"           },
  { source:"emailService.ts",     target:"config.ts"               },
  { source:"emailService.ts",     target:"logger.ts"               },
  { source:"notificationService.ts",target:"config.ts"             },
  { source:"notificationService.ts",target:"emailService.ts"       },
  { source:"helpers.ts",          target:"logger.ts"               },
  { source:"validationUtils.ts",  target:"helpers.ts"              },
  { source:"sessionManager.ts",   target:"database.ts"             },
  { source:"sessionManager.ts",   target:"cacheService.ts"         },
  { source:"cacheService.ts",     target:"config.ts"               },
  { source:"apiGateway.ts",       target:"auth.ts"                 },
  { source:"apiGateway.ts",       target:"rateLimiter.ts"          },
  { source:"errorHandler.ts",     target:"logger.ts"               },
  { source:"rateLimiter.ts",      target:"cacheService.ts"         },
];

// ── COLOURS ──────────────────────────────────────────────────
const COLOR = {
  service : "#00c8ff",
  auth    : "#a78bfa",
  utils   : "#34d399",
};
const WAVE_COLORS = ["#ff3c50", "#ff8c00", "#ffc800"];

// ── BFS — returns waves of affected node IDs ─────────────────
function bfsWaves(startId, adj, maxDepth = 3) {
  const visited  = new Set([startId]);
  const waves    = [];
  let   frontier = [startId];
  for (let d = 0; d < maxDepth; d++) {
    const next = [];
    frontier.forEach(id => {
      (adj[id] || new Set()).forEach(nb => {
        if (!visited.has(nb)) { visited.add(nb); next.push(nb); }
      });
    });
    if (!next.length) break;
    waves.push([...next]);
    frontier = next;
  }
  return waves;
}

// ── BUILD ADJACENCY MAP ───────────────────────────────────────
function buildAdj(nodes, links) {
  const adj = {};
  nodes.forEach(n => { adj[n.id] = new Set(); });
  links.forEach(l => {
    const s = l.source.id || l.source;
    const t = l.target.id || l.target;
    if (adj[s]) adj[s].add(t);
    if (adj[t]) adj[t].add(s);
  });
  return adj;
}

// ── COUNT-UP HOOK [FIX #2] ───────────────────────────────────
function useCountUp(target, duration = 900) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (target == null) { setDisplay(0); return; }
    let frame;
    const start    = performance.now();
    const animate  = (now) => {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return display;
}

// ═════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════
export default function Graph({
  nodes    = DEMO_NODES,
  links    = DEMO_LINKS,
  repoName = "demo/repository",
  riskFilter = "all",
  onNodeClick,
}) {
  const svgRef      = useRef(null);
  const simRef      = useRef(null);
  const timersRef   = useRef([]);

  // FIX #1 — focusMode as ref so D3 closures always read current value
  const [focusMode,  setFocusMode] = useState(false);
  const focusModeRef = useRef(focusMode);
  useEffect(() => { focusModeRef.current = focusMode; }, [focusMode]);

  const [panel,    setPanel]    = useState(null);
  const [activeId, setActiveId] = useState(null);
  const [tlStage,  setTlStage]  = useState(0);

  // FIX #2 — count-up for blast radius number
  const displayCount = useCountUp(panel?.totalCount ?? null, 900);

  // Expose reset so Focus Mode toggle can re-apply dimming immediately
  const resetGraphRef = useRef(null);

  // ── D3 EFFECT ──────────────────────────────────────────────
  // Using useLayoutEffect to ensure DOM is painted before D3 reads dimensions
  useLayoutEffect(() => {
    const container = svgRef.current;
    if (!container) return;

    // Use getBoundingClientRect for accurate dimensions after layout
    const rect = container.getBoundingClientRect();
    const W = rect.width  || window.innerWidth  || 1200;
    const H = rect.height || window.innerHeight || 800;

      console.log('[Graph] Rendering with', nodes.length, 'nodes and', links.length, 'links');
      console.log('[Graph] Canvas size:', W, 'x', H);

      const nodeData = nodes.map(n => ({ ...n }));
      const linkData = links.map(l => ({ ...l }));

      const svg = d3.select(container);
      svg.selectAll("*").remove();
      
      // FIX #3: Force SVG to fill container via CSS
      svg.style("width", "100%").style("height", "100%");

    // Add SVG filters for node glow effects
    const defs = svg.append("defs");
    defs.html(`
      <filter id="glow-high" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="3" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <filter id="glow-medium" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2" result="blur"/>
        <feMerge>
          <feMergeNode in="blur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `);

    const g = svg.append("g");
    svg.call(
      d3.zoom().scaleExtent([0.2, 4])
        .on("zoom", e => g.attr("transform", e.transform))
    );

    // Stronger forces to spread nodes across full canvas
    const simulation = d3.forceSimulation(nodeData)
      .force("link",      d3.forceLink(linkData).id(d => d.id).distance(120).strength(0.4))
      .force("charge",    d3.forceManyBody().strength(-600))
      .force("center",    d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(40))
      .force("x",         d3.forceX(W / 2).strength(0.05))
      .force("y",         d3.forceY(H / 2).strength(0.05));

    simRef.current = simulation;

    // Curved path function for links
    function linkArc(d) {
      const dx = d.target.x - d.source.x;
      const dy = d.target.y - d.source.y;
      const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
      return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
    }

    const linkSel = g.append("g")
      .selectAll("path")
      .data(linkData)
      .join("path")
        .attr("fill",         "none")
        .attr("stroke",       "rgba(255,255,255,0.07)")
        .attr("stroke-width", 1.5);

    const nodeSel = g.append("g")
      .selectAll("g")
      .data(nodeData)
      .join("g")
        .call(
          d3.drag()
            .on("start", (e, d) => {
              if (!e.active) simulation.alphaTarget(0.3).restart();
              d.fx = d.x; d.fy = d.y;
            })
            .on("drag",  (e, d) => { d.fx = e.x; d.fy = e.y; })
            .on("end",   (e, d) => {
              if (!e.active) simulation.alphaTarget(0);
              d.fx = null; d.fy = null;
            })
        );

    // Outer glow ring
    nodeSel.append("circle")
      .attr("class", "ring")
      .attr("r", 18)
      .attr("fill",         "none")
      .attr("stroke",       d => COLOR[d.group] || "#00c8ff")
      .attr("stroke-width", 0.5)
      .attr("opacity",      0.25);

    // Main circle with CSS drop-shadow glow
    nodeSel.append("circle")
      .attr("class",        "main-circle")
      .attr("r",            13)
      .attr("fill",         d => (COLOR[d.group] || "#00c8ff") + "1a")
      .attr("stroke",       d => COLOR[d.group] || "#00c8ff")
      .attr("stroke-width", 1.5)
      .style("filter",      d =>
        d.risk === "high"   ? "drop-shadow(0 0 6px #FF4D67) drop-shadow(0 0 12px #FF4D67)" :
        d.risk === "medium" ? "drop-shadow(0 0 4px #FFB020)" :
        null
      )
      .style("cursor",      "pointer");

    // Label
    nodeSel.append("text")
      .text(d => d.id.replace(/\.(ts|js|jsx|tsx|py)$/, ""))
      .attr("dy",           30)
      .attr("text-anchor",  "middle")
      .attr("font-size",    9)
      .attr("fill",         "rgba(255,255,255,0.38)")
      .attr("font-family",  "monospace")
      .style("pointer-events", "none");

    // ── Reset helper ──
    function resetGraph() {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      linkSel
        .attr("stroke",           "rgba(255,255,255,0.07)")
        .attr("stroke-width",     1.5)
        .attr("opacity",          1)
        .attr("stroke-dasharray", null);

      nodeSel.selectAll(".main-circle")
        .attr("stroke",       d => COLOR[d.group] || "#00c8ff")
        .attr("fill",         d => (COLOR[d.group] || "#00c8ff") + "1a")
        .attr("stroke-width", 1.5)
        .attr("r",            13);

      nodeSel.selectAll(".ring")
        .attr("stroke",  d => COLOR[d.group] || "#00c8ff")
        .attr("opacity", 0.25)
        .attr("r",       18);

      nodeSel.attr("opacity", 1);

      setPanel(null);
      setActiveId(null);
      setTlStage(0);
    }

    // Store reset ref so Focus Mode toggle can call it
    resetGraphRef.current = resetGraph;

    // Apply risk filter dimming
    function applyRiskFilter() {
      if (riskFilter === 'all') {
        nodeSel.attr("opacity", 1);
        linkSel.attr("opacity", 1);
      } else {
        nodeSel.attr("opacity", d => d.risk === riskFilter ? 1 : 0.04);
        linkSel.attr("opacity", l => {
          const s = l.source.id || l.source;
          const t = l.target.id || l.target;
          const sNode = nodeData.find(n => n.id === s);
          const tNode = nodeData.find(n => n.id === t);
          return (sNode?.risk === riskFilter || tNode?.risk === riskFilter) ? 1 : 0.02;
        });
      }
    }

    applyRiskFilter();

    // ── Impact trace helper ──
    function traceImpact(d) {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];

      const adj         = buildAdj(nodeData, linkData);
      const waves       = bfsWaves(d.id, adj, 3);
      const allAffected = new Set(waves.flat());
      const nodeMap     = Object.fromEntries(nodeData.map(n => [n.id, n]));

      // Source node — highlight immediately
      nodeSel.filter(n => n.id === d.id)
        .select(".main-circle")
          .attr("stroke",       "#ffffff")
          .attr("fill",         "#ffffff1a")
          .attr("stroke-width", 2.5)
          .attr("r",            15);

      // FIX #1 — read focus mode from ref (never stale)
      const applyFocus = () => {
        nodeSel.attr("opacity", n =>
          !focusModeRef.current ? 1 :
          n.id === d.id || allAffected.has(n.id) ? 1 : 0.07
        );
        linkSel.attr("opacity", l => {
          if (!focusModeRef.current) return 1;
          const s = l.source.id, t = l.target.id;
          return s === d.id || t === d.id ||
                 allAffected.has(s) || allAffected.has(t) ? 1 : 0.04;
        });
      };

      applyFocus();

      const DELAYS = [0, 420, 800];

      waves.forEach((wave, wi) => {
        const t = setTimeout(() => {
          const wc = WAVE_COLORS[wi];

          nodeSel.filter(n => wave.includes(n.id))
            .select(".main-circle")
              .attr("stroke",       wc)
              .attr("fill",         wc + "1a")
              .attr("stroke-width", 2)
              .attr("r",            14);

          nodeSel.filter(n => wave.includes(n.id))
            .select(".ring")
              .attr("stroke",  wc)
              .attr("opacity", 0.7)
              .attr("r",       14)
            .transition().duration(600).ease(d3.easeExpOut)
              .attr("r",       30)
              .attr("opacity", 0);

          linkSel.each(function(l) {
            const s = l.source.id, t = l.target.id;
            const prevWave  = wi > 0 ? waves[wi - 1] : [];
            const isWaveLink =
              (s === d.id && wave.includes(t)) ||
              (t === d.id && wave.includes(s)) ||
              (prevWave.includes(s) && wave.includes(t)) ||
              (prevWave.includes(t) && wave.includes(s));

            if (isWaveLink) {
              d3.select(this)
                .attr("stroke",           wc)
                .attr("stroke-width",     2.2)
                .attr("opacity",          0.85)
                .attr("stroke-dasharray", "5,4")
                .transition().duration(300)
                  .attr("stroke-dasharray", "0,0");
            }
          });

          setTlStage(wi + 1);

        }, DELAYS[wi]);

        timersRef.current.push(t);
      });

      // Update panel after all waves
      const panelTimer = setTimeout(() => {
        const allAff = waves.flat();
        const counts = [0, 0, 0];
        allAff.forEach(id => {
          const n = nodeMap[id];
          if (n) counts[n.risk === "high" ? 0 : n.risk === "medium" ? 1 : 2]++;
        });

        // FIX #3 — include Bob's reason field from source node
        const sourceNode = nodeMap[d.id];

        setPanel({
          sourceId   : d.id,
          totalCount : allAff.length,
          counts,
          reason     : sourceNode?.reason || null,
          waves      : waves.map((wave, wi) => ({
            label : ["Immediate Impact", "Secondary Cascade", "Deep Propagation"][wi],
            files : wave.map(id => ({ id, risk: nodeMap[id]?.risk || "low" })),
          })),
        });

        // Call parent callback if provided
        if (onNodeClick) {
          onNodeClick({
            sourceId: d.id,
            totalCount: allAff.length,
            counts,
            reason: sourceNode?.reason || null,
          });
        }
      }, DELAYS[Math.min(waves.length - 1, 2)] + 100);

      timersRef.current.push(panelTimer);
    }

    // ── Click handlers ──
    nodeSel.on("click", function(event, d) {
      event.stopPropagation();
      if (activeId === d.id) {
        resetGraph();
      } else {
        resetGraph();
        setActiveId(d.id);
        // Use rAF instead of setTimeout(20) — safer across slow machines
        requestAnimationFrame(() => traceImpact(d));
      }
    });

    svg.on("click", () => resetGraph());

    // ── Tick ── (use linkArc for curved paths)
    simulation.on("tick", () => {
      linkSel.attr("d", linkArc);
      nodeSel.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
      timersRef.current.forEach(clearTimeout);
      svg.selectAll("*").remove();
    };
  }, [nodes, links, onNodeClick]);

  // Re-apply risk filter when it changes
  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    
    if (riskFilter === 'all') {
      svg.selectAll("g g").attr("opacity", 1);
      svg.selectAll("path").attr("opacity", 1);
    } else {
      svg.selectAll("g g").attr("opacity", function(d) {
        return d && d.risk === riskFilter ? 1 : 0.04;
      });
      svg.selectAll("path").attr("opacity", function(l) {
        if (!l || !l.source || !l.target) return 1;
        const sId = l.source.id || l.source;
        const tId = l.target.id || l.target;
        const sNode = nodes.find(n => n.id === sId);
        const tNode = nodes.find(n => n.id === tId);
        return (sNode?.risk === riskFilter || tNode?.risk === riskFilter) ? 1 : 0.02;
      });
    }
  }, [riskFilter, nodes]);

  // FIX #1 — when focusMode toggles while a node is active,
  // re-trigger the dimming pass without re-running full D3 effect
  useEffect(() => {
    if (!activeId || !svgRef.current) return;
    const svg      = d3.select(svgRef.current);
    const nodeData = nodes.map(n => ({ ...n }));
    const linkData = links.map(l => ({ ...l }));
    const adj         = buildAdj(nodeData, linkData);
    const waves       = bfsWaves(activeId, adj, 3);
    const allAffected = new Set(waves.flat());

    svg.selectAll("g g") // nodeSel equivalent
      .attr("opacity", function(d) {
        if (!d) return 1;
        return !focusMode ? 1 :
          d.id === activeId || allAffected.has(d.id) ? 1 : 0.07;
      });

    svg.selectAll("path") // linkSel equivalent (links are <path> not <line>)
      .attr("opacity", function(l) {
        if (!l || !l.source || !l.target) return 1;
        if (!focusMode) return 1;
        const s = l.source.id, t = l.target.id;
        return s === activeId || t === activeId ||
               allAffected.has(s) || allAffected.has(t) ? 1 : 0.04;
      });
  }, [focusMode, activeId, nodes, links]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <svg ref={svgRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Export panel data for parent component */}
      {panel && (
        <div style={{ display: 'none' }} data-panel={JSON.stringify({ ...panel, displayCount })} />
      )}
    </div>
  );
}

// Made with Bob
