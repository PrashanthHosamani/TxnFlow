import { useEffect, useState } from 'react';
import { getJobStatus } from '../api';

const STAGES = [
  { id: 'created',   label: 'Job created',           detail: 'Your file is queued for processing' },
  { id: 'cleaning',  label: 'Cleaning data',          detail: 'Removing duplicates, normalising dates' },
  { id: 'anomaly',   label: 'Running anomaly checks', detail: 'Checking for unusual patterns' },
  { id: 'ai',        label: 'AI classification',      detail: 'Gemini is categorising each transaction' },
  { id: 'summary',   label: 'Generating insights',   detail: 'Building your spending summary' },
];

function Spinner() {
  return (
    <span
      className="anim-spin"
      style={{
        display: 'inline-block', flexShrink: 0,
        width: 14, height: 14,
        border: '1.5px solid var(--rule-2)',
        borderTop: '1.5px solid var(--violet)',
        borderRadius: '50%',
      }}
    />
  );
}

function StageRow({ stage, state }) {
  const isDone    = state === 'done';
  const isActive  = state === 'active';
  const isWaiting = state === 'waiting';
  const isFailed  = state === 'failed';

  return (
    <div className="row" style={{
      gap: '0.9rem', padding: '0.75rem 0',
      opacity: isWaiting ? 0.35 : 1,
      transition: 'opacity 0.3s',
      borderBottom: '1px solid var(--rule)',
    }}>
      {/* indicator */}
      <div style={{ width: 20, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
        {isActive  && <Spinner />}
        {isDone    && <span style={{ color: 'var(--emerald)', fontSize: '0.85rem', lineHeight: 1 }}>✓</span>}
        {isWaiting && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ink-4)', display: 'inline-block' }} />}
        {isFailed  && <span style={{ color: 'var(--rose)', fontSize: '0.85rem' }}>✕</span>}
      </div>

      {/* text */}
      <div>
        <p style={{
          fontSize: '0.88rem', fontWeight: isActive ? 600 : 400,
          color: isDone ? 'var(--emerald)' : isFailed ? 'var(--rose)' : isActive ? 'var(--ink)' : 'var(--ink-3)',
          marginBottom: isActive ? '2px' : 0,
          transition: 'color 0.3s',
        }}>
          {stage.label}
        </p>
        {isActive && (
          <p style={{ fontSize: '0.74rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
            {stage.detail}
          </p>
        )}
      </div>
    </div>
  );
}

export default function JobTracker({ jobId, onComplete, onFailed, onReset }) {
  const [status,   setStatus]   = useState('PENDING');
  const [elapsed,  setElapsed]  = useState(0);
  const [stageIdx, setStageIdx] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');

  // clock
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // slow-walk stage simulation while PROCESSING
  useEffect(() => {
    if (status !== 'PROCESSING') return;
    if (stageIdx >= STAGES.length - 1) return;
    const t = setTimeout(() => setStageIdx((i) => i + 1), 5000);
    return () => clearTimeout(t);
  }, [status, stageIdx]);

  // real polling
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const res = await getJobStatus(jobId);
        const s = res.data.status;
        setStatus(s);
        if (s === 'PROCESSING' && stageIdx === 0) setStageIdx(1);
        if (s === 'COMPLETED') { clearInterval(poll); setStageIdx(STAGES.length); onComplete(jobId); }
        if (s === 'FAILED')    { 
          clearInterval(poll); 
          setErrorMsg(res.data.error_message); 
          onFailed(); 
        }
      } catch { /* keep polling */ }
    }, 2500);
    return () => clearInterval(poll);
  }, [jobId, onComplete, onFailed]);

  const getState = (idx) => {
    if (status === 'FAILED')    return idx === 0 ? 'done' : idx === stageIdx ? 'failed' : idx < stageIdx ? 'done' : 'waiting';
    if (status === 'COMPLETED') return 'done';
    if (idx < stageIdx)  return 'done';
    if (idx === stageIdx) return 'active';
    return 'waiting';
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  return (
    <div style={{ width: '100%', maxWidth: 500 }}>

      {/* Header row */}
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', marginBottom: '4px' }}>
            job #{jobId}
          </p>
          <h2 className="display" style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--ink)' }}>
            Analysing your data
          </h2>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="mono" style={{ fontSize: '1.8rem', fontWeight: 500, color: 'var(--violet)', letterSpacing: '-0.02em', lineHeight: 1 }}>
            {mm}:{ss}
          </p>
          <p style={{ fontSize: '0.7rem', color: 'var(--ink-4)', marginTop: '2px' }}>elapsed</p>
        </div>
      </div>

      <div className="glow-line" style={{ marginBottom: '0.25rem' }} />

      {/* Stages */}
      <div>
        {STAGES.map((s, i) => (
          <StageRow key={s.id} stage={s} state={getState(i)} />
        ))}
      </div>

      {/* Hint */}
      {status !== 'FAILED' && (
        <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', marginTop: '1.25rem', fontFamily: 'var(--font-mono)' }}>
          Usually takes 15–60 seconds depending on file size.
        </p>
      )}

      {status === 'FAILED' && (
        <div style={{
          marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'var(--rose-dim)',
          border: '1px solid rgba(248,113,113,0.2)', borderRadius: 'var(--radius-md)',
        }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--rose)', marginBottom: '0.5rem' }}>
            {errorMsg || 'Something went wrong during processing. Please try uploading again.'}
          </p>
          {onReset && (
            <button className="btn btn-ghost" onClick={onReset} style={{ fontSize: '0.75rem', padding: '0.3rem 0.7rem' }}>
              Upload new file
            </button>
          )}
        </div>
      )}
    </div>
  );
}
