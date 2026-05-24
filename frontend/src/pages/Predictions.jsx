import { useState, useEffect } from 'react'
import axios from 'axios'
import './Predictions.css'

const RISK_COLOR = { Low:'#1B7A5A', Medium:'#C47D0E', High:'#C0392B', Expired:'#7D1A1A', '':'#888' }
const VEL_COLOR  = { Fast:'#1B7A5A', Moderate:'#C47D0E', Slow:'#C0392B', '':'#888' }

function GaugeBar({ value, color }) {
  return (
    <div className="gauge-track">
      <div className="gauge-fill" style={{ width:`${value||0}%`, background:color }} />
    </div>
  )
}

function PredCard({ item, onPredict }) {
  const [open,     setOpen]     = useState(false)
  const [running,  setRunning]  = useState(false)
  const er   = item.expiry_risk||'—'
  const sv   = item.sales_velocity||'—'
  const cp   = item.customer_preference||'—'
  const sm   = item.slow_mover||'—'
  const conf = item.prediction_confidence||0

  const isBad  = er==='High'||er==='Expired'||sm==='Yes'
  const isGood = er==='Low'&&sv==='Fast'&&cp==='High'

  const handlePredict = async (e) => {
    e.stopPropagation()
    setRunning(true)
    try {
      await onPredict(item.id)
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className={`pred-card${isBad?' pred-bad':isGood?' pred-good':''}`}>
      <div className="pred-top" onClick={()=>setOpen(!open)}>
        <div className="pred-left">
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'var(--gray)',fontWeight:600,minWidth:28}}>#{item._displayIdx}</span>
            <div className="pred-name">{item.product_name}</div>
          </div>
          <div className="pred-cat">{item.category} · {item.store_city||'—'} · {item.qty_remaining||0} units remaining</div>
        </div>
        <div className="pred-badges">
          <span className="pb" style={{background:RISK_COLOR[er]+'22',color:RISK_COLOR[er]}}>Expiry: {er}</span>
          <span className="pb" style={{background:VEL_COLOR[sv]+'22',color:VEL_COLOR[sv]}}>Speed: {sv}</span>
          <span className="pb" style={{background:'#eee',color:'#555'}}>Pref: {cp}</span>
          <span className={`pb ${sm==='Yes'?'pb-warn':'pb-ok'}`}>Slow: {sm}</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}} onClick={e=>e.stopPropagation()}>
          <button
            className="pred-single-btn"
            onClick={handlePredict}
            disabled={running}
            title="Re-run ML prediction for this item only"
            style={{
              fontSize:12,padding:'4px 10px',borderRadius:6,border:'1px solid var(--green)',
              background:'transparent',color:'var(--green)',cursor:'pointer',whiteSpace:'nowrap'
            }}
          >
            {running ? '⟳…' : '◎ Predict'}
          </button>
          <span className="pred-chevron" onClick={()=>setOpen(!open)}>{open?'▲':'▼'}</span>
        </div>
      </div>

      {open && (
        <div className="pred-body">
          <div className="pred-gauges">
            {[
              { label:'Expiry risk',     val:conf,    color:RISK_COLOR[er] },
              { label:'Sales velocity',  val:sv==='Fast'?85:sv==='Moderate'?55:20, color:VEL_COLOR[sv] },
              { label:'Customer demand', val:cp==='High'?90:cp==='Medium'?55:20, color:'#1B7A5A' },
              { label:'Slow mover risk', val:sm==='Yes'?85:20, color:sm==='Yes'?'#C0392B':'#1B7A5A' },
            ].map(g=>(
              <div key={g.label} className="gauge-row">
                <span className="gauge-label">{g.label}</span>
                <GaugeBar value={g.val} color={g.color} />
                <span className="gauge-val" style={{color:g.color}}>{Math.round(g.val)}%</span>
              </div>
            ))}
          </div>

          {item.recommendation && (
            <div className="pred-recs">
              {item.recommendation.split(' | ').map((r,i)=>(
                <div key={i} className="pred-rec">{r}</div>
              ))}
            </div>
          )}

          <div className="pred-meta">
            <span>Confidence: <strong>{conf}%</strong></span>
            <span>Days to expiry: <strong>{item.days_to_expiry!=null?item.days_to_expiry+'d':'—'}</strong></span>
            <span>Sell-through: <strong>{item.sell_through_rate!=null?(item.sell_through_rate*100).toFixed(1)+'%':'—'}</strong></span>
            <span>Weekly sales rate: <strong>{item.weekly_sales_rate!=null?Number(item.weekly_sales_rate).toFixed(2)+'/wk':'—'}</strong></span>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Predictions() {
  const [items,   setItems]   = useState([])
  const [filter,  setFilter]  = useState('all')
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/inventory', { params:{ limit:200 } })
      setItems(r.data.items||[])
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  // Predict ALL items
  const runAll = async () => {
    setRunning(true)
    try { await axios.post('/api/predict', {}); await load() }
    catch(e) { alert('ML service not available. Make sure it is running on port 5001.') }
    finally  { setRunning(false) }
  }

  // Predict a SINGLE item and refresh its card in-place
  const predictOne = async (itemId) => {
    try {
      const res = await axios.post(`/api/predict/${itemId}`)
      const updated = res.data.results?.[0]
      if (updated) {
        setItems(prev => prev.map(i => i.id === updated.id ? { ...i, ...updated } : i))
      }
    } catch(e) {
      alert('ML service not available. Make sure it is running on port 5001.')
    }
  }

  const FILTERS = [
    { key:'all',        label:'All products' },
    { key:'high_risk',  label:'High / Expired' },
    { key:'slow',       label:'Slow movers' },
    { key:'fast',       label:'Fast movers' },
    { key:'no_pred',    label:'Not predicted' },
  ]

  const filtered = items.filter(i=>{
    if (filter==='high_risk') return i.expiry_risk==='High'||i.expiry_risk==='Expired'
    if (filter==='slow')      return i.slow_mover==='Yes'
    if (filter==='fast')      return i.sales_velocity==='Fast'
    if (filter==='no_pred')   return !i.expiry_risk
    return true
  })

  return (
    <div className="pred-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Predictions</h1>
          <p className="page-sub">ML-generated risk assessments and recommendations · {items.length} total items</p>
        </div>
        <button className="pred-run-btn" onClick={runAll} disabled={running}>
          {running ? '⟳ Running ML…' : '◎ Run all predictions'}
        </button>
      </div>

      <div className="pred-filter-bar">
        {FILTERS.map(f=>(
          <button key={f.key} className={`pf-btn${filter===f.key?' active':''}`} onClick={()=>setFilter(f.key)}>
            {f.label}
            <span className="pf-count">
              {f.key==='all' ? items.length :
               f.key==='high_risk' ? items.filter(i=>i.expiry_risk==='High'||i.expiry_risk==='Expired').length :
               f.key==='slow'  ? items.filter(i=>i.slow_mover==='Yes').length :
               f.key==='fast'  ? items.filter(i=>i.sales_velocity==='Fast').length :
               items.filter(i=>!i.expiry_risk).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Loading predictions…</div> : (
        <div className="pred-list">
          {filtered.length===0 && <div style={{textAlign:'center',padding:'40px',color:'var(--gray)'}}>No records match this filter</div>}
          {filtered.map((item, idx)=>(
            <PredCard
              key={item.id}
              item={{...item, _displayIdx: idx + 1}}
              onPredict={predictOne}
            />
          ))}
        </div>
      )}
    </div>
  )
}