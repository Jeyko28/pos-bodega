import React, { useState, useEffect } from 'react'

const VISTA = { LOGIN:'login', RECUPERAR_1:'recuperar_1', RECUPERAR_2:'recuperar_2', EXITO:'exito' }

export default function Login({ onLogin }) {
  const [vista, setVista]       = useState(VISTA.LOGIN)

  // Login
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [verPass, setVerPass]   = useState(false)
  const [error, setError]       = useState('')
  const [cargando, setCargando] = useState(false)

  // Recuperación paso 1
  const [admins, setAdmins]           = useState([])
  const [adminSel, setAdminSel]       = useState('')
  const [codigo, setCodigo]           = useState('')
  const [verCodigo, setVerCodigo]     = useState(false)
  const [errorRec, setErrorRec]       = useState('')
  const [cargandoRec, setCargandoRec] = useState(false)
  const [usuarioIdRec, setUsuarioIdRec] = useState(null)
  const [esClaveMaestra, setEsClaveMaestra] = useState(false)

  // Recuperación paso 2
  const [nuevaPass, setNuevaPass]     = useState('')
  const [nuevaPassRep, setNuevaPassRep] = useState('')
  const [verNuevaPass, setVerNuevaPass] = useState(false)
  const [errorNueva, setErrorNueva]   = useState('')

  useEffect(() => {
    if (vista === VISTA.RECUPERAR_1) {
      window.electronAPI.getAdmins().then(a => {
        setAdmins(a)
        if (a.length === 1) setAdminSel(a[0].username)
      })
    }
  }, [vista])

  async function handleLogin(e) {
    e.preventDefault()
    if (!username.trim() || !password.trim()) { setError('Ingresa tu usuario y contraseña'); return }
    setCargando(true); setError('')
    const result = await window.electronAPI.login({ username:username.trim(), password })
    if (result.success) {
      onLogin(result.usuario)
    } else {
      setError(result.error || 'Usuario o contraseña incorrectos')
    }
    setCargando(false)
  }

  async function handleVerificarCodigo() {
    if (!adminSel) { setErrorRec('Selecciona el usuario administrador'); return }
    if (!codigo.trim()) { setErrorRec('Ingresa el código de recuperación'); return }
    setCargandoRec(true); setErrorRec('')
    const result = await window.electronAPI.verificarCodigoRecuperacion({ username:adminSel, codigo:codigo.trim() })
    if (result.success) {
      setUsuarioIdRec(result.usuarioId)
      setEsClaveMaestra(result.esClaveMaestra || false)
      setVista(VISTA.RECUPERAR_2)
    } else {
      setErrorRec(result.error || 'Código incorrecto')
    }
    setCargandoRec(false)
  }

  async function handleResetearPassword() {
    if (nuevaPass.length < 4) { setErrorNueva('La contraseña debe tener al menos 4 caracteres'); return }
    if (nuevaPass !== nuevaPassRep) { setErrorNueva('Las contraseñas no coinciden'); return }
    const result = await window.electronAPI.resetearPassword({ usuarioId:usuarioIdRec, nuevaPassword:nuevaPass })
    if (result.success) {
      setVista(VISTA.EXITO)
    } else {
      setErrorNueva(result.error || 'Error al cambiar la contraseña')
    }
  }

  function volverAlLogin() {
    setVista(VISTA.LOGIN)
    setError(''); setErrorRec(''); setErrorNueva('')
    setCodigo(''); setNuevaPass(''); setNuevaPassRep('')
    setAdminSel(''); setUsuarioIdRec(null); setEsClaveMaestra(false)
  }

  return (
    <div style={{
      height:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      background:'var(--bg-base)',
      backgroundImage:'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.07) 0%, transparent 60%)',
    }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:28, width:380 }}>

        {/* Logo */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
          <div style={{ width:64, height:64, background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:18, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 32px rgba(16,185,129,0.3)' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="white">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6" stroke="rgba(0,0,0,0.25)" strokeWidth="2"/>
              <path d="M16 10a4 4 0 0 1-8 0" stroke="rgba(0,0,0,0.3)" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <div style={{ textAlign:'center' }}>
            <h1 style={{ fontSize:24, fontWeight:800, letterSpacing:-0.5 }}>POS Bodega</h1>
            <p style={{ fontSize:13, color:'#637a93', marginTop:4 }}>
              {vista===VISTA.LOGIN && 'Inicia sesión para continuar'}
              {vista===VISTA.RECUPERAR_1 && 'Recuperar contraseña'}
              {vista===VISTA.RECUPERAR_2 && 'Nueva contraseña'}
              {vista===VISTA.EXITO && '¡Contraseña actualizada!'}
            </p>
          </div>
        </div>

        {/* ── Vista: LOGIN ── */}
        {vista === VISTA.LOGIN && (
          <form onSubmit={handleLogin} style={{ width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:28, display:'flex', flexDirection:'column', gap:18 }}>
            <Campo label="Usuario">
              <div style={{ position:'relative' }}>
                <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input className="input" style={{ paddingLeft:42, fontSize:15 }} placeholder="Nombre de usuario"
                  value={username} onChange={e => { setUsername(e.target.value); setError('') }} autoFocus />
              </div>
            </Campo>
            <Campo label="Contraseña">
              <div style={{ position:'relative' }}>
                <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <input className="input" style={{ paddingLeft:42, paddingRight:42, fontSize:15 }}
                  type={verPass?'text':'password'} placeholder="Contraseña"
                  value={password} onChange={e => { setPassword(e.target.value); setError('') }} />
                <button type="button" onClick={() => setVerPass(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>
                  {verPass?'🙈':'👁️'}
                </button>
              </div>
            </Campo>
            {error && <MsgError>{error}</MsgError>}
            <button type="submit" className="btn btn-primary" style={{ padding:'13px', fontSize:15, borderRadius:12 }} disabled={cargando}>
              {cargando ? 'Verificando...' : 'Iniciar sesión'}
            </button>
            <button type="button" onClick={() => setVista(VISTA.RECUPERAR_1)}
              style={{ background:'none', border:'none', cursor:'pointer', fontSize:13, color:'#637a93', textDecoration:'underline', paddingTop:4 }}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ── Vista: RECUPERAR paso 1 ── */}
        {vista === VISTA.RECUPERAR_1 && (
          <div style={{ width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:28, display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#f59e0b' }}>
              🔑 Ingresa tu código de recuperación para restablecer tu contraseña
            </div>

            {admins.length > 1 && (
              <Campo label="Selecciona el administrador">
                <select className="input" value={adminSel} onChange={e => setAdminSel(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {admins.map(a => <option key={a.id} value={a.username}>{a.nombre} ({a.username})</option>)}
                </select>
              </Campo>
            )}
            {admins.length === 1 && (
              <div style={{ background:'var(--bg-700)', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
                👤 Recuperando acceso para: <strong>{admins[0].nombre}</strong>
              </div>
            )}

            <Campo label="Código de recuperación">
              <div style={{ position:'relative' }}>
                <input className="input" type={verCodigo?'text':'password'}
                  style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:15, letterSpacing:2, paddingRight:44 }}
                  placeholder="Ingresa tu código secreto"
                  value={codigo} onChange={e => { setCodigo(e.target.value.toUpperCase()); setErrorRec('') }} autoFocus />
                <button type="button" onClick={() => setVerCodigo(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>
                  {verCodigo?'🙈':'👁️'}
                </button>
              </div>
            </Campo>

            {errorRec && <MsgError>{errorRec}</MsgError>}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={volverAlLogin}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleVerificarCodigo} disabled={cargandoRec}>
                {cargandoRec ? 'Verificando...' : 'Continuar →'}
              </button>
            </div>
          </div>
        )}

        {/* ── Vista: RECUPERAR paso 2 ── */}
        {vista === VISTA.RECUPERAR_2 && (
          <div style={{ width:'100%', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:18, padding:28, display:'flex', flexDirection:'column', gap:18 }}>
            {esClaveMaestra && (
              <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
                🔐 Acceso con clave maestra — Establece una nueva contraseña
              </div>
            )}
            <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#34d399' }}>
              ✓ Código verificado — Ahora ingresa tu nueva contraseña
            </div>
            <Campo label="Nueva contraseña" required>
              <div style={{ position:'relative' }}>
                <input className="input" type={verNuevaPass?'text':'password'}
                  style={{ paddingRight:44 }} placeholder="Mínimo 4 caracteres" autoFocus
                  value={nuevaPass} onChange={e => { setNuevaPass(e.target.value); setErrorNueva('') }} />
                <button type="button" onClick={() => setVerNuevaPass(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>
                  {verNuevaPass?'🙈':'👁️'}
                </button>
              </div>
            </Campo>
            <Campo label="Repetir nueva contraseña" required>
              <input className="input" type={verNuevaPass?'text':'password'}
                placeholder="Repite la contraseña"
                value={nuevaPassRep} onChange={e => { setNuevaPassRep(e.target.value); setErrorNueva('') }} />
            </Campo>
            {errorNueva && <MsgError>{errorNueva}</MsgError>}
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setVista(VISTA.RECUPERAR_1)}>← Atrás</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={handleResetearPassword}
                disabled={!nuevaPass||!nuevaPassRep}>
                ✓ Actualizar contraseña
              </button>
            </div>
          </div>
        )}

        {/* ── Vista: ÉXITO ── */}
        {vista === VISTA.EXITO && (
          <div style={{ width:'100%', background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:18, padding:32, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
            <div style={{ fontSize:52 }}>🎉</div>
            <div>
              <p style={{ fontWeight:700, fontSize:18, color:'#34d399' }}>¡Contraseña actualizada!</p>
              <p style={{ color:'#637a93', fontSize:13, marginTop:6 }}>Ya puedes iniciar sesión con tu nueva contraseña</p>
            </div>
            <button className="btn btn-primary" style={{ width:'100%', padding:'13px', fontSize:15 }} onClick={volverAlLogin}>
              Ir al inicio de sesión
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Campo({ label, required, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <label style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>
        {label} {required && <span style={{ color:'#10b981' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function MsgError({ children }) {
  return (
    <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
      ⚠️ {children}
    </div>
  )
}