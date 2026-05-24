import { useState, useEffect } from 'react'
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

export default function Inventory() {
  const [items,   setItems]   = useState([])
  const [total,   setTotal]   = useState(0)
  const [page,    setPage]    = useState(1)
  const [search,  setSearch]  = useState('')
  const [risk,    setRisk]    = useState('')
  const [loading, setLoading] = useState(true)
  const [predicting, setPred] = useState(false)
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/inventory', { params:{ page, limit:LIMIT, search, risk } })
      setItems(r.data.items); setTotal(r.data.total)
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(()=>{ load() }, [page, search, risk])

  const runPredictions = async () => {
    setPred(true)
    try { await axios.post('/api/predict', {}); await load() }
    catch(e) { alert('ML service not running. Start it first.') }
    finally { setPred(false) }
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
        <div style={{display:'flex',gap:10}}>
          <button className="pred-btn" onClick={runPredictions} disabled={predicting}>
            {predicting ? '⟳ Running…' : '◎ Run predictions'}
          </button>
        </div>
      </div>

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
                {items.map((item, idx)=>(
                  <tr key={item.id}>
                    <td style={{color:'var(--gray)',fontSize:12,minWidth:32}}>{(page-1)*LIMIT + idx + 1}</td>
                    <td className="td-name">{item.product_name}</td>
                    <td className="td-cat">{item.category}</td>
                    <td>{item.qty_in}</td>
                    <td>{item.qty_sold}</td>
                    <td>{item.qty_remaining}</td>
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
