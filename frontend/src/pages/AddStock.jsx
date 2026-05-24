import { useState } from 'react'
import axios from 'axios'
import './AddStock.css'
import BarcodeScanner from '../components/BarcodeScanner'

const CATEGORIES = ['Grains & Cereals','Pasta & Noodles','Cooking Oils & Fats','Condiments & Seasonings',
  'Beverages','Snacks & Confectionery','Canned & Packaged Foods','Fresh & Perishable',
  'Personal Care','Baby & Infant','Household Essentials','Other']

const CITIES = ['Lagos','Abuja','Kano','Port Harcourt','Ibadan','Benin City','Kaduna','Aba','Enugu','Onitsha','Warri','Ilorin','Jos','Owerri','Uyo']

const EMPTY = { product_name:'', category:'Grains & Cereals', qty_in:'', qty_sold:'', qty_damaged:'0',
  qty_adjusted:'0', unit_price:'', restock_date:'', expiry_date:'', shelf_life_days:'',
  purchase_frequency:'1', restock_count:'1', store_city:'Lagos' }

export default function AddStock() {
  const [tab,         setTab]        = useState('manual')
  const [form,        setForm]       = useState(EMPTY)
  const [rows,        setRows]       = useState([])
  const [result,      setResult]     = useState(null)
  const [error,       setError]      = useState('')
  const [loading,     setLoading]    = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const set = k => e => setForm({...form, [k]: e.target.value})

  const handleScan = (code) => {
    setShowScanner(false)
    setForm(f => ({ ...f, product_name: code }))
  }

  const addToQueue = () => {
    if (!form.product_name || !form.qty_in) return setError('Product name and quantity in are required')
    setRows([...rows, {...form}]); setForm(EMPTY); setError('')
  }

  const removeRow = i => setRows(rows.filter((_,idx)=>idx!==i))

  const submitAll = async () => {
    const payload = rows.length ? rows : (form.product_name ? [form] : [])
    if (!payload.length) return setError('Add at least one product first')
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await axios.post('/api/inventory', payload)
      setResult(r.data); setRows([]); setForm(EMPTY)
    } catch(e) { setError(e.response?.data?.error||'Submission failed') }
    finally    { setLoading(false) }
  }

  const handleCSV = e => {
    const file = e.target.files[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const lines = ev.target.result.split('\n').filter(Boolean)
      const headers = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/ /g,'_'))
      const parsed = lines.slice(1).map(line=>{
        const vals = line.split(',')
        const obj = {}
        headers.forEach((h,i)=>{ obj[h]=vals[i]?.trim()||'' })
        return obj
      }).filter(r=>r.product_name)
      setRows(parsed); setError('')
    }
    reader.readAsText(file)
  }

  return (
    <div className="add-stock">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Add Stock</h1>
          <p className="page-sub">Enter inventory records to get ML predictions</p>
        </div>
      </div>

      <div className="as-tabs">
        {['manual','csv'].map(t=>(
          <button key={t} className={`as-tab${tab===t?' active':''}`} onClick={()=>setTab(t)}>
            {t==='manual' ? '✏️ Manual entry' : '📄 Upload CSV'}
          </button>
        ))}
      </div>

      {tab==='manual' && (
        <div className="as-form-wrap">
          <div className="as-form">
            <h3 className="form-section-title">Product details</h3>
            <div className="form-grid">
              <div className="fg-2">
                <label className="field-label">Product name *</label>
                <div style={{display:'flex', gap:8}}>
                  <input className="field-input" value={form.product_name} onChange={set('product_name')} placeholder="e.g. Rice 50kg" style={{flex:1}} />
                  <button type="button" onClick={() => setShowScanner(true)}
                    style={{padding:'0 14px',borderRadius:8,border:'1px solid var(--green)',background:'transparent',color:'var(--green)',cursor:'pointer',whiteSpace:'nowrap',fontWeight:600}}>
                    📷 Scan
                  </button>
                </div>
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Unit price (₦) *</label>
                <input className="field-input" type="number" value={form.unit_price} onChange={set('unit_price')} placeholder="62000" />
              </div>
              <div>
                <label className="field-label">Quantity in *</label>
                <input className="field-input" type="number" value={form.qty_in} onChange={set('qty_in')} placeholder="50" />
              </div>
              <div>
                <label className="field-label">Quantity sold</label>
                <input className="field-input" type="number" value={form.qty_sold} onChange={set('qty_sold')} placeholder="30" />
              </div>
              <div>
                <label className="field-label">Qty damaged</label>
                <input className="field-input" type="number" value={form.qty_damaged} onChange={set('qty_damaged')} placeholder="0" />
              </div>
              <div>
                <label className="field-label">Qty adjusted</label>
                <input className="field-input" type="number" value={form.qty_adjusted} onChange={set('qty_adjusted')} placeholder="0" />
              </div>
              <div>
                <label className="field-label">Restock date</label>
                <input className="field-input" type="date" value={form.restock_date} onChange={set('restock_date')} />
              </div>
              <div>
                <label className="field-label">Expiry date</label>
                <input className="field-input" type="date" value={form.expiry_date} onChange={set('expiry_date')} />
              </div>
              <div>
                <label className="field-label">Shelf life (days)</label>
                <input className="field-input" type="number" value={form.shelf_life_days} onChange={set('shelf_life_days')} placeholder="365" />
              </div>
              <div>
                <label className="field-label">Store city</label>
                <select className="field-input" value={form.store_city} onChange={set('store_city')}>
                  {CITIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {error && <div className="as-error">{error}</div>}

            <div className="as-actions">
              <button className="as-add-btn" onClick={addToQueue}>+ Add to queue</button>
              <button className="as-submit-btn" onClick={submitAll} disabled={loading}>
                {loading ? 'Saving & predicting…' : `Save & predict${rows.length>0?` (${rows.length} queued)`:''}`}
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="as-queue">
              <h3 className="form-section-title">Queue ({rows.length})</h3>
              <div className="queue-list">
                {rows.map((r,i)=>(
                  <div key={i} className="queue-item">
                    <div>
                      <div className="qi-name">{r.product_name}</div>
                      <div className="qi-detail">{r.category} · ₦{Number(r.unit_price||0).toLocaleString()} · {r.qty_in} units in</div>
                    </div>
                    <button className="qi-remove" onClick={()=>removeRow(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab==='csv' && (
        <div className="csv-wrap">
          <div className="csv-box">
            <div className="csv-icon">📄</div>
            <p className="csv-title">Upload your inventory CSV</p>
            <p className="csv-sub">Required columns: product_name, qty_in, qty_sold, unit_price, expiry_date, shelf_life_days</p>
            <label className="csv-btn">
              Choose file
              <input type="file" accept=".csv" onChange={handleCSV} style={{display:'none'}} />
            </label>
            <p className="csv-hint">You can also export your cleaned dataset (03_inventory_cleaned.csv) and upload it here</p>
          </div>
          {rows.length > 0 && (
            <div className="csv-preview">
              <div className="csv-preview-hd">
                <span>{rows.length} rows loaded from CSV</span>
                <button className="as-submit-btn" onClick={submitAll} disabled={loading}>
                  {loading ? 'Processing…' : 'Save all & predict'}
                </button>
              </div>
              <div className="preview-table-wrap">
                <table className="preview-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Qty in</th><th>Qty sold</th><th>Unit price</th></tr></thead>
                  <tbody>{rows.slice(0,10).map((r,i)=>(
                    <tr key={i}>
                      <td>{r.product_name}</td>
                      <td>{r.category||'—'}</td>
                      <td>{r.qty_in}</td>
                      <td>{r.qty_sold||'—'}</td>
                      <td>{r.unit_price ? '₦'+Number(r.unit_price).toLocaleString() : '—'}</td>
                    </tr>
                  ))}</tbody>
                </table>
                {rows.length>10 && <p className="preview-more">…and {rows.length-10} more rows</p>}
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="as-result">
          <h3>✅ {result.saved} record{result.saved!==1?'s':''} saved successfully</h3>
          {result.items?.[0]?.expiry_risk && (
            <p>Predictions generated. View them in the <a href="/predictions">Predictions</a> page.</p>
          )}
          {!result.items?.[0]?.expiry_risk && (
            <p>Records saved. Start the ML service to generate predictions.</p>
          )}
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
