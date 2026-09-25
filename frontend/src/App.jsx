import { useState, useCallback } from 'react';
import UploadZone from './components/UploadZone';
import JobTracker from './components/JobTracker';
import Dashboard from './components/Dashboard';
import { getJobResults } from './api';

const VIEW = { UPLOAD: 'upload', TRACKING: 'tracking', RESULTS: 'results' };

export default function App() {
  const [view, setView]       = useState(VIEW.UPLOAD);
  const [jobId, setJobId]     = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError]     = useState('');

  const handleJobCreated = (id) => { setJobId(id); setView(VIEW.TRACKING); };

  const handleComplete = useCallback(async (id) => {
    try {
      const res = await getJobResults(id);
      setResults(res.data);
      setView(VIEW.RESULTS);
    } catch {
      setError('Could not load your results. Try refreshing.');
    }
  }, []);

  const handleFailed = () => { 
    // Leave JobTracker mounted so the error message is visible
  };
  const handleReset  = () => { setView(VIEW.UPLOAD); setJobId(null); setResults(null); setError(''); };

  return (
    <div className="noise" style={{ minHeight: '100vh', background: 'var(--surface)' }}>

      {/* Ambient glow blobs — subtle, not loud */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-15%',
          width: '60vw', height: '60vw',
          background: 'radial-gradient(circle, rgba(124,108,250,0.05) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: '-15%', left: '-10%',
          width: '50vw', height: '50vw',
          background: 'radial-gradient(circle, rgba(245,158,11,0.04) 0%, transparent 65%)',
          borderRadius: '50%',
        }} />
      </div>

      {/* ── Header ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        padding: '0 2rem',
        height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--rule)',
        background: 'rgba(12,12,17,0.75)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}>
        <button
          onClick={handleReset}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.55rem' }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <rect width="22" height="22" rx="7" fill="var(--violet)" />
            <path d="M7 11h8M11 7l4 4-4 4" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="display" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>
            TxnFlow
          </span>
        </button>

        <div className="row" style={{ gap: '1.25rem' }}>
          {view === VIEW.RESULTS && (
            <button className="btn btn-ghost" onClick={handleReset} style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}>
              ← New file
            </button>
          )}
          <div className="row" style={{ gap: '0.35rem' }}>
            <div className="pulse-dot" />
            <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Gemini 2.5</span>
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <main style={{ position: 'relative', zIndex: 1 }}>

        {view === VIEW.UPLOAD && <UploadView onJobCreated={handleJobCreated} />}

        {view === VIEW.TRACKING && jobId && (
          <div style={{ padding: '5rem 2rem', display: 'flex', justifyContent: 'center' }}>
            <JobTracker jobId={jobId} onComplete={handleComplete} onFailed={handleFailed} onReset={handleReset} />
          </div>
        )}

        {view === VIEW.RESULTS && results && (
          <div style={{ padding: '2rem', maxWidth: 1240, margin: '0 auto' }}>
            <Dashboard results={results} onReset={handleReset} />
          </div>
        )}

        {error && (
          <p style={{ textAlign: 'center', padding: '2rem', color: 'var(--rose)', fontSize: '0.88rem' }}>{error}</p>
        )}
      </main>
    </div>
  );
}

/* ─── Upload landing view ─── */
function UploadView({ onJobCreated }) {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '4rem 2rem 6rem' }}>

      {/* Hero copy */}
      <div style={{ marginBottom: '3rem' }}>
        <div className="row" style={{ gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span className="tag tag-violet" style={{ fontSize: '0.7rem' }}>AI-powered</span>
          <span style={{ color: 'var(--ink-4)', fontSize: '0.75rem' }}>·</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>Gemini 2.5 Flash</span>
        </div>

        <h1 className="display" style={{
          fontSize: 'clamp(2.4rem, 6vw, 3.6rem)',
          fontWeight: 800,
          lineHeight: 1.08,
          letterSpacing: '-0.03em',
          color: 'var(--ink)',
          marginBottom: '1rem',
        }}>
          Drop in your CSV.<br />
          <span style={{ color: 'var(--violet)' }}>We handle the rest.</span>
        </h1>

        <p style={{
          fontSize: '1.05rem',
          color: 'var(--ink-2)',
          lineHeight: 1.65,
          maxWidth: 480,
          fontWeight: 300,
        }}>
          TxnFlow cleans your transaction data, catches what looks off, and uses AI to tell you where your money's going — all in about 30 seconds.
        </p>
      </div>

      {/* Upload box */}
      <div style={{ animationDelay: '80ms' }}>
        <UploadZone onJobCreated={onJobCreated} />
      </div>

      {/* Footer hints */}
      <div style={{ animationDelay: '160ms', marginTop: '2.5rem', display: 'flex', gap: '1.75rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Anomaly detection', desc: 'Flags unusual patterns' },
          { label: 'AI categorisation', desc: 'Powered by Gemini' },
          { label: 'Spending breakdown', desc: 'Charts & insights' },
        ].map((item) => (
          <div key={item.label} style={{ borderLeft: '2px solid var(--violet-mid)', paddingLeft: '0.75rem' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '1px' }}>{item.label}</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)' }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
