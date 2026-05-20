import React, { useState } from 'react'

const PASOS = ['Negocio', 'Administrador', 'Seguridad']

export default function SetupWizard({ onCompleto }) {
  const [paso, setPaso]           = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')

  const [negocio, setNegocio]     = useState({ nombre:'', ruc:'', direccion:'', telefono:'' })
  const [admin, setAdmin]         = useState({ nombre:'', username:'', password:'', passwordRep:'' })
  const [seguridad, setSeguridad] = useState({ codigo:'', codigoRep:'' })

  const [verPass, setVerPass]     = useState(false)
  const [verCodigo, setVerCodigo] = useState(false)

  function setN(k,v) { setNegocio(p=>({...p,[k]:v})); setError('') }
  function setA(k,v) { setAdmin(p=>({...p,[k]:v}));   setError('') }
  function setS(k,v) { setSeguridad(p=>({...p,[k]:v})); setError('') }

  function validarPaso() {
    if (paso===0) {
      if (!negocio.nombre.trim()) { setError('El nombre del negocio es obligatorio'); return false }
    }
    if (paso===1) {
      if (!admin.nombre.trim())      { setError('El nombre del administrador es obligatorio'); return false }
      if (!admin.username.trim())    { setError('El usuario es obligatorio'); return false }
      if (admin.password.length < 4) { setError('La contraseña debe tener al menos 4 caracteres'); return false }
      if (admin.password !== admin.passwordRep) { setError('Las contraseñas no coinciden'); return false }
    }
    if (paso===2) {
      if (!seguridad.codigo.trim())  { setError('El código de recuperación es obligatorio'); return false }
      if (seguridad.codigo.length < 4) { setError('El código debe tener al menos 4 caracteres'); return false }
      if (seguridad.codigo !== seguridad.codigoRep) { setError('Los códigos no coinciden'); return false }
    }
    return true
  }

  function siguiente() {
    if (!validarPaso()) return
    setPaso(p=>p+1); setError('')
  }

  async function finalizar() {
    if (!validarPaso()) return
    setGuardando(true)
    try {
      const result = await window.electronAPI.completarSetup({
        negocioNombre:      negocio.nombre.trim(),
        negocioRuc:         negocio.ruc.trim()       || null,
        negocioDireccion:   negocio.direccion.trim() || null,
        negocioTelefono:    negocio.telefono.trim()  || null,
        adminNombre:        admin.nombre.trim(),
        adminUsername:      admin.username.trim().toLowerCase(),
        adminPassword:      admin.password,
        codigoRecuperacion: seguridad.codigo.trim(),
      })
      if (result.success) {
        onCompleto(result.usuario)
      } else {
        setError(result.error || 'Error al completar la configuración')
      }
    } catch(e) {
      setError('Error inesperado: ' + e.message)
    }
    setGuardando(false)
  }

  return (
    <div style={{
      height:'100vh', overflowY:'auto',
      background:'var(--bg-base)',
      backgroundImage:'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, transparent 60%)',
      display:'flex', justifyContent:'center',
      padding:'24px 16px 32px',
    }}>
      <div style={{ width:'100%', maxWidth:460, display:'flex', flexDirection:'column', gap:16 }}>

        {/* Logo + título */}
        <div style={{ textAlign:'center' }}>
          <div style={{ width:56, height:56, background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', boxShadow:'0 6px 24px rgba(16,185,129,0.3)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="rgba(0,0,0,0.25)" strokeWidth="2"/>
              <path d="M16 10a4 4 0 0 1-8 0" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <h1 style={{ fontSize:20, fontWeight:800, marginBottom:4 }}>Bienvenido a POS Bodega</h1>
          <p style={{ color:'#637a93', fontSize:13 }}>Configura tu negocio en 3 pasos simples</p>
        </div>

        {/* Indicador de pasos */}
        <div style={{ display:'flex', alignItems:'center' }}>
          {PASOS.map((label,i) => (
            <React.Fragment key={i}>
              <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:13, transition:'all 0.3s',
                  background: i<paso ? '#10b981' : i===paso ? 'linear-gradient(135deg,#10b981,#059669)' : 'var(--bg-card)',
                  color: i<=paso ? 'white' : '#637a93',
                  border: i===paso ? '2px solid #34d399' : '2px solid transparent',
                  boxShadow: i===paso ? '0 0 12px rgba(16,185,129,0.4)' : 'none',
                }}>
                  {i<paso ? '✓' : i+1}
                </div>
                <span style={{ fontSize:10, fontWeight:600, color:i===paso?'#34d399':'#637a93' }}>{label}</span>
              </div>
              {i<PASOS.length-1 && (
                <div style={{ flex:2, height:2, background:i<paso?'#10b981':'var(--border)', transition:'background 0.3s', marginBottom:18 }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Tarjeta del paso */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:24, display:'flex', flexDirection:'column', gap:16 }}>

          {/* ── Paso 0: Negocio ── */}
          {paso===0 && (
            <>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>🏪 Tu negocio</h2>
                <p style={{ fontSize:12, color:'#637a93' }}>Estos datos aparecerán en los tickets de venta</p>
              </div>
              <Campo label="Nombre del negocio" required>
                <input className="input" placeholder="Ej: Bodega El Buen Precio" autoFocus
                  value={negocio.nombre} onChange={e=>setN('nombre',e.target.value)} />
              </Campo>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Campo label="RUC / DNI">
                  <input className="input" placeholder="Ej: 20123456789"
                    value={negocio.ruc} onChange={e=>setN('ruc',e.target.value)} />
                </Campo>
                <Campo label="Teléfono">
                  <input className="input" placeholder="Ej: 987654321"
                    value={negocio.telefono} onChange={e=>setN('telefono',e.target.value)} />
                </Campo>
              </div>
              <Campo label="Dirección">
                <input className="input" placeholder="Ej: Av. Los Jardines 123, Piura"
                  value={negocio.direccion} onChange={e=>setN('direccion',e.target.value)} />
              </Campo>
            </>
          )}

          {/* ── Paso 1: Admin ── */}
          {paso===1 && (
            <>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>👑 Cuenta de administrador</h2>
                <p style={{ fontSize:12, color:'#637a93' }}>Tendrás acceso completo al sistema</p>
              </div>
              <Campo label="Nombre completo" required>
                <input className="input" placeholder="Ej: Juan Pérez" autoFocus
                  value={admin.nombre} onChange={e=>setA('nombre',e.target.value)} />
              </Campo>
              <Campo label="Nombre de usuario" required>
                <input className="input" style={{ fontFamily:'JetBrains Mono' }}
                  placeholder="Ej: juanperez"
                  value={admin.username} onChange={e=>setA('username',e.target.value.toLowerCase().replace(/\s/g,''))} />
              </Campo>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <Campo label="Contraseña" required>
                  <div style={{ position:'relative' }}>
                    <input className="input" type={verPass?'text':'password'}
                      placeholder="Mín. 4 caracteres" style={{ paddingRight:40 }}
                      value={admin.password} onChange={e=>setA('password',e.target.value)} />
                    <button type="button" onClick={()=>setVerPass(v=>!v)}
                      style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:15 }}>
                      {verPass?'🙈':'👁️'}
                    </button>
                  </div>
                </Campo>
                <Campo label="Repetir" required>
                  <input className="input" type={verPass?'text':'password'}
                    placeholder="Repite"
                    value={admin.passwordRep} onChange={e=>setA('passwordRep',e.target.value)} />
                </Campo>
              </div>
            </>
          )}

          {/* ── Paso 2: Seguridad ── */}
          {paso===2 && (
            <>
              <div>
                <h2 style={{ fontSize:16, fontWeight:700, marginBottom:2 }}>🔑 Código de recuperación</h2>
                <p style={{ fontSize:12, color:'#637a93' }}>Si olvidas tu contraseña, este código te permitirá recuperarla. <strong style={{ color:'#f59e0b' }}>Guárdalo.</strong></p>
              </div>

              <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#f59e0b' }}>
                ⚠️ No compartas este código. Si lo pierdes, necesitarás contactar al soporte técnico.
              </div>

              <Campo label="Código de recuperación" required>
                <div style={{ position:'relative' }}>
                  <input className="input" type={verCodigo?'text':'password'}
                    style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:15, letterSpacing:2, paddingRight:44 }}
                    placeholder="Ej: MI-CLAVE-2026"
                    value={seguridad.codigo} onChange={e=>setS('codigo',e.target.value.toUpperCase())} autoFocus />
                  <button type="button" onClick={()=>setVerCodigo(v=>!v)}
                    style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:15 }}>
                    {verCodigo?'🙈':'👁️'}
                  </button>
                </div>
              </Campo>

              <Campo label="Repetir código" required>
                <input className="input" type={verCodigo?'text':'password'}
                  style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:15, letterSpacing:2 }}
                  placeholder="Repite el código"
                  value={seguridad.codigoRep} onChange={e=>setS('codigoRep',e.target.value.toUpperCase())} />
              </Campo>

              {/* Resumen */}
              <div style={{ background:'var(--bg-700)', borderRadius:10, padding:'12px 14px', fontSize:13 }}>
                <p style={{ fontWeight:700, marginBottom:8, color:'#637a93', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>Resumen</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <Fila label="Negocio"  value={negocio.nombre} />
                  {negocio.ruc && <Fila label="RUC" value={negocio.ruc} />}
                  <Fila label="Admin"    value={admin.nombre} />
                  <Fila label="Usuario"  value={admin.username} mono />
                </div>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Botones */}
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            {paso>0 && (
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={()=>{setPaso(p=>p-1);setError('')}}>
                ← Atrás
              </button>
            )}
            {paso<PASOS.length-1 ? (
              <button className="btn btn-primary" style={{ flex:2 }} onClick={siguiente}>
                Siguiente →
              </button>
            ) : (
              <button className="btn btn-primary" style={{ flex:2 }}
                onClick={finalizar} disabled={guardando}>
                {guardando ? 'Configurando...' : '✓ Completar'}
              </button>
            )}
          </div>
        </div>

        <p style={{ textAlign:'center', fontSize:11, color:'#3a5068', paddingBottom:8 }}>
          POS Bodega v1.0 — Desarrollado por Jeyko28
        </p>
      </div>
    </div>
  )
}

function Campo({ label, required, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>
        {label} {required && <span style={{ color:'#10b981' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function Fila({ label, value, mono }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      <span style={{ color:'#637a93', fontSize:12 }}>{label}</span>
      <span style={{ fontWeight:600, fontSize:12, fontFamily: mono?'JetBrains Mono':undefined }}>{value}</span>
    </div>
  )
}