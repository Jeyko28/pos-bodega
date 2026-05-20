import React, { useState, useEffect } from 'react'
import { useSesion } from '../App'

const emptyForm = { nombre:'', username:'', password:'', rol:'cajero' }
const fmt = (n) => `S/ ${Number(n||0).toFixed(2)}`

function fmtFecha(f) {
  if (!f) return '—'
  return new Date(f).toLocaleString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })
}

function duracion(apertura, cierre) {
  const ms = new Date(cierre||Date.now()) - new Date(apertura)
  const h  = Math.floor(ms / 3600000)
  const m  = Math.floor((ms % 3600000) / 60000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function Usuarios() {
  const { usuario: usuarioActual } = useSesion()
  const [tab, setTab]             = useState('usuarios')
  const [usuarios, setUsuarios]   = useState([])
  const [turnos, setTurnos]       = useState([])
  const [modal, setModal]         = useState(null) // 'add' | 'edit' | 'password'
  const [form, setForm]           = useState(emptyForm)
  const [editId, setEditId]       = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Para cambiar contraseña
  const [passForm, setPassForm]   = useState({ passwordActual:'', passwordNueva:'', passwordRep:'' })
  const [passError, setPassError] = useState('')
  const [passExito, setPassExito] = useState(false)

  useEffect(() => { cargar() }, [tab])

  async function cargar() {
    if (tab === 'usuarios') {
      const u = await window.electronAPI.getUsuarios()
      setUsuarios(u)
    } else {
      const t = await window.electronAPI.getTurnos(50)
      setTurnos(t)
    }
  }

  function abrirAgregar() {
    setForm(emptyForm); setEditId(null); setError(''); setModal('add')
  }

  function abrirEditar(u) {
    setForm({ nombre:u.nombre, username:u.username, password:'', rol:u.rol })
    setEditId(u.id); setError(''); setModal('edit')
  }

  function abrirCambiarPass() {
    setPassForm({ passwordActual:'', passwordNueva:'', passwordRep:'' })
    setPassError(''); setPassExito(false); setModal('password')
  }

  async function guardar() {
    if (!form.nombre || !form.username) { setError('Nombre y usuario son obligatorios'); return }
    if (modal === 'add' && !form.password) { setError('La contraseña es obligatoria'); return }
    setGuardando(true); setError('')
    try {
      const result = modal === 'add'
        ? await window.electronAPI.addUsuario(form)
        : await window.electronAPI.updateUsuario({ ...form, id: editId })
      if (!result.success) { setError(result.error); setGuardando(false); return }
      setModal(null); cargar()
    } catch(e) { setError('Error al guardar') }
    setGuardando(false)
  }

  async function eliminar(id) {
    const result = await window.electronAPI.deleteUsuario(id)
    if (!result.success) { alert(result.error); return }
    setConfirmDelete(null); cargar()
  }

  async function guardarPassword() {
    if (!passForm.passwordActual) { setPassError('Ingresa tu contraseña actual'); return }
    if (passForm.passwordNueva.length < 4) { setPassError('La nueva contraseña debe tener al menos 4 caracteres'); return }
    if (passForm.passwordNueva !== passForm.passwordRep) { setPassError('Las contraseñas no coinciden'); return }
    setGuardando(true); setPassError('')
    const result = await window.electronAPI.cambiarPassword({
      id: usuarioActual.id,
      passwordActual: passForm.passwordActual,
      passwordNueva:  passForm.passwordNueva,
    })
    if (!result.success) { setPassError(result.error); setGuardando(false); return }
    setPassExito(true); setGuardando(false)
    setTimeout(() => setModal(null), 1500)
  }

  const ROL_BADGE = {
    admin:  { bg:'rgba(16,185,129,0.15)', color:'#34d399', label:'Admin' },
    cajero: { bg:'rgba(99,122,147,0.15)', color:'#637a93', label:'Cajero' },
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700 }}>Usuarios</h1>
            <p className="text-muted" style={{ fontSize:13 }}>Gestión de acceso y turnos de caja</p>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-ghost" style={{ fontSize:13 }} onClick={abrirCambiarPass}>
              🔑 Mi contraseña
            </button>
            {tab === 'usuarios' && (
              <button className="btn btn-primary" onClick={abrirAgregar}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Nuevo usuario
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--bg-800)', borderRadius:12, padding:4, width:'fit-content' }}>
          {[{ id:'usuarios', label:'👥 Usuarios' }, { id:'turnos', label:'🕐 Historial de turnos' }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
                background: tab===t.id ? 'var(--bg-card)' : 'transparent',
                color: tab===t.id ? '#34d399' : '#637a93',
                boxShadow: tab===t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px' }}>

        {tab === 'usuarios' ? (
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Nombre','Usuario','Rol','Estado','Acciones'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.6 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => {
                  const badge = ROL_BADGE[u.rol] || ROL_BADGE.cajero
                  const esMiCuenta = u.id === usuarioActual?.id
                  return (
                    <tr key={u.id}
                      style={{ borderBottom: i<usuarios.length-1 ? '1px solid rgba(30,51,71,0.6)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e3347,#2a4a65)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#34d399', flexShrink:0 }}>
                            {u.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontWeight:600, fontSize:14 }}>{u.nombre}</span>
                            {esMiCuenta && <span style={{ fontSize:11, color:'#10b981', marginLeft:6 }}>• Tú</span>}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding:'12px 16px', fontFamily:'JetBrains Mono', fontSize:13, color:'#637a93' }}>{u.username}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <span style={{ background:badge.bg, color:badge.color, borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <span className={u.activo ? 'badge badge-emerald' : 'badge badge-red'}>
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:13 }} onClick={() => abrirEditar(u)}>Editar</button>
                          {!esMiCuenta && (
                            <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:13 }} onClick={() => setConfirmDelete(u)}>Eliminar</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Historial de turnos */
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
            {turnos.length === 0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🕐</div>
                <p>No hay turnos registrados aún</p>
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)' }}>
                    {['#','Usuario','Apertura','Cierre','Duración','Ventas','Ingresos','Estado'].map(h => (
                      <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {turnos.map((t, i) => (
                    <tr key={t.id}
                      style={{ borderBottom: i<turnos.length-1 ? '1px solid rgba(30,51,71,0.6)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                      onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                      <td style={{ padding:'11px 14px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>#{t.id}</td>
                      <td style={{ padding:'11px 14px', fontWeight:600 }}>{t.nombre_usuario}</td>
                      <td style={{ padding:'11px 14px', fontSize:13 }}>{fmtFecha(t.apertura)}</td>
                      <td style={{ padding:'11px 14px', fontSize:13, color:'#637a93' }}>{fmtFecha(t.cierre)}</td>
                      <td style={{ padding:'11px 14px', fontSize:13 }}>{duracion(t.apertura, t.cierre)}</td>
                      <td style={{ padding:'11px 14px' }}>
                        <span className="badge badge-gray">{t.resumen?.total_ventas ?? '—'}</span>
                      </td>
                      <td style={{ padding:'11px 14px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981' }}>
                        {t.resumen ? fmt(t.resumen.ingresos) : '—'}
                      </td>
                      <td style={{ padding:'11px 14px' }}>
                        <span className={t.estado==='abierto' ? 'badge badge-amber' : 'badge badge-gray'}>
                          {t.estado==='abierto' ? '🟡 Abierto' : 'Cerrado'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar usuario */}
      {(modal==='add'||modal==='edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:18, padding:28, width:400, display:'flex', flexDirection:'column', gap:18 }}>
            <h2 style={{ fontSize:18, fontWeight:700 }}>{modal==='add' ? 'Nuevo usuario' : 'Editar usuario'}</h2>

            <Campo label="Nombre completo" required>
              <input className="input" placeholder="Ej: Juan Pérez" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} />
            </Campo>
            <Campo label="Nombre de usuario" required>
              <input className="input" placeholder="Ej: juanperez" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value.toLowerCase().trim()}))} style={{ fontFamily:'JetBrains Mono' }} />
            </Campo>
            <Campo label={modal==='add' ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'} required={modal==='add'}>
              <input className="input" type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} />
            </Campo>
            <Campo label="Rol">
              <div style={{ display:'flex', gap:10 }}>
                {[{ id:'cajero',label:'Cajero',desc:'Solo puede vender' }, { id:'admin',label:'Admin',desc:'Acceso completo' }].map(r => {
                  const isActive = form.rol===r.id
                  return (
                    <button key={r.id} onClick={() => setForm(f=>({...f,rol:r.id}))}
                      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px 8px', borderRadius:10, cursor:'pointer',
                        border: isActive ? '2px solid #10b981' : '2px solid var(--border)',
                        background: isActive ? 'rgba(16,185,129,0.1)' : 'var(--bg-700)', transition:'all 0.15s' }}>
                      <span style={{ fontSize:20 }}>{r.id==='admin' ? '👑' : '🧑‍💼'}</span>
                      <span style={{ fontWeight:700, fontSize:13, color: isActive ? '#34d399' : 'var(--text)' }}>{r.label}</span>
                      <span style={{ fontSize:11, color:'#637a93' }}>{r.desc}</span>
                    </button>
                  )
                })}
              </div>
            </Campo>

            {modal==='edit' && (
              <Campo label="Estado">
                <div onClick={() => setForm(f=>({...f,activo:!f.activo}))}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-700)', borderRadius:10, padding:'11px 14px', cursor:'pointer' }}>
                  <span style={{ fontSize:13, fontWeight:500 }}>Usuario activo</span>
                  <div style={{ width:40, height:22, borderRadius:999, background:form.activo!==false ? '#10b981' : '#374151', position:'relative', transition:'background 0.2s' }}>
                    <div style={{ position:'absolute', top:3, left:form.activo!==false ? 21 : 3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
                  </div>
                </div>
              </Campo>
            )}

            {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : modal==='add' ? 'Crear usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cambiar contraseña */}
      {modal==='password' && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:18, padding:28, width:380, display:'flex', flexDirection:'column', gap:18 }}>
            <h2 style={{ fontSize:18, fontWeight:700 }}>🔑 Cambiar contraseña</h2>
            <p style={{ fontSize:13, color:'#637a93', marginTop:-10 }}>Cuenta: <strong style={{ color:'var(--text)' }}>{usuarioActual?.nombre}</strong></p>

            <Campo label="Contraseña actual" required>
              <input className="input" type="password" placeholder="Tu contraseña actual" value={passForm.passwordActual} onChange={e => setPassForm(f=>({...f,passwordActual:e.target.value}))} />
            </Campo>
            <Campo label="Nueva contraseña" required>
              <input className="input" type="password" placeholder="Mínimo 4 caracteres" value={passForm.passwordNueva} onChange={e => setPassForm(f=>({...f,passwordNueva:e.target.value}))} />
            </Campo>
            <Campo label="Repetir nueva contraseña" required>
              <input className="input" type="password" placeholder="Repite la contraseña" value={passForm.passwordRep} onChange={e => setPassForm(f=>({...f,passwordRep:e.target.value}))} />
            </Campo>

            {passError && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>⚠️ {passError}</div>}
            {passExito && <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#34d399' }}>✓ Contraseña actualizada correctamente</div>}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardarPassword} disabled={guardando||passExito}>
                {guardando ? 'Guardando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar eliminar */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid rgba(239,68,68,0.3)', borderRadius:18, padding:28, width:340, display:'flex', flexDirection:'column', gap:16, textAlign:'center' }}>
            <div style={{ fontSize:36 }}>🗑️</div>
            <div>
              <p style={{ fontWeight:700, fontSize:16 }}>Eliminar usuario</p>
              <p style={{ color:'#637a93', fontSize:13, marginTop:6 }}>¿Eliminar a <strong style={{ color:'var(--text)' }}>{confirmDelete.nombre}</strong>? Esta acción no se puede deshacer.</p>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => eliminar(confirmDelete.id)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
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