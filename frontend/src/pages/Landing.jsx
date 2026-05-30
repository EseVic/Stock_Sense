import { useEffect, useRef, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import './Landing.css'

const FEATURES = [
  { icon: '⏰', title: 'Expiry Risk Prediction',     desc: 'Know which products are approaching expiry before it is too late to act. The system flags Low, Medium, High, and Expired risk so you can discount or return stock in time.' },
  { icon: '⚡', title: 'Sales Velocity Tracking',    desc: 'See which products are selling Fast, Moderate, or Slow. Stop restocking things that sit on your shelf and focus your money on what actually moves.' },
  { icon: '👥', title: 'Customer Preference Analysis', desc: 'Find out which products your customers actually want. The system learns from your sales history and tells you what to keep stocking and what to drop.' },
  { icon: '📦', title: 'Slow Mover Detection',       desc: 'Products tying up your capital get flagged automatically. You see exactly what has been sitting too long so you can free up shelf space and cash.' },
]

const STEPS = [
  { num: '01', title: 'Add your stock',          desc: 'Enter products manually or upload a CSV file. If you have a barcode scanner, you can use your phone camera.' },
  { num: '02', title: 'Get predictions',          desc: 'The ML models analyse your inventory and sales data and classify every product across all four risk areas instantly.' },
  { num: '03', title: 'Act on recommendations',  desc: 'Each product comes with a plain-language recommendation telling you exactly what to do — no guesswork.' },
]

const SAMPLE = [
  { name: 'Rice 50kg',       expiry: 'LOW',    velocity: 'FAST',     pref: 'HIGH',   rec: 'Stock up — selling well, no expiry risk' },
  { name: 'Tomato Paste',    expiry: 'HIGH',   velocity: 'SLOW',     pref: 'LOW',    rec: 'Discount now — expiry approaching' },
  { name: 'Cooking Oil 5L',  expiry: 'MEDIUM', velocity: 'MODERATE', pref: 'MEDIUM', rec: 'Monitor stock levels this week' },
  { name: 'Biscuits (pack)', expiry: 'HIGH',   velocity: 'SLOW',     pref: 'LOW',    rec: 'Remove or discount urgently' },
]

// ── read dark pref from localStorage so it persists across pages ──
function getInitialDark() {
  try { return localStorage.getItem('ss_dark') === 'true' } catch { return false }
}

export default function Landing() {
  const [visible,  setVisible]  = useState({})
  const [menuOpen, setMenuOpen] = useState(false)
  const [dark,     setDark]     = useState(getInitialDark)
  const [scrolled, setScrolled] = useState(false)
  const [showTop,  setShowTop]  = useState(false)
  const refs = useRef({})

  // ── apply dark class to <html> and save to localStorage ──
  useEffect(() => {
    document.documentElement.classList.toggle('app-dark', dark)
    try { localStorage.setItem('ss_dark', dark) } catch {}
  }, [dark])

  // ── scroll listener: nav shadow + back-to-top button ──
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 10)
      setShowTop(window.scrollY > 400)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── intersection observer for fade-in cards ──
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) setVisible(v => ({ ...v, [e.target.dataset.key]: true }))
      }),
      { threshold: 0.12 }
    )
    Object.values(refs.current).forEach(el => el && obs.observe(el))
    return () => obs.disconnect()
  }, [])

  const ref = key => el => { refs.current[key] = el; if (el) el.dataset.key = key }

  // ── smooth scroll helper ──
  const scrollTo = useCallback((id, e) => {
    e?.preventDefault()
    setMenuOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // ── close mobile menu on outside click ──
  useEffect(() => {
    if (!menuOpen) return
    const close = e => { if (!e.target.closest('.land-nav-inner')) setMenuOpen(false) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [menuOpen])

  const toggleDark = () => setDark(d => !d)

  return (
    <div className="land">

      {/* ── NAV — sticky, always visible, shadow appears on scroll ── */}
      <nav className={`land-nav${scrolled ? ' land-nav--scrolled' : ''}`}>
        <div className="land-nav-inner">

          <div className="land-brand">
            <div className="land-logo">S</div>
            <span>StockSense</span>
          </div>

          <div className="land-nav-links">
            <a href="#features" onClick={e => scrollTo('features', e)}>Features</a>
            <a href="#how"      onClick={e => scrollTo('how', e)}>How it works</a>
            <a href="#preview"  onClick={e => scrollTo('preview', e)}>Preview</a>
          </div>

          <div className="land-nav-right">
            <button className="nav-icon-btn" onClick={toggleDark} aria-label="Toggle dark mode" title={dark ? 'Light mode' : 'Dark mode'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <div className="land-nav-cta">
              <Link to="/login"    className="btn-ghost">Sign in</Link>
              <Link to="/register" className="btn-solid">Get started free</Link>
            </div>
            <button
              className={`hamburger${menuOpen ? ' hamburger--open' : ''}`}
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>

        {/* mobile drawer */}
        <div className={`mobile-menu${menuOpen ? ' mobile-menu--open' : ''}`}>
          <a href="#features" onClick={e => scrollTo('features', e)}>Features</a>
          <a href="#how"      onClick={e => scrollTo('how', e)}>How it works</a>
          <a href="#preview"  onClick={e => scrollTo('preview', e)}>Preview</a>
          <hr className="mobile-divider" />
          <Link to="/login"    onClick={() => setMenuOpen(false)}>Sign in</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} className="mobile-cta">Get started free</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="land-hero" id="top">
        <div className="hero-bg-grid" />
        <div className="hero-bg-glow" />
        <div className="land-hero-inner">
          <div className="hero-badge">Built for Nigerian retail</div>
          <h1 className="hero-h1">
            Stop finding out about<br />
            <span className="hero-accent">inventory problems</span><br />
            after the damage is done
          </h1>
          <p className="hero-sub">
            StockSense uses machine learning to predict expiry risk, flag slow movers,
            track sales velocity, and understand customer preferences — all from the
            inventory and sales data your shop already has.
          </p>
          <div className="hero-btns">
            <Link to="/register" className="btn-solid btn-lg">Start for free</Link>
            <a href="#how" onClick={e => scrollTo('how', e)} className="btn-outline btn-lg">See how it works</a>
          </div>
          <div className="hero-stats">
            {[['4','Prediction areas'],['80%+','Model accuracy'],['132','Products covered'],['15','Nigerian cities']].map(([n,l]) => (
              <div key={l} className="hero-stat">
                <span className="stat-num">{n}</span>
                <span className="stat-lbl">{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="land-section" id="features">
        <div className="land-inner">
          <div className="section-label">What it does</div>
          <h2 className="section-h2">Four predictions. One dashboard.</h2>
          <p className="section-sub">Every time you add stock, StockSense classifies your products across four areas and tells you exactly what action to take.</p>
          <div className="features-grid">
            {FEATURES.map((f, i) => (
              <div key={f.title} ref={ref(`feat-${i}`)}
                className={`feat-card ${visible[`feat-${i}`] ? 'fade-up' : 'fade-pre'}`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="feat-icon">{f.icon}</div>
                <h3 className="feat-title">{f.title}</h3>
                <p className="feat-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="land-section land-section-dark" id="how">
        <div className="land-inner">
          <div className="section-label section-label-lt">How it works</div>
          <h2 className="section-h2 section-h2-lt">From raw stock data to clear decisions</h2>
          <div className="steps-wrap">
            {STEPS.map((s, i) => (
              <div key={s.num} ref={ref(`step-${i}`)}
                className={`step-card ${visible[`step-${i}`] ? 'fade-up' : 'fade-pre'}`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="step-num">{s.num}</div>
                <div className="step-line" />
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PREVIEW ── */}
      <section className="land-section" id="preview">
        <div className="land-inner">
          <div className="section-label">Live preview</div>
          <h2 className="section-h2">This is what your results look like</h2>
          <p className="section-sub">Every product gets a colour-coded label across all four prediction areas plus a plain-language recommendation.</p>
          <div ref={ref('table')} className={`preview-wrap ${visible['table'] ? 'fade-up' : 'fade-pre'}`}>
            <div className="preview-bar">
              <span className="preview-dot" style={{ background: '#ff5f57' }} />
              <span className="preview-dot" style={{ background: '#ffbd2e' }} />
              <span className="preview-dot" style={{ background: '#28c840' }} />
              <span className="preview-title">StockSense — Predictions</span>
            </div>
            <div className="preview-table-wrap">
              <table className="preview-table">
                <thead>
                  <tr><th>Product</th><th>Expiry Risk</th><th>Sales Speed</th><th>Customer Pref</th><th>Recommendation</th></tr>
                </thead>
                <tbody>
                  {SAMPLE.map(r => (
                    <tr key={r.name}>
                      <td className="pt-name">{r.name}</td>
                      <td><span className={`badge ${r.expiry==='LOW'?'badge-low':r.expiry==='MEDIUM'?'badge-med':'badge-high'}`}>{r.expiry}</span></td>
                      <td><span className={`badge ${r.velocity==='FAST'?'badge-low':r.velocity==='MODERATE'?'badge-med':'badge-high'}`}>{r.velocity}</span></td>
                      <td><span className={`badge ${r.pref==='HIGH'?'badge-low':r.pref==='MEDIUM'?'badge-med':'badge-high'}`}>{r.pref}</span></td>
                      <td className="pt-rec">{r.rec}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="land-cta">
        <div className="cta-glow" />
        <div className="land-inner land-inner-cta">
          <h2 className="cta-h2">Ready to stop guessing?</h2>
          <p className="cta-sub">Create a free account, add your stock, and get your first predictions in minutes. No technical knowledge needed.</p>
          <div className="hero-btns">
            <Link to="/register" className="btn-solid btn-lg">Create free account</Link>
            <Link to="/login"    className="btn-outline btn-lg">Sign in</Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="land-footer">
        <div className="land-inner land-inner-footer">
          <div className="footer-brand">
            <div className="land-logo land-logo-sm">S</div>
            <span>StockSense</span>
          </div>
          <p className="footer-copy">Built for small retail businesses in Nigeria. MIT Project — Miva Open University, 2026.</p>
        </div>
      </footer>

      {/* ── BACK TO TOP ── */}
      <button
        className={`back-top${showTop ? ' back-top--show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        title="Back to top"
      >↑</button>

    </div>
  )
}
