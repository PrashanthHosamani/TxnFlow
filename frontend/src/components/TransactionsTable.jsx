import { useState } from 'react';

const PAGE = 20;

const CAT_COLORS = {
  Food: '#f59e0b', Shopping: '#7c6cfa', Travel: '#34d399',
  Transport: '#60a5fa', Utilities: '#a78bfa', 'Cash Withdrawal': '#f87171',
  Entertainment: '#fb923c', Other: '#6b7280', Uncategorised: '#3a3a50',
};

function CatTag({ label }) {
  const c = CAT_COLORS[label] ?? '#6b7280';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: '0.71rem', fontWeight: 500,
      background: `${c}18`, color: c, border: `1px solid ${c}30`,
      fontFamily: 'var(--font-mono)',
    }}>{label || '—'}</span>
  );
}

function StatusDot({ status }) {
  const s = (status ?? '').toUpperCase();
  const c = { COMPLETED: '#34d399', PENDING: '#f59e0b', PROCESSING: '#7c6cfa', FAILED: '#f87171' }[s] ?? '#6b7280';
  return (
    <span className="row" style={{ gap: '5px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, flexShrink: 0 }} />
      <span style={{ fontSize: '0.76rem', color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>{status}</span>
    </span>
  );
}

export default function TransactionsTable({ transactions }) {
  const [tab, setTab]         = useState('all');
  const [page, setPage]       = useState(1);
  const [sortBy, setSortBy]   = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const data = tab === 'flagged'
    ? transactions.filter((t) => t.is_anomaly)
    : transactions;

  const sorted = [...data].sort((a, b) => {
    let av = a[sortBy] ?? '', bv = b[sortBy] ?? '';
    if (sortBy === 'amount') { av = parseFloat(av); bv = parseFloat(bv); }
    return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
  });

  const pages   = Math.ceil(sorted.length / PAGE);
  const visible = sorted.slice((page - 1) * PAGE, page * PAGE);
  const flagCount = transactions.filter((t) => t.is_anomaly).length;

  const sort = (field) => {
    if (sortBy === field) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('asc'); }
    setPage(1);
  };

  const SortBtn = ({ field, label }) => (
    <button
      onClick={() => sort(field)}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: sortBy === field ? 'var(--violet)' : 'inherit', fontFamily: 'var(--font-mono)', fontSize: 'inherit', fontWeight: 'inherit', letterSpacing: 'inherit', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px' }}
    >
      {label}{sortBy === field ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );

  return (
    <div className="stack" style={{ gap: '0.85rem' }}>
      {/* Tabs */}
      <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div className="tabs">
          <button className={`tab-item ${tab === 'all' ? 'on' : ''}`} onClick={() => { setTab('all'); setPage(1); }}>
            All &nbsp;<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75em' }}>{transactions.length}</span>
          </button>
          <button className={`tab-item ${tab === 'flagged' ? 'on' : ''}`} onClick={() => { setTab('flagged'); setPage(1); }}>
            Flagged &nbsp;<span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75em', color: flagCount ? 'var(--rose)' : undefined }}>{flagCount}</span>
          </button>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', alignSelf: 'center' }}>
          {sorted.length} rows
        </p>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--rule)' }}>
        <table className="txn-table">
          <thead>
            <tr>
              <th><SortBtn field="txn_id"   label="TXN ID" /></th>
              <th><SortBtn field="date"     label="DATE" /></th>
              <th><SortBtn field="merchant" label="MERCHANT" /></th>
              <th><SortBtn field="amount"   label="AMOUNT" /></th>
              <th>CURRENCY</th>
              <th>CATEGORY</th>
              <th>STATUS</th>
              <th>FLAG</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}>
                  nothing here
                </td>
              </tr>
            )}
            {visible.map((t, i) => (
              <tr key={t.txn_id || i} className={t.is_anomaly ? 'flag-row' : ''}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--violet)' }}>{t.txn_id}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{t.date}</td>
                <td style={{ fontWeight: 500 }}>{t.merchant || <span style={{ color: 'var(--ink-4)' }}>—</span>}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                  {parseFloat(t.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>{t.currency || '—'}</td>
                <td><CatTag label={t.llm_category || t.category} /></td>
                <td><StatusDot status={t.status} /></td>
                <td>
                  {t.is_anomaly
                    ? <span title={t.anomaly_reason} style={{ cursor: 'help', color: 'var(--rose)', fontSize: '0.85rem' }}>⚑</span>
                    : <span style={{ color: 'var(--emerald)', fontSize: '0.8rem' }}>✓</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
            {(page - 1) * PAGE + 1}–{Math.min(page * PAGE, sorted.length)} / {sorted.length}
          </span>
          <div className="tabs">
            <button className="tab-item" disabled={page === 1} onClick={() => setPage((p) => p - 1)} style={{ opacity: page === 1 ? 0.35 : 1 }}>← prev</button>
            {Array.from({ length: pages }, (_, i) => i + 1)
              .filter((p) => Math.abs(p - page) <= 2)
              .map((p) => (
                <button key={p} className={`tab-item ${p === page ? 'on' : ''}`} onClick={() => setPage(p)}>{p}</button>
              ))}
            <button className="tab-item" disabled={page === pages} onClick={() => setPage((p) => p + 1)} style={{ opacity: page === pages ? 0.35 : 1 }}>next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
