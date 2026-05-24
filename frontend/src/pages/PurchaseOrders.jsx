import { useState, useEffect } from 'react'
import axios from 'axios'
import './PurchaseOrders.css'

const CATEGORIES = ['Grains & Cereals','Pasta & Noodles','Cooking Oils & Fats','Condiments & Seasonings',
  'Beverages','Snacks & Confectionery','Canned & Packaged Foods','Fresh & Perishable',
  'Personal Care','Baby & Infant','Household Essentials','Other']

const CITIES = ['Lagos','Abuja','Kano','Port Harcourt','Ibadan','Benin City','Kaduna','Aba','Enugu','Onitsha','Warri','Ilorin','Jos','Owerri','Uyo']

const EMPTY_FORM = { product_name:'', category:'Other', quantity:'', unit_price:'', supplier_id:'', order_date:'', expected_date:'', notes:'' }

function StatusBadge({ status }) {
  return <span className={`status-badge status-${status}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
}

export default function PurchaseOrders() {
  const [items,        setItems]        = useState([])
  const [total,        setTotal]        = useState(0)
  const [page,         setPage]         = useState(1)
  const [tab,          setTab]          = useState('all')
  const [suppliers,    setSuppliers]    = useState([])
  const [loading,      setLoading]      = useState(true)
  const [modal,        setModal]        = useState(false)
  const [statusModal,  setStatusModal]  = useState(null)
  const [expiryModal,  setExpiryModal]  = useState(null)   // NEW: expiry prompt
  const [form,         setForm]         = useState(EMPTY_FORM)
  const [statusForm,   setStatusForm]   = useState({ status:'received', received_date:'', notes:'' })
  const [expiryForm,   setExpiryForm]   = useState({ expiry_date:'', store_city:'Lagos' })  // NEW
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [successMsg,   setSuccessMsg]   = useState('')
  const LIMIT = 20

  const load = async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (tab !== 'all') params.status = tab
      const [ordersRes, suppRes] = await Promise.all([
        axios.get('/api/purchase-orders', { params }),
        axios.get('/api/suppliers'),
      ])
      setItems(ordersRes.data.items); setTotal(ordersRes.data.total)
      setSuppliers(suppRes.data)
    } catch(e) { console.error(e) }
    finally    { setLoading(false) }
  }

  useEffect(() => { load() }, [page, tab])

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const submitOrder = async () => {
    if (!form.product_name || !form.quantity) return setError('Product name and quantity are required')
    setSaving(true); setError('')
    try {
      await axios.post('/api/purchase-orders', form)
      setModal(false); setForm(EMPTY_FORM); load()
    } catch(e) { setError(e.response?.data?.error || 'Failed to create order') }
    finally    { setSaving(false) }
  }

  const openStatusModal = (item) => {
    setStatusModal(item)
    setStatusForm({ status: item.status === 'pending' ? 'received' : item.status, received_date: '', notes: '' })
  }

  // Step 1: user clicks "Update status" — if marking received, open expiry prompt first
  const handleStatusSubmit = async () => {
    if (statusForm.status === 'received') {
      // Close status modal, open expiry prompt
      setStatusModal(null)
      setExpiryModal({ order: statusModal, statusForm: { ...statusForm } })
      setExpiryForm({ expiry_date: '', store_city: 'Lagos' })
    } else {
      // Cancelled — just update directly
      await doUpdateStatus(statusModal, statusForm, null)
    }
  }

  // Step 2: user fills expiry info → final update
  const handleExpirySubmit = async () => {
    if (!expiryModal) return
    setSaving(true)
    await doUpdateStatus(expiryModal.order, expiryModal.statusForm, expiryForm)
    setExpiryModal(null)
  }

  const doUpdateStatus = async (order, sForm, eForm) => {
    setSaving(true)
    try {
      const payload = {
        ...sForm,
        ...(eForm ? { expiry_date: eForm.expiry_date || null, store_city: eForm.store_city || 'Lagos' } : {}),
      }
      const res = await axios.patch(`/api/purchase-orders/${order.id}`, payload)
      if (res.data.inventory_item) {
        setSuccessMsg(`✅ "${order.product_name}" marked received and automatically added to your inventory with ML prediction applied.`)
        setTimeout(() => setSuccessMsg(''), 6000)
      }
      load()
    } catch(e) { console.error(e) }
    finally    { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this order?')) return
    await axios.delete(`/api/purchase-orders/${id}`)
    load()
  }

  const pending   = items.filter(i => i.status === 'pending').length
  const received  = items.filter(i => i.status === 'received').length
  const totalCost = items.reduce((s, i) => s + parseFloat(i.total_cost || 0), 0)
  const pages     = Math.ceil(total / LIMIT)

  return (
    <div className="po-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-sub">{total} total orders</p>
        </div>
        <button className="cta-btn" onClick={() => { setForm(EMPTY_FORM); setError(''); setModal(true) }}>
          + New order
        </button>
      </div>

      {successMsg && (
        <div style={{background:'#e6f4ee',border:'1px solid #2ecc71',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#1a7a4a',fontSize:14}}>
          {successMsg}
        </div>
      )}

      <div className="summary-row">
        <div className="summary-card">
          <div className="summary-val" style={{color:'var(--amber)'}}>{pending}</div>
          <div className="summary-label">Pending orders</div>
        </div>
        <div className="summary-card">
          <div className="summary-val" style={{color:'var(--green)'}}>{received}</div>
          <div className="summary-label">Received orders</div>
        </div>
        <div className="summary-card">
          <div className="summary-val">₦{Number(totalCost).toLocaleString()}</div>
          <div className="summary-label">Total order value</div>
        </div>
      </div>

      <div className="status-tabs">
        {[['all','All'],['pending','Pending'],['received','Received'],['cancelled','Cancelled']].map(([key, label]) => (
          <button key={key} className={`status-tab${tab===key?' active':''}`} onClick={() => { setTab(key); setPage(1) }}>
            {label}
            <span className="tab-count">
              {key==='all' ? total : items.filter(i=>i.status===key).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? <div className="loading">Loading…</div> : (
        <>
          <div className="po-table-wrap">
            <table className="po-table">
              <thead>
                <tr>
                  <th>#</th><th>Product</th><th>Category</th><th>Supplier</th>
                  <th>Qty</th><th>Unit price</th><th>Total</th>
                  <th>Order date</th><th>Expected</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={11} style={{textAlign:'center',padding:'32px',color:'var(--gray)'}}>No orders found</td></tr>
                )}
                {items.map((item, idx) => (
                  <tr key={item.id}>
                    <td style={{color:'var(--gray)',fontSize:12}}>{(page-1)*LIMIT + idx + 1}</td>
                    <td style={{fontWeight:500}}>{item.product_name}</td>
                    <td style={{color:'var(--text-2)'}}>{item.category}</td>
                    <td>{item.supplier_name || '—'}</td>
                    <td>{item.quantity}</td>
                    <td>₦{Number(item.unit_price||0).toLocaleString()}</td>
                    <td style={{fontWeight:600}}>₦{Number(item.total_cost||0).toLocaleString()}</td>
                    <td>{item.order_date}</td>
                    <td>{item.expected_date || '—'}</td>
                    <td><StatusBadge status={item.status} /></td>
                    <td>
                      <div className="po-actions">
                        {item.status === 'pending' && (
                          <button className="po-action-btn" onClick={() => openStatusModal(item)}>Update</button>
                        )}
                        <button className="po-action-btn po-action-del" onClick={() => remove(item.id)}>✕</button>
                      </div>
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

      {/* Create Order Modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal-box">
            <h2 className="modal-title">New purchase order</h2>
            <div className="modal-grid">
              <div className="modal-full">
                <label className="field-label">Product name *</label>
                <input className="field-input" value={form.product_name} onChange={set('product_name')} placeholder="e.g. Dangote Flour 50kg" />
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Supplier</label>
                <select className="field-input" value={form.supplier_id} onChange={set('supplier_id')}>
                  <option value="">— None —</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Quantity *</label>
                <input className="field-input" type="number" value={form.quantity} onChange={set('quantity')} placeholder="100" />
              </div>
              <div>
                <label className="field-label">Unit price (₦)</label>
                <input className="field-input" type="number" value={form.unit_price} onChange={set('unit_price')} placeholder="5000" />
              </div>
              <div>
                <label className="field-label">Order date</label>
                <input className="field-input" type="date" value={form.order_date} onChange={set('order_date')} />
              </div>
              <div>
                <label className="field-label">Expected delivery</label>
                <input className="field-input" type="date" value={form.expected_date} onChange={set('expected_date')} />
              </div>
              <div className="modal-full">
                <label className="field-label">Notes</label>
                <input className="field-input" value={form.notes} onChange={set('notes')} placeholder="Optional notes…" />
              </div>
            </div>
            {form.quantity && form.unit_price && (
              <div style={{marginTop:12,fontSize:13,color:'var(--green-dk)',fontWeight:600}}>
                Total: ₦{(parseInt(form.quantity||0) * parseFloat(form.unit_price||0)).toLocaleString()}
              </div>
            )}
            {error && <div className="as-error" style={{marginTop:12}}>{error}</div>}
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setModal(false)}>Cancel</button>
              <button className="modal-save" onClick={submitOrder} disabled={saving}>
                {saving ? 'Saving…' : 'Create order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setStatusModal(null)}>
          <div className="modal-box">
            <h2 className="modal-title">Update order status</h2>
            <p style={{fontSize:13,color:'var(--text-2)',marginBottom:18}}>
              Updating: <strong>{statusModal.product_name}</strong>
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="field-label">New status</label>
                <select className="field-input" value={statusForm.status}
                  onChange={e => setStatusForm({...statusForm, status: e.target.value})}>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              {statusForm.status === 'received' && (
                <div>
                  <label className="field-label">Received date</label>
                  <input className="field-input" type="date" value={statusForm.received_date}
                    onChange={e => setStatusForm({...statusForm, received_date: e.target.value})} />
                </div>
              )}
              <div>
                <label className="field-label">Notes</label>
                <input className="field-input" value={statusForm.notes}
                  onChange={e => setStatusForm({...statusForm, notes: e.target.value})}
                  placeholder="Optional notes…" />
              </div>
            </div>
            {statusForm.status === 'received' && (
              <div style={{marginTop:14,padding:'10px 14px',background:'#e8f4fd',borderRadius:8,fontSize:13,color:'#1a5f8a'}}>
                📦 Marking as received will automatically add this product to your inventory. You'll be asked for the expiry date next.
              </div>
            )}
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setStatusModal(null)}>Cancel</button>
              <button className="modal-save" onClick={handleStatusSubmit} disabled={saving}>
                {statusForm.status === 'received' ? 'Next: Set expiry →' : (saving ? 'Saving…' : 'Update status')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expiry Date Prompt Modal (shown after choosing "received") */}
      {expiryModal && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h2 className="modal-title">📦 Almost done — one more step</h2>
            <p style={{fontSize:14,color:'var(--text-2)',marginBottom:18}}>
              <strong>{expiryModal.order.product_name}</strong> ({expiryModal.order.quantity} units) will be added to your inventory automatically.
              Please provide the details below.
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div>
                <label className="field-label">Expiry date <span style={{color:'var(--gray)',fontWeight:400}}>(optional but recommended)</span></label>
                <input className="field-input" type="date" value={expiryForm.expiry_date}
                  onChange={e => setExpiryForm({...expiryForm, expiry_date: e.target.value})} />
                <p style={{fontSize:12,color:'var(--gray)',marginTop:4}}>Leave blank if the product has no expiry date.</p>
              </div>
              <div>
                <label className="field-label">Store / city</label>
                <select className="field-input" value={expiryForm.store_city}
                  onChange={e => setExpiryForm({...expiryForm, store_city: e.target.value})}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-cancel" onClick={() => setExpiryModal(null)}>Cancel</button>
              <button className="modal-save" onClick={handleExpirySubmit} disabled={saving}>
                {saving ? 'Adding to inventory…' : '✅ Confirm & Add to Inventory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
