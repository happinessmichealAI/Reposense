import { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const STATUS_MESSAGES = [
  'Cloning repository...',
  'Scanning dependencies...',
  'IBM Bob is analyzing...',
  'Building intelligence graph...',
];

export default function Loading() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentMessage, setCurrentMessage] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    const repoUrl = location.state?.repoUrl || 'novuhq/novu';

    // Start cycling status messages
    intervalRef.current = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % STATUS_MESSAGES.length);
      setProgress((prev) => Math.min(prev + 25, 90));
    }, 2000);

    // Call the API
    analyzeRepository(repoUrl);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [location.state]);

  const analyzeRepository = async (repoUrl) => {
    try {
      // Create a timeout promise that rejects after 30 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - please check your internet connection')), 30000);
      });

      // Race the fetch against the timeout
      const fetchPromise = fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoUrl }),
      });

      const response = await Promise.race([fetchPromise, timeoutPromise]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const graphData = await response.json();

      // Stop cycling messages
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Show complete state
      setProgress(100);
      setIsComplete(true);
      setCurrentMessage(STATUS_MESSAGES.length); // Show "Complete ✓"

      // Wait 600ms then navigate to graph
      setTimeout(() => {
        navigate('/graph', { state: { graphData, repoName: repoUrl } });
      }, 600);
    } catch (err) {
      console.error('Analysis error:', err);
      
      // Stop cycling messages
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      // Set user-friendly error message
      let errorMessage = err.message;
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Network error - please check your internet connection and try again';
      }

      setError(errorMessage);
      setProgress(0);
    }
  };

  const handleTryAgain = () => {
    navigate('/');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        {/* Logo */}
        <div style={styles.logo}>
          Repo<span style={styles.logoLight}>Sense</span>
        </div>

        {/* Status Display */}
        {!error ? (
          <>
            <div style={styles.statusContainer}>
              <div style={styles.statusDot}></div>
              <div style={styles.statusText}>
                {isComplete ? 'Complete ✓' : STATUS_MESSAGES[currentMessage]}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={styles.progressBarContainer}>
              <div
                style={{
                  ...styles.progressBar,
                  width: `${progress}%`,
                  background: isComplete
                    ? 'var(--green-success)'
                    : 'var(--cyan-primary)',
                }}
              ></div>
            </div>

            <div style={styles.progressText}>{progress}%</div>
          </>
        ) : (
          <>
            {/* Error State */}
            <div style={styles.errorContainer}>
              <div style={styles.errorIcon}>⚠️</div>
              <div style={styles.errorTitle}>Analysis Failed</div>
              <div style={styles.errorMessage}>{error}</div>
              <button style={styles.tryAgainButton} onClick={handleTryAgain}>
                Try Again
              </button>
            </div>
          </>
        )}

        {/* Repository Info */}
        {!error && (
          <div style={styles.repoInfo}>
            Analyzing: <span style={styles.repoName}>{location.state?.repoUrl || 'novuhq/novu'}</span>
          </div>
        )}
      </div>

      {/* Background Animation */}
      <div style={styles.backgroundGrid} className="graph-canvas"></div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  backgroundGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
    zIndex: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    textAlign: 'center',
    maxWidth: '500px',
    padding: '40px',
  },
  logo: {
    fontSize: '32px',
    fontWeight: 700,
    letterSpacing: '3px',
    color: 'var(--cyan-primary)',
    textTransform: 'uppercase',
    marginBottom: '48px',
  },
  logoLight: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontWeight: 400,
  },
  statusContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    boxShadow: '0 0 12px var(--cyan-primary)',
    animation: 'pulse 1.5s infinite',
  },
  statusText: {
    fontSize: '16px',
    color: 'var(--text-primary)',
    fontWeight: 500,
  },
  progressBarContainer: {
    width: '100%',
    height: '6px',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '12px',
  },
  progressBar: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.5s ease-out, background 0.3s',
    boxShadow: '0 0 20px currentColor',
  },
  progressText: {
    fontSize: '14px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontVariantNumeric: 'tabular-nums',
  },
  repoInfo: {
    marginTop: '32px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  repoName: {
    color: 'var(--cyan-primary)',
    fontWeight: 600,
  },
  errorContainer: {
    padding: '32px',
    background: 'rgba(255, 77, 103, 0.05)',
    border: '1px solid rgba(255, 77, 103, 0.2)',
    borderRadius: '12px',
  },
  errorIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  errorTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: 'var(--red-critical)',
    marginBottom: '12px',
  },
  errorMessage: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    marginBottom: '24px',
    lineHeight: 1.6,
  },
  tryAgainButton: {
    padding: '10px 24px',
    background: 'var(--cyan-primary)',
    color: 'var(--bg-primary)',
    fontSize: '13px',
    fontWeight: 600,
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

// Made with Bob
