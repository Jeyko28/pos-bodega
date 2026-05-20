import React, { useState, useEffect, createContext, useContext } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import SetupWizard from './pages/SetupWizard'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Productos from './pages/Productos'
import Alertas from './pages/Alertas'
import Clientes from './pages/Clientes'
import Ofertas from './pages/Ofertas'
import Reportes from './pages/Reportes'
import Historial from './pages/Historial'
import Usuarios from './pages/Usuarios'
import Configuracion from './pages/Configuracion'

export const SesionContext = createContext(null)
export function useSesion() { return useContext(SesionContext) }

export default function App() {
  const [usuario, setUsuario]         = useState(null)
  const [cargando, setCargando]       = useState(true)
  const [setupPendiente, setSetupPendiente] = useState(false)

  // Auto-updater
  const [updateInfo, setUpdateInfo]   = useState(null) // { tipo, msg, version, progreso }
  const [showUpdate, setShowUpdate]   = useState(false)

  useEffect(() => {
    iniciar()

    // Escuchar eventos del auto-updater
    window.electronAPI.onUpdateStatus((data) => {
      if (data.tipo === 'available' || data.tipo === 'downloading' || data.tipo === 'downloaded') {
        setUpdateInfo(data)
        setShowUpdate(true)
      }
      if (data.tipo === 'not-available' || data.tipo === 'error') {
        setUpdateInfo(data)
      }
    })
    return () => window.electronAPI.offUpdateStatus()
  }, [])

  async function iniciar() {
    try {
      // Verificar si es primera vez
      const setupOk = await window.electronAPI.isSetupCompletado()
      if (!setupOk) {
        setSetupPendiente(true)
        setCargando(false)
        return
      }
      // Recuperar sesión guardada
      const guardado = sessionStorage.getItem('pos_usuario')
      if (guardado) setUsuario(JSON.parse(guardado))
    } catch(e) {
      console.error('Error al iniciar:', e)
    }
    setCargando(false)
  }

  function handleSetupCompleto(usuarioData) {
    setSetupPendiente(false)
    setUsuario(usuarioData)
    sessionStorage.setItem('pos_usuario', JSON.stringify(usuarioData))
  }

  function handleLogin(usuarioData) {
    setUsuario(usuarioData)
    sessionStorage.setItem('pos_usuario', JSON.stringify(usuarioData))
  }

  function handleLogout() {
    setUsuario(null)
    sessionStorage.removeItem('pos_usuario')
  }

  async function handleInstallUpdate() {
    await window.electronAPI.installUpdate()
  }

  // ── Pantalla de carga ──
  if (cargando) return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', background:'var(--bg-base)', gap:16 }}>
      <div style={{ width:48, height:48, border:'3px solid #1e3347', borderTop:'3px solid #10b981', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <p style={{ color:'#637a93', fontSize:14 }}>Iniciando POS Bodega...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ── Primera vez — mostrar asistente ──
  if (setupPendiente) return <SetupWizard onCompleto={handleSetupCompleto} />

  // ── Sin sesión — mostrar login ──
  if (!usuario) return <Login onLogin={handleLogin} />

  // ── App principal ──
  return (
    <SesionContext.Provider value={{ usuario, handleLogout }}>
      <HashRouter>
        <div style={{ display:'flex', height:'100vh', overflow:'hidden' }}>
          <Navbar />
          <main style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <Routes>
              <Route path="/"              element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard"     element={<Dashboard />} />
              <Route path="/pos"           element={<POS />} />
              <Route path="/productos"     element={<Productos />} />
              <Route path="/alertas"       element={<Alertas />} />
              <Route path="/clientes"      element={<Clientes />} />
              <Route path="/ofertas"       element={<Ofertas />} />
              <Route path="/reportes"      element={<Reportes />} />
              <Route path="/historial"     element={<AdminRoute><Historial /></AdminRoute>} />
              <Route path="/usuarios"      element={<AdminRoute><Usuarios /></AdminRoute>} />
              <Route path="/configuracion" element={<AdminRoute><Configuracion /></AdminRoute>} />
            </Routes>
          </main>
        </div>

        {/* ── Banner de actualización ── */}
        {showUpdate && updateInfo && (
          <div style={{
            position:'fixed', bottom:20, right:20, zIndex:1000,
            background:'#111d2b', border:'1px solid rgba(16,185,129,0.4)',
            borderRadius:16, padding:'16px 20px', width:320,
            boxShadow:'0 8px 32px rgba(0,0,0,0.4)',
            display:'flex', flexDirection:'column', gap:12,
          }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>
                  {updateInfo.tipo==='downloaded' ? '🎉' : updateInfo.tipo==='downloading' ? '⬇️' : '🔔'}
                </span>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:'#34d399' }}>
                    {updateInfo.tipo==='downloaded' ? '¡Actualización lista!' :
                     updateInfo.tipo==='downloading' ? 'Descargando actualización' :
                     'Nueva versión disponible'}
                  </p>
                  {updateInfo.version && (
                    <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>Versión {updateInfo.version}</p>
                  )}
                </div>
              </div>
              <button onClick={() => setShowUpdate(false)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18, lineHeight:1 }}>✕</button>
            </div>

            {/* Barra de progreso descarga */}
            {updateInfo.tipo==='downloading' && updateInfo.progreso !== undefined && (
              <div>
                <div style={{ height:6, background:'var(--bg-700)', borderRadius:999, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${updateInfo.progreso}%`, background:'#10b981', borderRadius:999, transition:'width 0.3s' }} />
                </div>
                <p style={{ fontSize:12, color:'#637a93', marginTop:4, textAlign:'right' }}>{updateInfo.progreso}%</p>
              </div>
            )}

            <p style={{ fontSize:12, color:'#637a93' }}>
              {updateInfo.tipo==='downloaded'
                ? 'La actualización se instalará cuando cierres la aplicación.'
                : 'Se está descargando en segundo plano. No cierres la app.'}
            </p>

            {updateInfo.tipo==='downloaded' && (
              <button className="btn btn-primary" style={{ width:'100%', fontSize:13 }}
                onClick={handleInstallUpdate}>
                🔄 Instalar y reiniciar ahora
              </button>
            )}
          </div>
        )}
      </HashRouter>
    </SesionContext.Provider>
  )
}

function AdminRoute({ children }) {
  const { usuario } = useSesion()
  if (usuario?.rol !== 'admin') {
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, color:'#637a93' }}>
        <div style={{ fontSize:48 }}>🔒</div>
        <p style={{ fontSize:16, fontWeight:700 }}>Acceso restringido</p>
        <p style={{ fontSize:13 }}>Solo los administradores pueden acceder a esta sección.</p>
      </div>
    )
  }
  return children
}