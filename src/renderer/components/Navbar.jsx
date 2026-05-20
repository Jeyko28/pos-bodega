import React, { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useSesion } from '../App'

export default function Navbar() {
  const { usuario, handleLogout } = useSesion()
  const [alertas, setAlertas]             = useState(0)
  const [turno, setTurno]                 = useState(null)
  const [confirmLogout, setConfirmLogout] = useState(false)

  const esAdmin = usuario?.rol === 'admin'

  useEffect(() => {
    cargarAlertas()
    cargarTurno()
    const interval = setInterval(() => { cargarAlertas(); cargarTurno() }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function cargarAlertas() {
    const p = await window.electronAPI.getProductosBajoStock()
    setAlertas(p.length)
  }

  async function cargarTurno() {
    if (!usuario) return
    const t = await window.electronAPI.getTurnoActivo(usuario.id)
    setTurno(t)
  }

  async function toggleTurno() {
    if (turno) await window.electronAPI.cerrarTurno(usuario.id)
    else       await window.electronAPI.abrirTurno(usuario.id)
    cargarTurno()
  }

  // Nav principal — visible para todos
  const navItems = [
    {
      to:'/dashboard', label:'Inicio',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
    },
    {
      to:'/pos', label:'Caja',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 10h2M7 7h2M11 7h6M11 10h6"/></svg>,
    },
    {
      to:'/productos', label:'Productos',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    },
    {
      to:'/clientes', label:'Clientes',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to:'/ofertas', label:'Ofertas',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
    },
    {
      to:'/alertas', label:'Alertas', badge:alertas,
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    },
    {
      to:'/reportes', label:'Reportes',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    },
  ]

  // Solo admin
  const adminItems = [
    {
      to:'/historial', label:'Historial',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
    },
    {
      to:'/usuarios', label:'Usuarios',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    },
    {
      to:'/configuracion', label:'Config',
      icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06-.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
    },
  ]

  const NavItem = ({ to, label, icon, badge }) => (
    <NavLink to={to} title={label}
      style={({ isActive }) => ({
        position:'relative', width:50, height:50,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2,
        borderRadius:12, textDecoration:'none',
        color: isActive ? '#10b981' : '#637a93',
        background: isActive ? 'rgba(16,185,129,0.12)' : 'transparent',
        border: isActive ? '1px solid rgba(16,185,129,0.25)' : '1px solid transparent',
        transition:'all 0.15s',
      })}>
      {icon}
      <span style={{ fontSize:9, fontWeight:600, letterSpacing:0.3 }}>{label}</span>
      {badge > 0 && (
        <div style={{ position:'absolute', top:4, right:4, width:15, height:15, background:'#ef4444', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:800, color:'white', border:'2px solid #0d1520' }}>
          {badge > 9 ? '9+' : badge}
        </div>
      )}
    </NavLink>
  )

  return (
    <nav style={{ width:72, background:'#0d1520', borderRight:'1px solid #1e3347', display:'flex', flexDirection:'column', alignItems:'center', padding:'14px 0', gap:3, flexShrink:0, overflowY:'auto', overflowX:'hidden' }}>

      {/* Logo */}
      <div style={{ width:40, height:40, background:'linear-gradient(135deg,#10b981,#059669)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:12, flexShrink:0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6" stroke="rgba(0,0,0,0.3)" strokeWidth="2"/>
          <path d="M16 10a4 4 0 0 1-8 0" stroke="rgba(0,0,0,0.4)" strokeWidth="2" fill="none"/>
        </svg>
      </div>

      {/* Nav principal */}
      {navItems.map(item => <NavItem key={item.to} {...item} />)}

      {/* Separador admin */}
      {esAdmin && <div style={{ width:32, height:1, background:'#1e3347', margin:'4px 0' }} />}

      {/* Admin items */}
      {esAdmin && adminItems.map(item => <NavItem key={item.to} {...item} />)}

      {/* Zona inferior */}
      <div style={{ marginTop:'auto', display:'flex', flexDirection:'column', alignItems:'center', gap:6, paddingTop:8 }}>

        {/* Botón turno */}
        <button onClick={toggleTurno} title={turno ? 'Cerrar turno' : 'Abrir turno'}
          style={{ width:50, height:50, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:2, borderRadius:12, border:'none', cursor:'pointer', transition:'all 0.15s',
            background: turno ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.1)',
            color: turno ? '#10b981' : '#f59e0b' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {turno
              ? <><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></>
              : <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>
            }
          </svg>
          <span style={{ fontSize:9, fontWeight:600 }}>{turno ? 'Cerrar' : 'Turno'}</span>
        </button>

        {/* Avatar */}
        <div title={`${usuario?.nombre} (${usuario?.rol})`}
          style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e3347,#2a4a65)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#34d399', border:'2px solid #1e3347' }}>
          {usuario?.nombre?.charAt(0).toUpperCase()}
        </div>

        {/* Logout */}
        <button onClick={() => setConfirmLogout(true)} title="Cerrar sesión"
          style={{ width:50, height:34, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:1, borderRadius:10, border:'none', cursor:'pointer', background:'transparent', color:'#637a93', transition:'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.color='#ef4444'; e.currentTarget.style.background='rgba(239,68,68,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color='#637a93'; e.currentTarget.style.background='transparent' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style={{ fontSize:8, fontWeight:600 }}>Salir</span>
        </button>

        <div style={{ color:'#3a5068', fontSize:9, fontWeight:500 }}>v1.0</div>
      </div>

      {/* Modal logout */}
      {confirmLogout && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:500 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:18, padding:28, width:320, display:'flex', flexDirection:'column', gap:16, textAlign:'center' }}>
            <div style={{ fontSize:36 }}>👋</div>
            <div>
              <p style={{ fontWeight:700, fontSize:16 }}>¿Cerrar sesión?</p>
              <p style={{ color:'#637a93', fontSize:13, marginTop:6 }}>
                Sesión de <strong style={{ color:'var(--text)' }}>{usuario?.nombre}</strong>
                {turno && <><br/><span style={{ color:'#f59e0b' }}>⚠️ Tienes un turno abierto</span></>}
              </p>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setConfirmLogout(false)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => { setConfirmLogout(false); handleLogout() }}>Cerrar sesión</button>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}