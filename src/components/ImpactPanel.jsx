import { useState } from 'react';

const WAVE_COLORS = ["#ff3c50", "#ff8c00", "#ffc800"];

export default function ImpactPanel({ panelData, isExpanded, onToggle }) {
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState(null);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  const handleAskQuestion = async (question) => {
    setChatInput('');
    setIsLoadingChat(true);
    setChatResponse(null);

    try {
      const response = await fetch('/api/ask-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question,
          graphData: panelData,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get answer');
      }

      const data = await response.json();
      setChatResponse(data);
      setIsLoadingChat(false);
    } catch (error) {
      console.error('Chat error:', error);
      setChatResponse({
        question,
        answer: 'Sorry, I encountered an error processing your question. Please try again.',
      });
      setIsLoadingChat(false);
    }
  };

  const exampleQuestions = [
    "What is the riskiest file to modify?",
    "Which files have the highest blast radius?",
    "What would break if I deleted auth.ts?",
  ];

  if (!panelData && !isExpanded) {
    // Collapsed state with peek handle
    return (
      <div style={styles.panelCollapsed} onClick={onToggle}>
        <div style={styles.peekHandle}>
          <div style={styles.dragIndicator}></div>
          <div style={styles.peekText}>Select a node to analyze</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.panel,
        height: isExpanded ? (window.innerWidth < 768 ? '65vh' : '52vh') : '32px',
      }}
    >
      {/* Peek Handle (always visible) */}
      <div style={styles.peekHandle} onClick={onToggle}>
        <div style={styles.dragIndicator}></div>
        {!isExpanded && <div style={styles.peekText}>Select a node to analyze</div>}
      </div>

      {/* Panel Content */}
      {isExpanded && panelData && (
        <div style={styles.panelContent}>
          <div style={styles.panelTitle}>
            <span style={styles.panelDot}></span>
            Impact Analysis
          </div>

          {/* Blast Radius Number */}
          <div style={styles.blastNumber}>{panelData.displayCount || panelData.totalCount}</div>
          <div style={styles.blastSub}>Modules Affected</div>

          {/* Source File */}
          <div style={styles.sourceFile}>
            Source: <span style={styles.sourceFileName}>{panelData.sourceId}</span>
          </div>

          {/* IBM Bob Reason */}
          {panelData.reason && (
            <div style={styles.bobReason}>
              <span style={styles.bobReasonLabel}>IBM Bob Analysis</span>
              {panelData.reason}
            </div>
          )}

          {/* Risk Breakdown */}
          <div style={styles.riskRow}>
            <span style={{ ...styles.pill, borderColor: '#ff3c50', color: '#ff3c50' }}>
              {panelData.counts[0]} High
            </span>
            <span style={{ ...styles.pill, borderColor: '#ffaa00', color: '#ffaa00' }}>
              {panelData.counts[1]} Med
            </span>
            <span style={{ ...styles.pill, borderColor: '#00cc66', color: '#00cc66' }}>
              {panelData.counts[2]} Low
            </span>
          </div>

          {/* Wave Breakdown */}
          {panelData.waves && panelData.waves.map((wave, wi) => (
            <div key={wi} style={{ marginTop: 12 }}>
              <div
                style={{
                  ...styles.waveLabel,
                  color: WAVE_COLORS[wi],
                  background: WAVE_COLORS[wi] + '18',
                }}
              >
                {wave.label} · {wave.files.length} module{wave.files.length !== 1 ? 's' : ''}
              </div>
              <ul style={styles.fileList}>
                {wave.files.slice(0, 10).map((f) => {
                  const rc = f.risk === 'high' ? '#ff3c50' : f.risk === 'medium' ? '#ffaa00' : '#00cc66';
                  return (
                    <li key={f.id} style={styles.fileItem}>
                      <span style={styles.fileName}>{f.id.replace(/\.(ts|js|jsx|tsx|py)$/, '')}</span>
                      <span style={{ ...styles.riskDot, background: rc, boxShadow: `0 0 4px ${rc}` }} />
                    </li>
                  );
                })}
                {wave.files.length > 10 && (
                  <li style={styles.fileItem}>
                    <span style={styles.fileName}>+ {wave.files.length - 10} more files...</span>
                  </li>
                )}
              </ul>
            </div>
          ))}

          {/* Suggested Refactor Card */}
          <div style={styles.refactorCard} className="glass-card">
            <div style={styles.refactorTitle}>💡 Suggested Safe Refactor</div>
            <div style={styles.refactorText}>
              Consider isolating this module's dependencies to reduce blast radius. Extract shared logic into smaller, focused utilities.
            </div>
          </div>

          {/* Ask the Repo Chat */}
          <div style={styles.chatSection}>
            <div style={styles.chatTitle}>Ask the Repo</div>
            
            {/* Example Questions */}
            <div style={styles.exampleQuestions}>
              {exampleQuestions.map((q, i) => (
                <button
                  key={i}
                  style={styles.questionChip}
                  onClick={() => handleAskQuestion(q)}
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Chat Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (chatInput.trim()) {
                  handleAskQuestion(chatInput.trim());
                }
              }}
              style={styles.chatForm}
            >
              <input
                type="text"
                placeholder="Ask anything about this repo..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={styles.chatInput}
              />
            </form>

            {/* Loading State */}
            {isLoadingChat && (
              <div style={styles.chatLoading}>
                <span style={styles.chatLoadingDot}></span>
                Analyzing...
              </div>
            )}

            {/* Chat Response */}
            {chatResponse && (
              <div style={styles.chatResponse} className="glass-card">
                <div style={styles.chatQuestion}>Q: {chatResponse.question}</div>
                <div style={styles.chatAnswer}>{chatResponse.answer}</div>
              </div>
            )}
          </div>

          {/* Powered by Badge */}
          <div style={styles.poweredBy}>
            <span style={styles.poweredByDot}></span>
            Powered by IBM Bob + Groq
          </div>

          <div style={styles.panelHint}>Click same node to reset</div>
        </div>
      )}
    </div>
  );
}

