import { useState, useEffect } from 'react'
import axios from 'axios'
import './Suppliers.css'

const CATEGORIES = ['Grains & Cereals','Pasta & Noodles','Cooking Oils & Fats','Condiments & Seasonings',
  'Beverages','Snacks & Confectionery','Canned & Packaged Foods','Fresh & Perishable',
  'Personal Care','Baby & Infant','Household Essentials','Other']

const CITIES = ['Lagos','Abuja','Kano','Port Harcourt','Ibadan','Benin City','Kaduna','Aba','Enugu','Onitsha','Warri','Ilorin','Jos','Owerri','Uyo']

const EMPTY = { name:'', contact_name:'', phone:'', email:'', city:'Lagos', address:'', category:'Other', notes:'' }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  const load = async () => {
    setLoading(true)
    try { const r = await axios.get('/api/suppliers'); setSuppliers(r.data) }
    catch(e) { console.error(e) }
    finally  { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setError(''); setModal(true) }
  const openEdit   = (s)  => { setEditing(s); setForm({ ...s }); setError(''); setModal(true) }
  const closeModal = ()   => setModal(false)

  const set = k => e => setForm({ ...form, [k]: e.target.value })

  const save = async () => {
    if (!form.name) return setError('Supplier name is required')
    setSaving(true); setError('')
    try {
      if (editing) await axios.put(`/api/suppliers/${editing.id}`, form)
      else         await axios.post('/api/suppliers', form)
      closeModal(); load()
    } catch(e) { setError(e.response?.data?.error || 'Save failed') }
    finally    { setSaving(false) }
  }

  const remove = async (id) => {
    if (!confirm('Delete this supplier?')) return
    await axios.delete(`/api/suppliers/${id}`)
    load()
  }

  return (
    <div className="suppliers-page">
      <div className="page-hd">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-sub">{suppliers.length} supplier{suppliers.length !== 1 ? 's' : ''} on record</p>
        </div>
        <button className="cta-btn" onClick={openCreate}>+ Add supplier</button>
      </div>

      {loading ? <div className="loading">Loading…</div> : suppliers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏭</div>
          <h3>No suppliers yet</h3>
          <p>Add your suppliers so you can link them to purchase orders.</p>
          <button className="cta-btn" onClick={openCreate}>Add first supplier</button>
        </div>
      ) : (
        <div className="sup-grid">
          {suppliers.map(s => (
            <div key={s.id} className="sup-card">
              <div className="sup-card-top">
                <div className="sup-name">{s.name}</div>
                {s.category && <span className="sup-category">{s.category}</span>}
              </div>
              <div className="sup-info">
                {s.contact_name && <div className="sup-row">👤 <span>{s.contact_name}</span></div>}
                {s.phone        && <div className="sup-row">📞 <span>{s.phone}</span></div>}
                {s.email        && <div className="sup-row">✉️ <span>{s.email}</span></div>}
                {s.city         && <div className="sup-row">📍 <span>{s.city}</span></div>}
                {s.notes        && <div className="sup-row">📝 <span>{s.notes}</span></div>}
              </div>
              <div className="sup-actions">
                <button className="sup-edit-btn" onClick={() => openEdit(s)}>Edit</button>
                <button className="sup-del-btn"  onClick={() => remove(s.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <h2 className="modal-title">{editing ? 'Edit supplier' : 'Add supplier'}</h2>
            <div className="modal-grid">
              <div className="modal-full">
                <label className="field-label">Supplier name *</label>
                <input className="field-input" value={form.name} onChange={set('name')} placeholder="e.g. Dangote Flour Mills" />
              </div>
              <div>
                <label className="field-label">Contact person</label>
                <input className="field-input" value={form.contact_name} onChange={set('contact_name')} placeholder="Aminu Bello" />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field-input" value={form.phone} onChange={set('phone')} placeholder="0801 234 5678" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" type="email" value={form.email} onChange={set('email')} placeholder="supplier@example.com" />
              </div>
              <div>
                <label className="field-label">City</label>
                <select className="field-input" value={form.city} onChange={set('city')}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category} onChange={set('category')}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="modal-full">
                <label className="field-label">Address</label>
                <input className="field-input" value={form.address} onChange={set('address')} placeholder="14 Industrial Avenue, Apapa" />
              </div>
              <div className="modal-full">
                <label className="field-label">Notes</label>
                <input className="field-input" value={form.notes} onChange={set('notes')} placeholder="Any extra info…" />
              </div>
            </div>
            {error && <div className="as-error" style={{marginTop:12}}>{error}</div>}
            <div className="modal-footer">
              <button className="modal-cancel" onClick={closeModal}>Cancel</button>
              <button className="modal-save" onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Add supplier'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
