import { useState, useCallback, useRef } from 'react';
import { uploadCSV } from '../api';

export default function UploadZone({ onJobCreated }) {
  const [over, setOver]         = useState(false);
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError]       = useState('');
  const inputRef = useRef();

  const pick = (f) => {
    if (!f) return;
    const name = f.name.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xls') && !name.endsWith('.xlsx')) { 
      setError('Only CSV or Excel files, please.'); 
      return; 
    }
    if (f.size > 50 * 1024 * 1024) { setError('File must be under 50 MB.'); return; }
    setError('');
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setOver(false);
    pick(e.dataTransfer.files[0]);
  }, []);

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true); setError('');
    try {
      const res = await uploadCSV(file, setProgress);
      onJobCreated(res.data.job_id);
    } catch (e) {
      const msg = e.response?.data?.file?.[0] ?? 'Upload failed — is the server running?';
      setError(msg);
    } finally {
      setUploading(false); setProgress(0);
    }
  };

  const fmt = (bytes) => bytes < 1024 * 1024
    ? `${(bytes / 1024).toFixed(1)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="stack" style={{ gap: '0.85rem' }}>

      {/* Drop area */}
      <div
        className={`dropzone ${over ? 'over' : ''}`}
        style={{ padding: '3rem 2rem', textAlign: 'center', position: 'relative' }}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xls,.xlsx" style={{ display: 'none' }}
          onChange={(e) => { pick(e.target.files[0]); e.target.value = ''; }} />

        {file ? (
          /* File selected state */
          <div className="stack" style={{ gap: '0.6rem', alignItems: 'center' }}>
            <span style={{ fontSize: '2rem' }}>📄</span>
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--ink)', marginBottom: '2px' }}>{file.name}</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{fmt(file.size)}</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setFile(null); setError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-3)', fontSize: '0.78rem', marginTop: '0.25rem' }}
            >
              remove file
            </button>
          </div>
        ) : (
          /* Empty state */
          <div className="stack" style={{ gap: '0.75rem', alignItems: 'center' }}>
            <div className="anim-float" style={{ fontSize: '2.2rem', lineHeight: 1 }}>🗂️</div>
            <div>
              <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)', marginBottom: '0.3rem' }}>
                {over ? 'Drop it right here' : 'Drag your CSV or Excel file here'}
              </p>
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-3)' }}>
                or{' '}
                <span
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                  style={{ color: 'var(--violet)', textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer' }}
                >
                  browse your files
                </span>
                {' '}— up to 50 MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload progress */}
      {uploading && (
        <div style={{ padding: '0 2px' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--ink-3)' }}>Uploading your file…</span>
            <span style={{ fontSize: '0.78rem', color: 'var(--violet)', fontFamily: 'var(--font-mono)' }}>{progress}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p style={{ fontSize: '0.82rem', color: 'var(--rose)', padding: '0 2px' }}>
          ↳ {error}
        </p>
      )}

      {/* Submit button */}
      <button
        className="btn btn-fill"
        disabled={!file || uploading}
        onClick={submit}
        style={{ alignSelf: 'stretch', justifyContent: 'center', fontSize: '0.9rem', padding: '0.75rem' }}
      >
        {uploading ? (
          <>
            <span className="anim-spin" style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTop: '2px solid #fff', borderRadius: '50%', display: 'inline-block', flexShrink: 0 }} />
            Working on it…
          </>
        ) : (
          <> Analyse transactions →</>
        )}
      </button>

      {/* Format hint */}
      <p style={{ fontSize: '0.74rem', color: 'var(--ink-4)', textAlign: 'center', fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
        expects: txn_id · date · amount · account_id — merchant & currency optional
      </p>
    </div>
  );
}
