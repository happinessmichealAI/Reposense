import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Graph from '../components/Graph';
import ImpactPanel from '../components/ImpactPanel';

export default function GraphPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [graphData, setGraphData] = useState(null);
  const [repoName, setRepoName] = useState('');
  const [panelData, setPanelData] = useState(null);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDemoMode, setIsDemoMode] = useState(false);

  useEffect(() => {
    // Check if demo mode from Loading page
    if (location.state?.demo) {
      // Use demo data from Graph component
      setGraphData({ nodes: [], links: [], demoMode: true });
      setRepoName('demo/repository');
      setIsDemoMode(true);
      return;
    }

    // Get data from navigation state
    const data = location.state?.graphData;
    const name = location.state?.repoName || 'Unknown Repository';
    
    if (data) {
      setGraphData(data);
      setRepoName(name);
      setIsDemoMode(data.demoMode || false);
    } else {
      // No data provided, redirect to landing
      navigate('/');
    }
  }, [location.state, navigate]);

  const handleNodeClick = (nodeData) => {
    setPanelData(nodeData);
    setIsPanelExpanded(true);
  };

  const handlePanelToggle = () => {
    setIsPanelExpanded(!isPanelExpanded);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && graphData) {
      // Find node matching search query
      const matchingNode = graphData.nodes.find(
        (n) => n.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (matchingNode) {
        // Trigger impact trace on this node
        // This will be handled by the Graph component
        console.log('Search for node:', matchingNode.id);
      }
    }
  };

  // Don't filter nodes - pass risk filter to Graph component instead
  // Filtering nodes breaks links that reference filtered-out nodes

  if (!graphData) {
    return (
      <div style={styles.loading}>
        <div>Loading graph data...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Top Action Bar */}
      <div style={styles.topBar}>
        <button style={styles.backButton} onClick={() => navigate('/')}>
          ← Back
        </button>

        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <input
            type="text"
            placeholder="What file are you changing?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          <div style={styles.searchSubtext}>Try: paymentProcessor.ts</div>
        </form>

        <div style={styles.activeRepo}>
          <span style={styles.repoIcon}>📦</span>
          {repoName}
        </div>

        <select
          value={riskFilter}
          onChange={(e) => setRiskFilter(e.target.value)}
          style={styles.riskFilter}
        >
          <option value="all">All Risks</option>
          <option value="high">High Risk</option>
          <option value="medium">Medium Risk</option>
          <option value="low">Low Risk</option>
        </select>
      </div>

      {/* Demo Mode Badge */}
      {isDemoMode && (
        <div style={styles.demoBadge}>
          <span style={styles.demoDot}></span>
          Demo Mode — Using fallback data
        </div>
      )}

      {/* Sampled Banner */}
      {graphData.sampled && (
        <div style={styles.sampledBanner}>
          Showing top 150 most connected files from {graphData.totalFiles} total
        </div>
      )}

      {/* Graph Canvas */}
      <div style={styles.graphCanvas} className="graph-canvas">
        <Graph
          nodes={graphData.nodes}
          links={graphData.links}
          repoName={repoName}
          riskFilter={riskFilter}
          onNodeClick={handleNodeClick}
        />
      </div>

      {/* Impact Panel */}
      <ImpactPanel
        panelData={panelData}
        isExpanded={isPanelExpanded}
        onToggle={handlePanelToggle}
      />

      {/* Bottom Hint */}
      <div style={styles.bottomHint}>
        CLICK · DRAG · SCROLL TO ZOOM
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    position: 'relative',
  },
  loading: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: 'var(--text-secondary)',
  },
  topBar: {
    padding: '16px 24px',
    background: 'rgba(7, 11, 22, 0.92)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    zIndex: 100,
  },
  backButton: {
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },
  searchForm: {
    flex: 1,
    maxWidth: '500px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: 'var(--text-primary)',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  searchSubtext: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    marginTop: '4px',
    paddingLeft: '4px',
  },
  activeRepo: {
    padding: '8px 14px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap',
  },
  repoIcon: {
    fontSize: '14px',
  },
  riskFilter: {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    color: 'var(--text-secondary)',
    fontSize: '11px',
    cursor: 'pointer',
    outline: 'none',
  },
  demoBadge: {
    position: 'absolute',
    top: '80px',
    right: '24px',
    padding: '8px 16px',
    background: 'rgba(255, 176, 32, 0.08)',
    border: '1px solid rgba(255, 176, 32, 0.15)',
    borderRadius: '6px',
    color: 'var(--amber-warning)',
    fontSize: '11px',
    letterSpacing: '1px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    zIndex: 90,
  },
  demoDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--amber-warning)',
    animation: 'pulse 2s infinite',
  },
  sampledBanner: {
    position: 'absolute',
    top: '72px',
    left: 0,
    right: 0,
    background: 'rgba(255, 176, 32, 0.08)',
    borderBottom: '1px solid rgba(255, 176, 32, 0.15)',
    color: 'var(--amber-warning)',
    fontSize: '11px',
    letterSpacing: '1px',
    padding: '6px 16px',
    textAlign: 'center',
    zIndex: 90,
  },
  graphCanvas: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
    height: 'calc(100vh - 60px)',
    minHeight: '500px',
  },
  bottomHint: {
    position: 'absolute',
    bottom: '48px',
    left: '24px',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.2)',
    letterSpacing: '1px',
    zIndex: 40,
    pointerEvents: 'none',
  },
};

// Made with Bob
