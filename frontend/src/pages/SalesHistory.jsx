import { useState, useEffect } from 'react'
import axios from 'axios'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import './SalesHistory.css'
import BarcodeScanner from '../components/BarcodeScanner'

const CATEGORIES = ['Grains & Cereals','Pasta & Noodles','Cooking Oils & Fats','Condiments & Seasonings',
  'Beverages','Snacks & Confectionery','Canned & Packaged Foods','Fresh & Perishable',
  'Personal Care','Baby & Infant','Household Essentials','Other']
const CITIES = ['Lagos','Abuja','Kano','Port Harcourt','Ibadan','Benin City','Kaduna','Aba','Enugu','Onitsha','Warri','Ilorin','Jos','Owerri','Uyo']

const EMPTY_FORM = { product_name:'', category:'Other', store_city:'Lagos', qty_sold:'', unit_price:'', sale_date:'', notes:'', inventory_id:'' }

function StatCard({ label, value, color='var(--green)', icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon" style={{background: color+'18', color}}>{icon}</div>
      <div>
        <div className="stat-val" style={{color}}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  )
}

export default function SalesHistory() {
  const [items,       setItems]       = useState([])
  const [total,       setTotal]       = useState(0)
  const [page,        setPage]        = useState(1)
  const [search,      setSearch]      = useState('')
  const [days,        setDays]        = useState(30)
  const [summary,     setSummary]     = useState({ daily: [], topProducts: [] })
  const [loading,     setLoading]     = useState(true)
  const [modal,       setModal]       = useState(false)
  const [form,        setForm]        = useState(EMPTY_FORM)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [invItems,    setInvItems]    = useState([])
  const [showScanner, setShowScanner] = useState(false)
  const LIMIT = 30

  const loadAll = async () => {
    setLoading(true)
    try {
      const [listRes, summRes] = await Promise.all([
        axios.get('/api/sales-history', { params: { page, limit: LIMIT, product: search } }),
        axios.get('/api/sales-history/summary', { params: { days } }),
      ])
      setItems(listRes.data.items); setTotal(listRes.data.total)
      setSummary(summRes.data)
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [page, search, days])

  const openModal = async () => {
    setForm(EMPTY_FORM); setError(''); setModal(true)
    try {
      const r = await axios.get('/api/inventory', { params: { limit: 200 } })
      setInvItems(r.data.items || [])
    } catch(e) { setInvItems([]) }
  }

  const handleInvSelect = (e) => {
    const id = e.target.value
    const inv = invItems.find(i => String(i.id) === String(id))
    if (inv) {
      setForm(f => ({
        ...f,
        inventory_id:  inv.id,
        product_name:  inv.product_name,
        category:      inv.category || f.category,
        store_city:    inv.store_city || f.store_city,
        unit_price:    inv.unit_price || f.unit_price,
      }))
    } else {
      setForm(f => ({ ...f, inventory_id: '' }))
    }
  }

  const handleScan = (code) => {
    setShowScanner(false)
    setForm(f => ({ ...f, product_name: code }))
  }

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const submit = async () => {
    if (!form.product_name || !form.qty_sold) return setError('Product name and quantity sold are required')
    setSaving(true); setError('')
    try {
      await axios.post('/api/sales-history', form)
      setModal(false); setForm(EMPTY_FORM); loadAll()
    } catch(e) { setError(e.response?.data?.error || 'Failed to log sale') }
    finally    { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this sales record?')) return
    await axios.delete(`/api/sales-history/${id}`)
    loadAll()
  }

  const totalRevenue = summary.daily.reduce((s, d) => s + parseFloat(d.total_revenue || 0), 0)
  const totalQty     = summary.daily.reduce((s, d) => s + parseInt(d.total_qty || 0), 0)
  const avgDaily     = summary.daily.length ? (totalRevenue / summary.daily.length) : 0
  const maxRevenue   = Math.max(...summary.topProducts.map(p => parseFloat(p.total_revenue || 0)), 1)
  const pages        = Math.ceil(total / LIMIT)

  const chartData = summary.daily.map(d => ({
    date:    d.sale_date?.slice(5),
    revenue: Math.round(parseFloat(d.total_revenue || 0)),
    qty:     parseInt(d.total_qty || 0),
  }))

  return (
    <div className="sales-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Sales History</h1>
          <p className="page-sub">Daily sales log across all products</p>
        </div>
        <button className="cta-btn" onClick={openModal}>+ Log sale</button>
      </div>

      <div className="sh-filters" style={{marginBottom:20}}>
        {[7, 14, 30, 90].map(d => (
          <button key={d} className={`day-filter-btn${days===d?' active':''}`} onClick={() => setDays(d)}>
            Last {d} days
          </button>
        ))}
      </div>

      <div className="sales-top-row">
        <StatCard label="Total revenue"  value={'₦'+Number(totalRevenue).toLocaleString()} icon="₦" color="var(--green)" />
        <StatCard label="Units sold"     value={totalQty.toLocaleString()}                  icon="📦" color="var(--green)" />
        <StatCard label="Avg daily rev"  value={'₦'+Math.round(avgDaily).toLocaleString()} icon="📈" color="var(--amber)" />
        <StatCard label="Total entries"  value={total}                                       icon="📋" color="var(--text-2)" />
      </div>

      <div className="sales-charts">
        <div className="chart-card">
          <h3 className="chart-title">Daily revenue — last {days} days</h3>
          {chartData.length === 0
            ? <div style={{textAlign:'center',padding:'40px',color:'var(--gray)',fontSize:13}}>No sales data for this period</div>
            : <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{left:0,right:8}}>
                  <defs>
                    <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{fontSize:10}} />
                  <YAxis tickFormatter={v=>'₦'+Math.round(v/1000)+'k'} tick={{fontSize:10}} width={52} />
                  <Tooltip formatter={v=>['₦'+Number(v).toLocaleString(),'Revenue']} />
                  <Area type="monotone" dataKey="revenue" stroke="var(--green)" fill="url(#rev)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
          }
        </div>

        <div className="chart-card">
          <h3 className="chart-title">Top products</h3>
          {summary.topProducts.length === 0
            ? <div style={{textAlign:'center',padding:'20px',color:'var(--gray)',fontSize:13}}>No data yet</div>
            : <div className="top-products">
                {summary.topProducts.slice(0,8).map((p,i) => (
                  <div key={i} className="tp-row">
                    <div className="tp-name" title={p.product_name}>{p.product_name}</div>
                    <div className="tp-bar-wrap">
                      <div className="tp-bar" style={{width: `${(parseFloat(p.total_revenue)/maxRevenue)*100}%`}} />
                    </div>
                    <div className="tp-rev">₦{Math.round(parseFloat(p.total_revenue)/1000)}k</div>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>

      <div className="sh-filters">
        <input className="filter-input" placeholder="Search products…" value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }} />
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <>
          <div className="sh-table-wrap">
            <table className="sh-table">
              <thead>
                <tr>
                  <th>Product</th><th>Category</th><th>City</th>
                  <th>Qty sold</th><th>Unit price</th><th>Revenue</th>
                  <th>Sale date</th><th>Notes</th><th></th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={9} style={{textAlign:'center',padding:'32px',color:'var(--gray)'}}>No sales records found</td></tr>
                )}
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{fontWeight:500}}>{item.product_name}</td>
                    <td style={{color:'var(--text-2)'}}>{item.category}</td>
                    <td>{item.store_city}</td>
                    <td>{item.qty_sold}</td>
                    <td>₦{Number(item.unit_price||0).toLocaleString()}</td>
                    <td style={{fontWeight:600,color:'var(--green-dk)'}}>₦{Number(item.revenue||0).toLocaleString()}</td>
                    <td>{item.sale_date}</td>
                    <td style={{color:'var(--text-2)'}}>{item.notes || '—'}</td>
                    <td>
                      <button className="td-del" onClick={() => remove(item.id)} title="Delete">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="pager">
              <button className="pg-btn" disabled={page===1} onClick={() => setPage(p=>p-1)}>‹ Prev</button>
              <span className="pg-info">Page {page} of {pages}</span>
              <button className="pg-btn" disabled={page===pages} onClick={() => setPage(p=>p+1)}>Next ›</button>
            </div>
          )}
        </>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <h2 className="modal-title">Log a sale</h2>
            <div className="modal-grid">
              <div className="modal-full">
                <label className="field-label">Link to inventory item <span style={{color:'var(--gray)',fontWeight:400}}>(auto-fills & syncs stock)</span></label>
                <select className="field-input" value={form.inventory_id} onChange={handleInvSelect}>
                  <option value="">— Select inventory item (or type manually below) —</option>
                  {invItems.map(i => (
                    <option key={i.id} value={i.id}>
                      #{i.id} · {i.product_name} · {i.qty_remaining ?? 0} remaining
                    </option>
                  ))}
                </select>
              </div>
              <div className="modal-full">
                <label className="field-label">Product name *</label>
                <div style={{display:'flex', gap:8}}>
                  <input className="field-input" value={form.product_name} onChange={set('product_name')} placeholder="e.g. Indomie Noodles" style={{flex:1}} />
                  <button type="button" onClick={() => setShowScanner(true)}
                    style={{padding:'0 14px',borderRadius:8,border:'1px solid var(--green)',background:'transparent',color:'var(--green)',cursor:'pointer',whiteSpace:'nowrap',fontWeight:600}}>
                    📷 Scan
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Store city</label>
                <select className="field-input" value={form.store_city} onChange={set('store_city')}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Qty sold *</label>
                <input className="field-input" type="number" value={form.qty_sold} onChange={set('qty_sold')} placeholder="20" />
                {form.inventory_id && (() => {
                  const inv = invItems.find(i => String(i.id) === String(form.inventory_id))
                  return inv ? <p style={{fontSize:12,color:'var(--gray)',marginTop:3}}>
                    Currently {inv.qty_remaining ?? 0} units remaining in stock
                  </p> : null
                })()}
              </div>
              <div>
                <label className="field-label">Unit price (₦)</label>
                <input className="field-input" type="number" value={form.unit_price} onChange={set('unit_price')} placeholder="500" />
              </div>
              <div>
                <label className="field-label">Sale date</label>
                <input className="field-input" type="date" value={form.sale_date} onChange={set('sale_date')} />
              </div>
              <div>
                <label className="field-label">Notes</label>
                <input className="field-input" value={form.notes} onChange={set('notes')} placeholder="Optional…" />
              </div>
            </div>
            {form.qty_sold && form.unit_price && (
              <div style={{marginTop:12,fontSize:13,color:'var(--green-dk)',fontWeight:600}}>
                Revenue: ₦{(parseInt(form.qty_sold||0) * parseFloat(form.unit_price||0)).toLocaleString()}
              </div>
            )}
            {error && <div className="as-error" style={{marginTop:12}}>{error}</div>}
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="modal-save" onClick={submit} disabled={saving}>
                {saving ? 'Saving…' : 'Log sale'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
