import { useState, useEffect } from 'react'
import axios from 'axios'
import './Predictions.css'
import { formatDaysToExpiry } from '../utils/expiry'

const RISK_COLOR = { Low:'#1B7A5A', Medium:'#C47D0E', High:'#C0392B', Expired:'#7D1A1A', '':'#888' }
const VEL_COLOR  = { Fast:'#1B7A5A', Moderate:'#C47D0E', Slow:'#C0392B', '':'#888' }

function GaugeBar({ value, color }) {
  return (
    <div className="gauge-track">
      <div className="gauge-fill" style={{ width:`${value||0}%`, background:color }} />
    </div>
  )
}

// ── CSV export for predictions ──
function exportPredCSV(items) {
  const headers = ['Product','Category','City','Qty Remaining','Expiry Risk','Sales Velocity','Customer Preference','Slow Mover','Confidence %','Recommendation']
  const rows = items.map(i => [
    i.product_name, i.category, i.store_city||'', i.qty_remaining||0,
    i.expiry_risk||'', i.sales_velocity||'', i.customer_preference||'',
    i.slow_mover||'', i.prediction_confidence||'',
    (i.recommendation||'').replace(/\s*\|\s*/g,' | ')
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type:'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `stocksense_predictions_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

// ── Print predictions ──
function printPredictions(items) {
  const rows = items.map(i => `
    <tr>
      <td>${i.product_name}</td>
      <td>${i.expiry_risk||'—'}</td>
      <td>${i.sales_velocity||'—'}</td>
      <td>${i.customer_preference||'—'}</td>
      <td>${i.slow_mover||'—'}</td>
      <td>${i.prediction_confidence||'—'}%</td>
      <td>${(i.recommendation||'—').replace(/\s*\|\s*/g,'<br/>')}</td>
    </tr>`).join('')
  const html = `
    <html><head><title>StockSense — Predictions</title>
    <style>
      body { font-family:Arial,sans-serif; font-size:11px; padding:20px; }
      h2   { margin-bottom:4px; }
      p    { color:#666; margin-bottom:12px; font-size:11px; }
      table { width:100%; border-collapse:collapse; }
      th { background:#0F2419; color:#fff; padding:7px 8px; text-align:left; font-size:10px; }
      td { padding:6px 8px; border-bottom:1px solid #eee; vertical-align:top; }
      tr:nth-child(even) td { background:#f9f9f9; }
    </style></head>
    <body>
      <h2>StockSense — Predictions Report</h2>
      <p>Generated: ${new Date().toLocaleString()}</p>
      <table>
        <thead><tr>
          <th>Product</th><th>Expiry Risk</th><th>Sales Speed</th>
          <th>Preference</th><th>Slow Mover</th><th>Confidence</th><th>Recommendation</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`
  const w = window.open('', '_blank')
  w.document.write(html); w.document.close(); w.print()
}

// ── Counterfactual Scenario Simulator ──────────────────────────────────────
function WhatIfSimulator({ items }) {
  const [selectedId,  setSelectedId]  = useState('')
  const [qtySold,     setQtySold]     = useState('')
  const [daysLeft,    setDaysLeft]    = useState('')
  const [result,      setResult]      = useState(null)
  const [running,     setRunning]     = useState(false)
  const [error,       setError]       = useState(null)

  const selected = items.find(i => i.id === parseInt(selectedId))

  const runSimulation = async () => {
    if (!selected) return
    setRunning(true); setError(null); setResult(null)
    try {
      const res = await axios.post('/api/predict/simulate', {
        inventory_id:  selected.id,
        qty_sold:      qtySold     !== '' ? parseInt(qtySold)  : selected.qty_sold,
        days_to_expiry: daysLeft   !== '' ? parseInt(daysLeft) : selected.days_to_expiry,
      })
      setResult(res.data)
    } catch(e) {
      setError(
        e.response?.data?.details ||
        e.response?.data?.error ||
        'Simulation failed. Make sure the ML service is running.'
      )
    } finally {
      setRunning(false)
    }
  }

  const reset = () => { setResult(null); setError(null); setQtySold(''); setDaysLeft('') }

  const comparisonRows = result ? [
    { key:'expiry_risk', label:'Expiry risk', colorMap:RISK_COLOR },
    { key:'sales_velocity', label:'Sales velocity', colorMap:VEL_COLOR },
    { key:'customer_preference', label:'Preference', color:'#1B7A5A' },
    { key:'slow_mover', label:'Slow mover', color:'#1B7A5A' },
  ].map(row => {
    const current = result.current_predictions?.[row.key] || {}
    const simulated = result.predictions?.[row.key] || {}
    const currentScore = row.key === 'expiry_risk' ? current.urgency : current.confidence
    const simulatedScore = row.key === 'expiry_risk' ? simulated.urgency : simulated.confidence
    const colorFor = value => row.colorMap
      ? row.colorMap[value || '']
      : row.key === 'slow_mover' && value === 'Yes' ? '#C0392B' : row.color
    return {
      ...row,
      current,
      simulated,
      currentScore,
      simulatedScore,
      currentColor: colorFor(current.label),
      simulatedColor: colorFor(simulated.label),
      changed: current.label !== simulated.label,
    }
  }) : []

  const changedRows = comparisonRows.filter(row => row.changed)
  const valueDeltas = result ? [
    { label:'Units sold', before:result.current_values?.qty_sold, after:result.simulated_values?.qty_sold },
    { label:'Units remaining', before:result.current_values?.qty_remaining, after:result.simulated_values?.qty_remaining },
    { label:'Days to expiry', before:result.current_values?.days_to_expiry, after:result.simulated_values?.days_to_expiry },
  ].filter(delta => delta.before !== delta.after) : []

  return (
    <div className="whatif-box">
      <div className="whatif-header">
        <div>
          <h3 className="whatif-title">🔮 Counterfactual Scenario Simulator</h3>
          <p className="whatif-sub">
            Compare current predictions with a changed stock scenario. This is a point-in-time what-if analysis, not a multi-week digital-twin forecast.
          </p>
        </div>
      </div>

      <div className="whatif-form">
        <div className="whatif-field">
          <label className="field-label">Select product</label>
          <select
            className="field-input"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); reset() }}
          >
            <option value="">— choose a product —</option>
            {items.map(i => (
              <option key={i.id} value={i.id}>
                {i.product_name} ({i.qty_remaining} remaining)
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <>
            <div className="whatif-current">
              <span className="wc-label">Current values:</span>
              <span className="wc-chip">Sold: {selected.qty_sold}</span>
              <span className="wc-chip">Remaining: {selected.qty_remaining}</span>
              <span className="wc-chip">Days to expiry: {selected.days_to_expiry < 9999 ? formatDaysToExpiry(selected.days_to_expiry) : '—'}</span>
            </div>

            <div className="whatif-inputs">
              <div className="whatif-field">
                <label className="field-label">What if total units sold were…</label>
                <input
                  className="field-input"
                  type="number" min="0" max={selected.qty_in}
                  placeholder={`Current: ${selected.qty_sold}`}
                  value={qtySold}
                  onChange={e => { setQtySold(e.target.value); setResult(null) }}
                />
              </div>
              {selected.days_to_expiry < 9999 && (
                <div className="whatif-field">
                  <label className="field-label">What if days to expiry were…</label>
                  <input
                    className="field-input"
                    type="number" min="-3650"
                    placeholder={`Current: ${selected.days_to_expiry}`}
                    value={daysLeft}
                    onChange={e => { setDaysLeft(e.target.value); setResult(null) }}
                  />
                </div>
              )}
            </div>

            <button
              className="whatif-run-btn"
              onClick={runSimulation}
              disabled={running || (qtySold === '' && daysLeft === '')}
            >
              {running ? '⟳ Simulating…' : '🔮 Run simulation'}
            </button>
          </>
        )}
      </div>

      {error && <div className="whatif-error">{error}</div>}

      {result && (
        <div className="whatif-result">
          <div className="wr-title">Simulation result for <strong>{selected?.product_name}</strong></div>

          <div className="wr-input-deltas">
            {valueDeltas.map(delta => (
              <span key={delta.label} className="wr-delta-chip">
                {delta.label}: <strong>{delta.before ?? '—'} → {delta.after ?? '—'}</strong>
              </span>
            ))}
          </div>

          <div className="wr-compare">

            <div className="wr-col">
              <div className="wr-col-title">Current predictions</div>
              {comparisonRows.map(row => (
                <div key={row.key} className="wr-row">
                  <span className="wr-row-label">{row.label}</span>
                  <span className="wr-badge" style={{background:row.currentColor+'22', color:row.currentColor}}>
                    {row.current.label || '—'}
                    {row.currentScore != null && <small>{Number(row.currentScore).toFixed(1)}%</small>}
                  </span>
                </div>
              ))}
            </div>

            <div className="wr-arrow">→</div>

            <div className="wr-col wr-col-new">
              <div className="wr-col-title">Simulated predictions</div>
              {comparisonRows.map(row => (
                <div key={row.key} className={`wr-row${row.changed ? ' wr-row-changed' : ''}`}>
                  <span className="wr-row-label">{row.label}</span>
                  <span className="wr-badge" style={{background:row.simulatedColor+'22', color:row.simulatedColor}}>
                    {row.simulated.label || '—'}
                    {row.simulatedScore != null && <small>{Number(row.simulatedScore).toFixed(1)}%</small>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className={`wr-change-summary ${changedRows.length ? 'has-change' : 'no-change'}`}>
            {changedRows.length
              ? `${changedRows.length} classification${changedRows.length > 1 ? 's' : ''} changed: ${changedRows.map(row => row.label).join(', ')}.`
              : 'No classification changed because the simulated values stayed within the same decision bands. Confidence and stock quantities may still have changed.'}
          </div>

          {result.recommendations && (
            <div className="wr-recs">
              {result.recommendations.map((r,i) => (
                <div key={i} className="wr-rec">{r}</div>
              ))}
            </div>
          )}

          <button className="whatif-reset-btn" onClick={reset}>Run another simulation</button>
        </div>
      )}
    </div>
  )
}

function PredCard({ item, onPredict }) {
  const [open,    setOpen]    = useState(false)
  const [running, setRunning] = useState(false)
  const er   = item.expiry_risk||'—'
  const sv   = item.sales_velocity||'—'
  const cp   = item.customer_preference||'—'
  const sm   = item.slow_mover||'—'
  const conf = item.prediction_confidence||0
  const details = item.prediction_details || item.predictions || {}
  const taskScore = (task) => {
    const value = task === 'expiry_risk'
      ? details?.[task]?.urgency
      : details?.[task]?.confidence
    return value == null ? null : Number(value)
  }
  const taskModel = (task) => details?.[task]?.model || '—'

  const isBad  = er==='High'||er==='Expired'||sm==='Yes'
  const isGood = er==='Low'&&sv==='Fast'&&cp==='High'

  const handlePredict = async (e) => {
    e.stopPropagation(); setRunning(true)
    try { await onPredict(item.id) } finally { setRunning(false) }
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
          <button className="pred-single-btn" onClick={handlePredict} disabled={running}
            title="Re-run ML prediction for this item only"
            style={{fontSize:12,padding:'4px 10px',borderRadius:6,border:'1px solid var(--green)',
              background:'transparent',color:'var(--green)',cursor:'pointer',whiteSpace:'nowrap'}}>
            {running ? '⟳…' : '◎ Predict'}
          </button>
          <span className="pred-chevron" onClick={()=>setOpen(!open)}>{open?'▲':'▼'}</span>
        </div>
      </div>

      {open && (
        <div className="pred-body">
          <div className="pred-gauges">
            {[
              { task:'expiry_risk', label:'Expiry urgency', val:taskScore('expiry_risk'), color:RISK_COLOR[er] },
              { task:'sales_velocity', label:'Sales velocity', val:taskScore('sales_velocity'), color:VEL_COLOR[sv] },
              { task:'customer_preference', label:'Customer demand', val:taskScore('customer_preference'), color:'#1B7A5A' },
              { task:'slow_mover', label:'Slow mover risk', val:taskScore('slow_mover'), color:sm==='Yes'?'#C0392B':'#1B7A5A' },
            ].map(g=>(
              <div key={g.label} className="gauge-row">
                <span className="gauge-label" title={`Selected model: ${taskModel(g.task)}`}>{g.label}</span>
                <GaugeBar value={g.val} color={g.color} />
                <span className="gauge-val" style={{color:g.color}}>{g.val != null ? `${g.val.toFixed(1)}%` : '—'}</span>
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
            <span>Expiry source: <strong>{taskModel('expiry_risk')}</strong></span>
            <span>Days to expiry: <strong>{formatDaysToExpiry(item.days_to_expiry)}</strong></span>
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
  const [showSim, setShowSim] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const r = await axios.get('/api/inventory', { params:{ limit:200 } })
      setItems(r.data.items||[])
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(()=>{ load() }, [])

  const runAll = async () => {
    setRunning(true)
    try { await axios.post('/api/predict', {}); await load() }
    catch(e) { alert('ML service not available. Make sure it is running.') }
    finally  { setRunning(false) }
  }

  const predictOne = async (itemId) => {
    try {
      const res = await axios.post(`/api/predict/${itemId}`)
      const updated = res.data.results?.[0]
      if (updated) setItems(prev => prev.map(i => i.id===updated.id ? {...i,...updated} : i))
    } catch(e) { alert('ML service not available.') }
  }

  const FILTERS = [
    { key:'all',       label:'All products' },
    { key:'high_risk', label:'High / Expired' },
    { key:'slow',      label:'Slow movers' },
    { key:'fast',      label:'Fast movers' },
    { key:'no_pred',   label:'Not predicted' },
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
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          <button className="icon-btn" onClick={() => exportPredCSV(filtered)} title="Export to CSV">⬇ CSV</button>
          <button className="icon-btn" onClick={() => printPredictions(filtered)} title="Print / Save as PDF">🖨 Print</button>
          <button
            className="icon-btn"
            style={showSim?{background:'var(--green)',color:'#fff'}:{}}
            onClick={() => setShowSim(!showSim)}
            title="Counterfactual Scenario Simulator"
          >
            🔮 Simulator
          </button>
          <button className="pred-run-btn" onClick={runAll} disabled={running}>
            {running ? '⟳ Running ML…' : '◎ Run all predictions'}
          </button>
        </div>
      </div>

      {showSim && <WhatIfSimulator items={items} />}

      <div className="pred-filter-bar">
        {FILTERS.map(f=>(
          <button key={f.key} className={`pf-btn${filter===f.key?' active':''}`} onClick={()=>setFilter(f.key)}>
            {f.label}
            <span className="pf-count">
              {f.key==='all'      ? items.length :
               f.key==='high_risk'? items.filter(i=>i.expiry_risk==='High'||i.expiry_risk==='Expired').length :
               f.key==='slow'     ? items.filter(i=>i.slow_mover==='Yes').length :
               f.key==='fast'     ? items.filter(i=>i.sales_velocity==='Fast').length :
               items.filter(i=>!i.expiry_risk).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Loading predictions…</div> : (
        <div className="pred-list">
          {filtered.length===0 && <div style={{textAlign:'center',padding:'40px',color:'var(--gray)'}}>No records match this filter</div>}
          {filtered.map((item,idx)=>(
            <PredCard key={item.id} item={{...item,_displayIdx:idx+1}} onPredict={predictOne} />
          ))}
        </div>
      )}
    </div>
  )
}
