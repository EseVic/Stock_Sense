import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './ProductDetail.css'
import { formatDaysToExpiry } from '../utils/expiry'

const RISK_COLOR = { Low:'#1B7A5A', Medium:'#C47D0E', High:'#C0392B', Expired:'#7D1A1A' }
const VEL_COLOR  = { Fast:'#1B7A5A', Moderate:'#C47D0E', Slow:'#C0392B' }

function Badge({ label, colorMap }) {
  const color = colorMap?.[label] || '#888'
  return <span className="pd-badge" style={{background:color+'22', color}}>{label||'—'}</span>
}

export default function ProductDetail() {
  const { name }     = useParams()
  const navigate     = useNavigate()
  const [batches,    setBatches]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const decodedName  = decodeURIComponent(name)

  useEffect(() => {
    axios.get('/api/inventory', { params:{ limit:1000, search: decodedName } })
      .then(r => {
        // filter to exact product name
        const exact = (r.data.items||[]).filter(i =>
          i.product_name.toLowerCase() === decodedName.toLowerCase()
        )
        setBatches(exact)
      })
      .catch(() => setBatches([]))
      .finally(() => setLoading(false))
  }, [name])

  if (loading) return <div className="loading">Loading product…</div>
  if (batches.length === 0) return (
    <div className="pd-empty">
      <div style={{fontSize:48}}>📦</div>
      <h2>Product not found</h2>
      <Link to="/inventory" className="pd-back-btn">← Back to inventory</Link>
    </div>
  )

  const latest   = batches[0]
  const category = latest.category
  const totalIn  = batches.reduce((s,b) => s + (parseInt(b.qty_in)||0), 0)
  const totalSold= batches.reduce((s,b) => s + (parseInt(b.qty_sold)||0), 0)
  const totalRem = batches.reduce((s,b) => s + (parseInt(b.qty_remaining)||0), 0)
  const totalRev = batches.reduce((s,b) => s + (parseFloat(b.unit_price)||0)*(parseInt(b.qty_sold)||0), 0)
  const avgRate  = batches.reduce((s,b) => s + (parseFloat(b.weekly_sales_rate)||0), 0) / batches.length

  // restock suggestion
  const weeksLeft = avgRate > 0 ? (totalRem / avgRate).toFixed(1) : null

  // chart data — sell-through rate per batch
  const chartData = [...batches].reverse().map((b, i) => ({
    batch:    `Batch ${i+1}`,
    sold:     parseInt(b.qty_sold)||0,
    remaining:parseInt(b.qty_remaining)||0,
    sellThru: b.sell_through_rate != null ? Math.round(b.sell_through_rate * 100) : 0,
  }))

  return (
    <div className="pd-page">
      {/* back button */}
      <button className="pd-back" onClick={() => navigate(-1)}>← Back</button>

      {/* header */}
      <div className="pd-header">
        <div>
          <h1 className="page-title">{decodedName}</h1>
          <p className="page-sub">{category} · {batches.length} batch{batches.length!==1?'es':''} on record</p>
        </div>
        <div className="pd-badges-row">
          <Badge label={latest.expiry_risk}         colorMap={RISK_COLOR} />
          <Badge label={latest.sales_velocity}      colorMap={VEL_COLOR} />
          <Badge label={latest.customer_preference} colorMap={{High:'#1B7A5A',Medium:'#C47D0E',Low:'#888'}} />
          {latest.slow_mover==='Yes' && <Badge label="Slow mover" colorMap={{['Slow mover']:'#C0392B'}} />}
        </div>
      </div>

      {/* stat cards */}
      <div className="pd-stats">
        <div className="pd-stat-card">
          <div className="pd-stat-val">{totalIn.toLocaleString()}</div>
          <div className="pd-stat-label">Total units received</div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-val">{totalSold.toLocaleString()}</div>
          <div className="pd-stat-label">Total units sold</div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-val" style={{color: totalRem<=5?'var(--red)':'var(--text)'}}>{totalRem.toLocaleString()}</div>
          <div className="pd-stat-label">Units remaining</div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-val">₦{Math.round(totalRev).toLocaleString()}</div>
          <div className="pd-stat-label">Total revenue</div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-val">₦{Number(latest.unit_price||0).toLocaleString()}</div>
          <div className="pd-stat-label">Unit price</div>
        </div>
        <div className="pd-stat-card">
          <div className="pd-stat-val">{avgRate.toFixed(1)}/wk</div>
          <div className="pd-stat-label">Avg weekly sales rate</div>
        </div>
      </div>

      {/* restock suggestion */}
      {weeksLeft !== null && (
        <div className={`restock-box ${parseFloat(weeksLeft) <= 2 ? 'restock-urgent' : parseFloat(weeksLeft) <= 4 ? 'restock-soon' : 'restock-ok'}`}>
          <div className="restock-icon">
            {parseFloat(weeksLeft) <= 2 ? '🚨' : parseFloat(weeksLeft) <= 4 ? '⚠️' : '📦'}
          </div>
          <div className="restock-body">
            <div className="restock-title">Restock suggestion</div>
            <div className="restock-detail">
              At your current sales rate of <strong>{avgRate.toFixed(1)} units/week</strong>, you have approximately{' '}
              <strong>{weeksLeft} week{parseFloat(weeksLeft)!==1?'s':''} of stock left</strong>.
              {parseFloat(weeksLeft) <= 2
                ? ' Restock immediately to avoid running out.'
                : parseFloat(weeksLeft) <= 4
                ? ' Consider placing a restock order soon.'
                : ' Stock levels are currently healthy.'}
            </div>
          </div>
          <Link to="/add-stock" className="restock-btn">+ Add stock</Link>
        </div>
      )}

      {/* sell-through chart */}
      {chartData.length > 1 && (
        <div className="pd-chart-card">
          <h3 className="pd-section-title">Sell-through rate per batch (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{left:0,right:16}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="batch" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} domain={[0,100]} unit="%" />
              <Tooltip formatter={v=>[v+'%','Sell-through']} />
              <Line type="monotone" dataKey="sellThru" stroke="var(--green)" strokeWidth={2} dot={{r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* batch history table */}
      <div className="pd-table-card">
        <h3 className="pd-section-title">Batch history</h3>
        <div className="pd-table-wrap">
          <table className="pd-table">
            <thead>
              <tr>
                <th>#</th><th>Date added</th><th>Qty in</th><th>Sold</th>
                <th>Remaining</th><th>Days to expiry</th><th>Sell-through</th>
                <th>Expiry risk</th><th>Sales speed</th><th>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((b, i) => (
                <tr key={b.id}>
                  <td style={{color:'var(--gray)',fontSize:12}}>{i+1}</td>
                  <td>{b.created_at ? new Date(b.created_at).toLocaleDateString('en-NG') : '—'}</td>
                  <td>{b.qty_in}</td>
                  <td>{b.qty_sold}</td>
                  <td className={b.qty_remaining<=5?'td-urgent':''}>{b.qty_remaining}</td>
                  <td className={b.days_to_expiry<=7?'td-urgent':''}>{formatDaysToExpiry(b.days_to_expiry)}</td>
                  <td>{b.sell_through_rate!=null?Math.round(b.sell_through_rate*100)+'%':'—'}</td>
                  <td>
                    {b.expiry_risk
                      ? <span className="pd-badge" style={{background:RISK_COLOR[b.expiry_risk]+'22',color:RISK_COLOR[b.expiry_risk]}}>{b.expiry_risk}</span>
                      : '—'}
                  </td>
                  <td>
                    {b.sales_velocity
                      ? <span className="pd-badge" style={{background:VEL_COLOR[b.sales_velocity]+'22',color:VEL_COLOR[b.sales_velocity]}}>{b.sales_velocity}</span>
                      : '—'}
                  </td>
                  <td className="pd-rec-cell">{b.recommendation||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