const styles = {
  panelCollapsed: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '32px',
    background: 'rgba(7, 11, 22, 0.96)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    zIndex: 50,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  panel: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(7, 11, 22, 0.96)',
    backdropFilter: 'blur(16px)',
    borderTop: '1px solid rgba(0, 200, 255, 0.15)',
    zIndex: 50,
    transition: 'height 350ms cubic-bezier(0.4, 0, 0.2, 1)',
    overflow: 'hidden',
  },
  peekHandle: {
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
  },
  dragIndicator: {
    width: '24px',
    height: '3px',
    background: 'rgba(255, 255, 255, 0.15)',
    borderRadius: '2px',
  },
  peekText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
  },
  panelContent: {
    padding: '20px 24px',
    overflowY: 'auto',
    maxHeight: 'calc(100% - 32px)',
  },
  panelTitle: {
    color: 'var(--cyan-primary)',
    letterSpacing: '3px',
    fontSize: '9px',
    textTransform: 'uppercase',
    marginBottom: '14px',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  panelDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    boxShadow: '0 0 6px var(--cyan-primary)',
    display: 'inline-block',
    animation: 'pulse 2s infinite',
  },
  blastNumber: {
    fontSize: '52px',
    fontWeight: 'bold',
    color: 'var(--red-critical)',
    lineHeight: 1,
    margin: '6px 0 2px',
    textShadow: '0 0 24px rgba(255, 60, 80, 0.5)',
    fontVariantNumeric: 'tabular-nums',
  },
  blastSub: {
    fontSize: '9px',
    letterSpacing: '3px',
    color: 'rgba(255, 255, 255, 0.3)',
    textTransform: 'uppercase',
    marginBottom: '10px',
  },
  sourceFile: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.45)',
    marginBottom: '8px',
    wordBreak: 'break-all',
  },
  sourceFileName: {
    color: 'var(--cyan-primary)',
    fontWeight: 600,
  },
  bobReason: {
    background: 'rgba(0, 200, 255, 0.05)',
    border: '1px solid rgba(0, 200, 255, 0.12)',
    borderRadius: '5px',
    padding: '8px 10px',
    marginBottom: '10px',
    fontSize: '10.5px',
    color: 'rgba(255, 255, 255, 0.55)',
    lineHeight: 1.6,
  },
  bobReasonLabel: {
    display: 'block',
    fontSize: '8px',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--cyan-primary)',
    marginBottom: '4px',
    opacity: 0.7,
  },
  riskRow: {
    display: 'flex',
    gap: '6px',
    marginBottom: '8px',
    flexWrap: 'wrap',
  },
  pill: {
    fontSize: '9px',
    padding: '3px 8px',
    borderRadius: '12px',
    letterSpacing: '1px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    border: '1px solid',
    background: 'transparent',
  },
  waveLabel: {
    fontSize: '9px',
    letterSpacing: '1px',
    textTransform: 'uppercase',
    padding: '4px 8px',
    borderRadius: '4px',
    marginBottom: '4px',
  },
  fileList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 6px',
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '4px 8px',
    borderLeft: '2px solid rgba(255, 255, 255, 0.06)',
    marginBottom: '2px',
    fontSize: '10px',
    color: 'rgba(255, 255, 255, 0.45)',
  },
  fileName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '90%',
  },
  riskDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  refactorCard: {
    padding: '12px',
    marginTop: '16px',
    marginBottom: '16px',
  },
  refactorTitle: {
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  refactorText: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  chatSection: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
  },
  chatTitle: {
    fontSize: '10px',
    fontWeight: 600,
    letterSpacing: '2px',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '10px',
  },
  exampleQuestions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '10px',
  },
  questionChip: {
    background: 'rgba(0, 200, 255, 0.08)',
    border: '1px solid rgba(0, 200, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '10px',
    color: 'var(--cyan-primary)',
    padding: '4px 12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chatForm: {
    marginBottom: '12px',
  },
  chatInput: {
    width: '100%',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    color: 'var(--text-primary)',
  },
  chatLoading: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    padding: '8px 0',
  },
  chatLoadingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    animation: 'pulse 1.5s infinite',
  },
  chatResponse: {
    padding: '12px',
    marginTop: '8px',
  },
  chatQuestion: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginBottom: '8px',
    fontWeight: 600,
  },
  chatAnswer: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  poweredBy: {
    marginTop: '16px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: '9px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  poweredByDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--cyan-primary)',
    boxShadow: '0 0 6px var(--cyan-primary)',
    animation: 'pulse 2s infinite',
  },
  panelHint: {
    marginTop: '12px',
    fontSize: '9px',
    color: 'rgba(255, 255, 255, 0.2)',
    fontStyle: 'italic',
    letterSpacing: '1px',
  },
};

// Made with Bob
