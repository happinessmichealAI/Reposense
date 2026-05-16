import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Landing() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('all');

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Navigate to loading with the search query
      navigate('/loading', { state: { repoUrl: searchQuery.trim() } });
    }
  };

  return (
    <div style={styles.container}>
      <Sidebar />
      
      <div style={styles.mainArea}>
        {/* Top Action Bar */}
        <div style={styles.topBar}>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              placeholder="Enter GitHub repository URL or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
            <div style={styles.searchSubtext}>
              Try: facebook/react, vercel/next.js, or novuhq/novu
            </div>
          </form>

          <div style={styles.activeRepo}>
            <span style={styles.repoIcon}>📦</span>
            Ready to analyze
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

        {/* Hero Canvas */}
        <div style={styles.heroCanvas} className="graph-canvas">
          <div style={styles.heroContent}>
            <div style={styles.heroIcon}>🔍</div>
            <h1 style={styles.heroTitle}>
              Understand Your Repository's
              <br />
              <span style={styles.heroTitleAccent}>Dependency Intelligence</span>
            </h1>
            <p style={styles.heroDescription}>
              Analyze any JavaScript or TypeScript repository to visualize dependencies,
              <br />
              calculate blast radius, and make safer code changes with AI-powered insights.
            </p>
            <div style={styles.heroFeatures}>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>⚡</span>
                <span>Instant Analysis</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🎯</span>
                <span>Blast Radius Calculation</span>
              </div>
              <div style={styles.featureItem}>
                <span style={styles.featureIcon}>🤖</span>
                <span>IBM Bob Intelligence</span>
              </div>
            </div>
            <button
              style={styles.ctaButton}
              onClick={() => navigate('/loading', { state: { repoUrl: 'novuhq/novu' } })}
            >
              Try Demo Repository
              <span style={styles.ctaArrow}>→</span>
            </button>
          </div>
        </div>

        {/* Bottom Hint */}
        <div style={styles.bottomHint}>
          <span style={styles.hintDot}></span>
          Select a repository from the sidebar or enter a GitHub URL above to begin
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
  },
  mainArea: {
    flex: 1,
    marginLeft: '260px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
  },
  topBar: {
    padding: '20px 32px',
    background: 'rgba(7, 11, 22, 0.92)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    zIndex: 10,
  },
  searchForm: {
    flex: 1,
    maxWidth: '600px',
    position: 'relative',
  },
  searchInput: {
    width: '100%',
    padding: '12px 16px',
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
    marginTop: '6px',
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
  heroCanvas: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  heroContent: {
    textAlign: 'center',
    maxWidth: '700px',
    padding: '40px',
    animation: 'fadeIn 0.6s ease-out',
  },
  heroIcon: {
    fontSize: '64px',
    marginBottom: '24px',
    opacity: 0.9,
  },
  heroTitle: {
    fontSize: '42px',
    fontWeight: 700,
    lineHeight: 1.2,
    marginBottom: '20px',
    color: 'var(--text-primary)',
  },
  heroTitleAccent: {
    background: 'linear-gradient(135deg, var(--cyan-primary), var(--green-success))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  heroDescription: {
    fontSize: '15px',
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginBottom: '32px',
  },
  heroFeatures: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '40px',
  },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  featureIcon: {
    fontSize: '18px',
  },
  ctaButton: {
    padding: '14px 32px',
    background: 'var(--cyan-primary)',
    color: 'var(--bg-primary)',
    fontSize: '14px',
    fontWeight: 600,
    borderRadius: '8px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    boxShadow: '0 0 30px rgba(0, 200, 255, 0.4)',
    cursor: 'pointer',
  },
  ctaArrow: {
    fontSize: '16px',
    transition: 'transform 0.2s',
  },
  bottomHint: {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  hintDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    animation: 'pulse 2s infinite',
  },
};

// Made with Bob
