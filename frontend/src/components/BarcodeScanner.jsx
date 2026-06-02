import { useEffect, useRef, useState } from 'react'

export default function BarcodeScanner({ onScan, onClose }) {
  const [mode,       setMode]       = useState('camera')
  const [manualCode, setManualCode] = useState('')
  const [error,      setError]      = useState('')
  const [scanning,   setScanning]   = useState(false)
  const videoRef    = useRef(null)
  const streamRef   = useRef(null)
  const intervalRef = useRef(null)
  const readerRef   = useRef(null)

  useEffect(() => {
    if (mode !== 'camera') return
    startCamera()
    return () => stopAll()
  }, [mode])

  const stopAll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (readerRef.current)   { try { readerRef.current.reset() } catch(e) {} }
    if (streamRef.current)   streamRef.current.getTracks().forEach(t => t.stop())
    setScanning(false)
  }

  const startCamera = async () => {
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setScanning(true)

      // Try native BarcodeDetector first (Android Chrome)
      if ('BarcodeDetector' in window) {
        const detector = new window.BarcodeDetector({
          formats: ['ean_13','ean_8','code_128','code_39','qr_code','upc_a','upc_e']
        })
        intervalRef.current = setInterval(async () => {
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) {
              stopAll()
              onScan(barcodes[0].rawValue)
            }
          } catch(e) {}
        }, 300)

      } else {
        // Fallback to @zxing/browser (iOS + other browsers)
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader
        reader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (result) {
            stopAll()
            onScan(result.getText())
          }
        })
      }
    } catch(err) {
      setError('Could not access camera: ' + err.message)
      setMode('nocamera')
    }
  }

  const handleImageCapture = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/browser')
      const reader = new BrowserMultiFormatReader()
      const img = new Image()
      img.src = URL.createObjectURL(file)
      img.onload = async () => {
        try {
          const result = await reader.decodeFromImageElement(img)
          onScan(result.getText())
        } catch(e) {
          setError('Could not read barcode from image. Try manual entry.')
          setMode('manual')
        }
      }
    } catch(e) {
      setError('Barcode reading failed. Try manual entry.')
      setMode('manual')
    }
  }

  const submitManual = () => {
    if (!manualCode.trim()) return setError('Please enter a barcode or product name')
    onScan(manualCode.trim())
  }

  const handleClose = () => { stopAll(); onClose() }

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
          <h3 style={{margin:0,fontSize:17,fontWeight:700}}>📷 Scan Barcode</h3>
          <button onClick={handleClose}
            style={{background:'none',border:'none',fontSize:22,cursor:'pointer',color:'#888'}}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:20}}>
          {[
            { key:'camera',   label:'📷 Live scan' },
            { key:'photo',    label:'🖼 Take photo' },
            { key:'manual',   label:'⌨️ Type code' },
          ].map(t => (
            <button key={t.key} onClick={() => { stopAll(); setMode(t.key); setError('') }}
              style={{flex:1,padding:'7px 4px',borderRadius:8,border:'1px solid',fontSize:12,fontWeight:600,cursor:'pointer',
                borderColor: mode===t.key?'var(--green)':'#ddd',
                background:  mode===t.key?'var(--green)':'#fff',
                color:       mode===t.key?'#fff':'#555'}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Live camera scan */}
        {mode === 'camera' && (
          <div>
            <p style={{fontSize:13,color:'#888',marginBottom:10,textAlign:'center'}}>
              {scanning ? 'Hold barcode steady — scanning…' : 'Starting camera…'}
            </p>
            <video ref={videoRef} autoPlay playsInline muted
              style={{width:'100%',borderRadius:10,minHeight:220,background:'#111',objectFit:'cover'}} />
            {error && <p style={{color:'#c0392b',fontSize:13,marginTop:8,textAlign:'center'}}>{error}</p>}
            <p style={{fontSize:11,color:'#bbb',marginTop:8,textAlign:'center'}}>
              If camera doesn't work, try "Take photo" or "Type code"
            </p>
          </div>
        )}

        {/* Photo capture — best for iOS */}
        {mode === 'photo' && (
          <div style={{textAlign:'center',padding:'10px 0'}}>
            <p style={{fontSize:13,color:'#555',marginBottom:16}}>
              Take a photo of the barcode 
            </p>
            <label style={{
              display:'inline-block', padding:'14px 24px', borderRadius:10,
              background:'var(--green)', color:'#fff', fontWeight:700,
              fontSize:15, cursor:'pointer'
            }}>
              📷 Open Camera
              <input type="file" accept="image/*" capture="environment"
                onChange={handleImageCapture} style={{display:'none'}} />
            </label>
            {error && <p style={{color:'#c0392b',fontSize:13,marginTop:12}}>{error}</p>}
            <p style={{fontSize:11,color:'#bbb',marginTop:12}}>
              Take a clear photo with good lighting for best results
            </p>
          </div>
        )}

        {/* Manual entry */}
        {(mode === 'manual' || mode === 'nocamera') && (
          <div>
            {(error || mode === 'nocamera') && (
              <div style={{background:'#fff8e1',border:'1px solid #f9c84a',borderRadius:8,
                padding:'10px 14px',marginBottom:16,fontSize:13,color:'#7a5800'}}>
                ⚠️ {error || 'Camera not available'}. Enter the barcode or product name below.
              </div>
            )}
            <label style={{fontSize:13,fontWeight:600,color:'#333',display:'block',marginBottom:6}}>
              Barcode number or product name
            </label>
            <input autoFocus
              style={{width:'100%',padding:'11px 14px',borderRadius:8,border:'1px solid #ddd',
                fontSize:15,boxSizing:'border-box',marginBottom:8}}
              placeholder="e.g. 8935001727859 or Indomie Noodles"
              value={manualCode}
              onChange={e => { setManualCode(e.target.value); setError('') }}
              onKeyDown={e => e.key === 'Enter' && submitManual()}
            />
            {error && <p style={{color:'#c0392b',fontSize:13,margin:'0 0 8px'}}>{error}</p>}
            <button onClick={submitManual}
              style={{width:'100%',padding:'12px',borderRadius:8,background:'var(--green)',
                color:'#fff',border:'none',cursor:'pointer',fontWeight:700,fontSize:14}}>
              Use this
            </button>
          </div>
        )}

        <button onClick={handleClose} style={{
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