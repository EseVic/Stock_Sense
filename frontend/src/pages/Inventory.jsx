import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './Inventory.css'

const RISK_BADGE  = { Low:'badge-green', Medium:'badge-amber', High:'badge-red', Expired:'badge-dark', '':'badge-gray' }
const VEL_BADGE   = { Fast:'badge-green', Moderate:'badge-amber', Slow:'badge-red', '':'badge-gray' }
const PREF_BADGE  = { High:'badge-green', Medium:'badge-amber', Low:'badge-gray' }

function Badge({ label, type='risk' }) {
  if (!label) return <span className="badge badge-gray">—</span>
  const cls = type==='risk' ? RISK_BADGE[label] : type==='vel' ? VEL_BADGE[label] : PREF_BADGE[label]
  return <span className={`badge ${cls||'badge-gray'}`}>{label}</span>
}

// ── CSV export helper ──
function exportCSV(items) {
  const headers = ['Product','Category','Qty In','Qty Sold','Qty Remaining','Unit Price (₦)','Days to Expiry','Expiry Risk','Sales Velocity','Customer Preference','Slow Mover']
  const rows = items.map(i => [
    i.product_name, i.category, i.qty_in, i.qty_sold, i.qty_remaining,
    i.unit_price, i.days_to_expiry ?? '', i.expiry_risk ?? '',
    i.sales_velocity ?? '', i.customer_preference ?? '', i.slow_mover ?? ''
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `stocksense_inventory_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Print helper ──
function printTable(items) {
  const rows = items.map(i => `
    <tr>
      <td>${i.product_name}</td><td>${i.category}</td>
      <td>${i.qty_in}</td><td>${i.qty_sold}</td><td>${i.qty_remaining}</td>
      <td>₦${Number(i.unit_price||0).toLocaleString()}</td>
      <td>${i.days_to_expiry ?? '—'}</td>
      <td>${i.expiry_risk ?? '—'}</td><td>${i.sales_velocity ?? '—'}</td>
      <td>${i.customer_preference ?? '—'}</td><td>${i.slow_mover ?? '—'}</td>
    </tr>`).join('')
  const html = `
    <html><head><title>StockSense — Inventory</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
      h2   { margin-bottom: 4px; }
      p    { color: #666; margin-bottom: 12px; font-size: 11px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#0F2419; color:#fff; padding:7px 8px; text-align:left; font-size:10px; }
      td { padding:6px 8px; border-bottom:1px solid #eee; }
      tr:nth-child(even) td { background:#f9f9f9; }
    </style></head>
    <body>
      <h2>StockSense — Inventory Report</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr>
          <th>Product</th><th>Category</th><th>Qty In</th><th>Sold</th>
          <th>Remaining</th><th>Price</th><th>Days to Expiry</th>
          <th>Expiry Risk</th><th>Sales Speed</th><th>Preference</th><th>Slow Mover</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html); w.document.close(); w.print()
}

export default function Inventory() {
  const [items,      setItems]   = useState([])
  const [allItems,   setAll]     = useState([])   // full list for export/print
  const [total,      setTotal]   = useState(0)
  const [page,       setPage]    = useState(1)
  const [search,     setSearch]  = useState('')
  const [risk,       setRisk]    = useState('')
  const [loading,    setLoading] = useState(true)
  const [predicting, setPred]    = useState(false)
  const [lowStock,   setLow]     = useState([])
  const [showLow,    setShowLow] = useState(false)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const [page_r, all_r] = await Promise.all([
        axios.get('/api/inventory', { params:{ page, limit:LIMIT, search, risk } }),
        axios.get('/api/inventory', { params:{ limit:10000 } })
      ])
      setItems(page_r.data.items); setTotal(page_r.data.total)
      const all = all_r.data.items || []
      setAll(all)
      // low stock: remaining <= 10% of qty_in or remaining <= 5 units
      setLow(all.filter(i => i.qty_remaining != null && i.qty_in > 0 &&
        (i.qty_remaining <= 5 || (i.qty_remaining / i.qty_in) <= 0.1)))
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(() => { load() }, [page, search, risk])

  const runPredictions = async () => {
    setPred(true)
    try { await axios.post('/api/predict', {}); await load() }
    catch(e) { alert('ML service not running. Start it first.') }
    finally  { setPred(false) }
  }

  const deleteItem = async id => {
    if (!confirm('Delete this record?')) return
    await axios.delete(`/api/inventory/${id}`)
    load()
  }

  const pages = Math.ceil(total/LIMIT)

  return (
    <div className="inv-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-sub">{total} total records</p>
        </div>
        <div className="inv-actions">
          {lowStock.length > 0 && (
            <button className="low-stock-btn" onClick={() => setShowLow(s => !s)}>
              ⚠️ {lowStock.length} low stock
            </button>
          )}
          <button className="icon-btn" onClick={() => exportCSV(allItems)} title="Export to CSV">
            ⬇ CSV
          </button>
          <button className="icon-btn" onClick={() => printTable(allItems)} title="Print / Save as PDF">
            🖨 Print
          </button>
          <button className="pred-btn" onClick={runPredictions} disabled={predicting}>
            {predicting ? '⟳ Running…' : '◎ Run predictions'}
          </button>
        </div>
      </div>

      {/* ── low stock alert panel ── */}
      {showLow && lowStock.length > 0 && (
        <div className="low-stock-panel">
          <div className="lsp-header">
            <span>⚠️ Low stock alerts — {lowStock.length} products need restocking</span>
            <button className="lsp-close" onClick={() => setShowLow(false)}>✕</button>
          </div>
          <div className="lsp-list">
            {lowStock.map((i, idx) => (
              <div key={idx} className="lsp-item">
                <div className="lsp-name">{i.product_name}</div>
                <div className="lsp-detail">
                  {i.qty_remaining} units remaining of {i.qty_in} —
                  <span className="lsp-pct"> {Math.round((i.qty_remaining/i.qty_in)*100)}% left</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="inv-filters">
        <input className="filter-input" placeholder="Search products…" value={search}
          onChange={e=>{ setSearch(e.target.value); setPage(1) }} />
        <select className="filter-input" value={risk} onChange={e=>{ setRisk(e.target.value); setPage(1) }}>
          <option value="">All risk levels</option>
          <option>Low</option><option>Medium</option><option>High</option><option>Expired</option>
        </select>
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <>
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>#</th><th>Product</th><th>Category</th><th>Qty in</th><th>Sold</th>
                  <th>Remaining</th><th>Price</th><th>Days to expiry</th>
                  <th>Expiry risk</th><th>Sales speed</th><th>Preference</th>
                  <th>Slow mover</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length===0 && <tr><td colSpan={13} style={{textAlign:'center',color:'var(--gray)',padding:'32px'}}>No records found</td></tr>}
                {items.map((item, idx) => (
                  <tr key={item.id} className={item.qty_remaining <= 5 ? 'tr-low' : ''}>
                    <td style={{color:'var(--gray)',fontSize:12,minWidth:32}}>{(page-1)*LIMIT + idx + 1}</td>
                    <td className="td-name">
                      {item.product_name}
                      {item.qty_remaining <= 5 && <span className="low-badge">Low</span>}
                    </td>
                    <td className="td-cat">{item.category}</td>
                    <td>{item.qty_in}</td>
                    <td>{item.qty_sold}</td>
                    <td className={item.qty_remaining <= 5 ? 'td-urgent' : ''}>{item.qty_remaining}</td>
                    <td>₦{Number(item.unit_price||0).toLocaleString()}</td>
                    <td className={item.days_to_expiry<=7?'td-urgent':''}>
                      {item.days_to_expiry!=null ? item.days_to_expiry+'d' : '—'}
                    </td>
                    <td><Badge label={item.expiry_risk} type="risk" /></td>
                    <td><Badge label={item.sales_velocity} type="vel" /></td>
                    <td><Badge label={item.customer_preference} type="pref" /></td>
                    <td><Badge label={item.slow_mover} type="pref" /></td>
                    <td>
                      <button className="td-del" onClick={()=>deleteItem(item.id)} title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages>1 && (
            <div className="pager">
              <button className="pg-btn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>‹ Prev</button>
              <span className="pg-info">Page {page} of {pages}</span>
              <button className="pg-btn" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Next ›</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
