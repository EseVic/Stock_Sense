import { useEffect, useRef, useState } from 'react'

/**
 * BarcodeScanner component
 * - Uses camera if available (works great on mobile)
 * - Falls back to manual entry on desktop without webcam
 * Props:
 *   onScan(result)  — called with the scanned/entered barcode string
 *   onClose()       — called when user closes the scanner
 */
export default function BarcodeScanner({ onScan, onClose }) {
  const [mode,       setMode]       = useState('detecting') // detecting | camera | manual | nocamera
  const [manualCode, setManualCode] = useState('')
  const [error,      setError]      = useState('')
  const scannerRef  = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    // Check if camera is available
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setMode('nocamera')
      return
    }

    // Try to start camera
    let html5QrCode = null
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!containerRef.current) return
      html5QrCode = new Html5Qrcode('barcode-scanner-view')
      scannerRef.current = html5QrCode

      html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          html5QrCode.stop().catch(() => {})
          onScan(decodedText)
        },
        () => {}
      )
      .then(() => setMode('camera'))
      .catch(() => {
        // No camera or permission denied
        setMode('nocamera')
      })
    }).catch(() => setMode('nocamera'))

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  const submitManual = () => {
    if (!manualCode.trim()) return setError('Please enter a barcode or product name')
    onScan(manualCode.trim())
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.75)',
      display:'flex', alignItems:'center', justifyContent:'center',
      zIndex:9999, padding:16
    }}>
      <div style={{
        background:'#fff', borderRadius:16, padding:24,
        width:'100%', maxWidth:440,
      }}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700}}>
            {mode === 'camera' ? '📷 Scan Barcode / QR Code' : '🔢 Enter Barcode'}
          </h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}}>✕</button>
        </div>

        {/* Tab switcher */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          <button
            onClick={() => setMode('camera')}
            style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid',
              borderColor: mode==='camera'?'var(--green)':'#ddd',
              background: mode==='camera'?'var(--green)':'#fff',
              color: mode==='camera'?'#fff':'#555',
              cursor:'pointer',fontSize:13,fontWeight:600}}
          >
            📷 Camera scan
          </button>
          <button
            onClick={() => setMode('manual')}
            style={{flex:1,padding:'8px',borderRadius:8,border:'1px solid',
              borderColor: mode==='manual'||mode==='nocamera'?'var(--green)':'#ddd',
              background: mode==='manual'||mode==='nocamera'?'var(--green)':'#fff',
              color: mode==='manual'||mode==='nocamera'?'#fff':'#555',
              cursor:'pointer',fontSize:13,fontWeight:600}}
          >
            ⌨️ Type manually
          </button>
        </div>

        {/* Camera view */}
        {mode === 'camera' && (
          <div>
            <p style={{fontSize:13,color:'#888',marginBottom:10,textAlign:'center'}}>
              Point your camera at the barcode or QR code
            </p>
            <div
              ref={containerRef}
              id="barcode-scanner-view"
              style={{width:'100%',borderRadius:10,overflow:'hidden',minHeight:220,background:'#111'}}
            />
            <p style={{fontSize:12,color:'#aaa',marginTop:8,textAlign:'center'}}>
              Works best on mobile. On desktop, use the "Type manually" tab instead.
            </p>
          </div>
        )}

        {/* Detecting state */}
        {mode === 'detecting' && (
          <div style={{textAlign:'center',padding:'40px 0',color:'#888'}}>
            <div style={{fontSize:32,marginBottom:8}}>📷</div>
            <p>Starting camera…</p>
          </div>
        )}

        {/* No camera / manual fallback */}
        {(mode === 'nocamera' || mode === 'manual') && (
          <div>
            {mode === 'nocamera' && (
              <div style={{background:'#fff8e1',border:'1px solid #f9c84a',borderRadius:8,padding:'10px 14px',marginBottom:16,fontSize:13,color:'#7a5800'}}>
                ⚠️ No camera detected on this device. You can type the barcode or product name below instead.
              </div>
            )}
            <label style={{fontSize:13,fontWeight:600,color:'#333',display:'block',marginBottom:6}}>
              Barcode number or product name
            </label>
            <input
              autoFocus
              style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1px solid #ddd',fontSize:15,boxSizing:'border-box',marginBottom:8}}
              placeholder="e.g. 6001067001234 or Indomie Noodles"
              value={manualCode}
              onChange={e => { setManualCode(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submitManual()}
            />
            {error && <p style={{color:'#c0392b',fontSize:13,margin:'0 0 8px'}}>{error}</p>}
            <button
              onClick={submitManual}
              style={{width:'100%',padding:'12px',borderRadius:8,background:'var(--green)',color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}
            >
              Use this barcode
            </button>
          </div>
        )}

        <button onClick={onClose} style={{
          width:'100%', marginTop:12, padding:'10px',
          border:'1px solid #eee', borderRadius:8,
          background:'#f5f5f5', cursor:'pointer', fontSize:13, color:'#666'
        }}>
          Cancel
        </button>
      </div>
    </div>
  )
}
