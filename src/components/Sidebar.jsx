import { useNavigate } from 'react-router-dom';

const RECENT_REPOS = [
  { name: 'calcom/cal.com', status: 'analyzed' },
  { name: 'hoppscotch/hoppscotch', status: 'analyzed' },
  { name: 'novuhq/novu', status: 'analyzed' },
];

export default function Sidebar() {
  const navigate = useNavigate();

  const handleAnalyzeClick = () => {
    // For now, navigate to loading with a demo repo
    navigate('/loading', { state: { repoUrl: 'novuhq/novu' } });
  };

  const handleRepoClick = (repoName) => {
    navigate('/loading', { state: { repoUrl: repoName } });
  };

  return (
    <div style={styles.sidebar}>
      {/* Logo */}
      <div style={styles.logoSection}>
        <div style={styles.logo}>
          Repo<span style={styles.logoLight}>Sense</span>
        </div>
        <div style={styles.tagline}>AI Repository Intelligence</div>
      </div>

      {/* Primary Action Button */}
      <button style={styles.primaryButton} onClick={handleAnalyzeClick}>
        <span style={styles.plusIcon}>+</span>
        Analyze Repository
      </button>

      {/* Recent Sessions */}
      <div style={styles.recentSection}>
        <div style={styles.recentTitle}>Recent Sessions</div>
        <div style={styles.recentList}>
          {RECENT_REPOS.map((repo) => (
            <button
              key={repo.name}
              style={styles.repoItem}
              onClick={() => handleRepoClick(repo.name)}
            >
              <div style={styles.repoName}>{repo.name}</div>
              <div style={styles.statusIndicator}>
                <span style={styles.statusDot}></span>
                {repo.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
        <span style={styles.footerDot}></span>
        Powered by IBM Bob
      </div>
    </div>
  );
}

const styles = {
  sidebar: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    width: '260px',
    minWidth: '260px',
    background: 'var(--bg-secondary)',
    borderRight: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    zIndex: 100,
  },
  logoSection: {
    marginBottom: '24px',
  },
  logo: {
    fontSize: '20px',
    fontWeight: 700,
    letterSpacing: '2px',
    color: 'var(--cyan-primary)',
    textTransform: 'uppercase',
    marginBottom: '4px',
  },
  logoLight: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 400,
  },
  tagline: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  primaryButton: {
    width: '100%',
    padding: '12px 16px',
    background: 'var(--cyan-primary)',
    color: 'var(--bg-primary)',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    marginBottom: '32px',
    boxShadow: '0 0 20px rgba(0, 200, 255, 0.3)',
  },
  plusIcon: {
    fontSize: '18px',
    fontWeight: 300,
  },
  recentSection: {
    flex: 1,
    overflow: 'auto',
  },
  recentTitle: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '12px',
  },
  recentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  repoItem: {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '6px',
    textAlign: 'left',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  repoName: {
    fontSize: '12px',
    color: 'var(--text-primary)',
    marginBottom: '4px',
    fontWeight: 500,
  },
  statusIndicator: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--green-success)',
    boxShadow: '0 0 6px var(--green-success)',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: '10px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  footerDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    boxShadow: '0 0 6px var(--cyan-primary)',
    animation: 'pulse 2s infinite',
  },
};

// Made with Bob
