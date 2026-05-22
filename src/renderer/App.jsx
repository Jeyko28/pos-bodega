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
            background:'#111d2b',
            border:`1px solid ${updateInfo.tipo==='downloaded'?'rgba(16,185,129,0.5)':updateInfo.tipo==='downloading'?'rgba(14,165,233,0.4)':'rgba(16,185,129,0.4)'}`,
            borderRadius:16, padding:'16px 20px', width:340,
            boxShadow:'0 8px 32px rgba(0,0,0,0.5)',
            display:'flex', flexDirection:'column', gap:12,
          }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:24 }}>
                  {updateInfo.tipo==='downloaded' ? '🎉' : updateInfo.tipo==='downloading' ? '⬇️' : '🔔'}
                </span>
                <div>
                  <p style={{ fontWeight:700, fontSize:14, color:updateInfo.tipo==='downloading'?'#38bdf8':'#34d399' }}>
                    {updateInfo.tipo==='downloaded' ? '¡Actualización lista!' :
                     updateInfo.tipo==='downloading' ? 'Descargando actualización...' :
                     'Nueva versión disponible'}
                  </p>
                  {updateInfo.version && (
                    <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>
                      Versión <strong style={{ color:'var(--text)' }}>{updateInfo.version}</strong>
                    </p>
                  )}
                </div>
              </div>
              {updateInfo.tipo !== 'downloading' && (
                <button onClick={() => setShowUpdate(false)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18, lineHeight:1, flexShrink:0 }}>✕</button>
              )}
            </div>

            {/* Barra de progreso + velocidad */}
            {updateInfo.tipo==='downloading' && (
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <div style={{ height:8, background:'#1e3347', borderRadius:999, overflow:'hidden' }}>
                  <div style={{
                    height:'100%',
                    width:`${updateInfo.progreso||0}%`,
                    background:'linear-gradient(90deg,#0ea5e9,#10b981)',
                    borderRadius:999,
                    transition:'width 0.4s ease',
                  }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontSize:11, color:'#637a93' }}>
                    {updateInfo.velocidad || 'Calculando...'}
                  </span>
                  <span style={{ fontSize:13, fontWeight:700, color:'#38bdf8', fontFamily:'JetBrains Mono' }}>
                    {updateInfo.progreso||0}%
                  </span>
                </div>
                {updateInfo.transferido && updateInfo.total && (
                  <p style={{ fontSize:11, color:'#3a5068', textAlign:'center' }}>
                    {updateInfo.transferido} de {updateInfo.total}
                  </p>
                )}
              </div>
            )}

            {/* Mensaje */}
            <p style={{ fontSize:12, color:'#637a93', lineHeight:1.5 }}>
              {updateInfo.tipo==='downloaded'
                ? 'La descarga terminó. Puedes instalar ahora o al cerrar la app.'
                : updateInfo.tipo==='downloading'
                ? '⚠️ No cierres la aplicación hasta que termine.'
                : 'Se descargará automáticamente en segundo plano.'}
            </p>

            {updateInfo.tipo==='downloaded' && (
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost" style={{ flex:1, fontSize:13 }}
                  onClick={() => setShowUpdate(false)}>
                  Después
                </button>
                <button className="btn btn-primary" style={{ flex:2, fontSize:13 }}
                  onClick={handleInstallUpdate}>
                  🔄 Instalar y reiniciar
                </button>
              </div>
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