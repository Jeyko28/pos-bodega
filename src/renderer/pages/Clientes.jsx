import React, { useState, useEffect } from 'react'

const fmt = (n) => `S/ ${Number(n||0).toFixed(2)}`
const fmtFecha = (f) => new Date(f).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

const emptyForm = { nombre:'', telefono:'', referencia:'', dni_ruc:'' }

export default function Clientes() {
  const [clientes, setClientes]         = useState([])
  const [busqueda, setBusqueda]         = useState('')
  const [resumenFiado, setResumenFiado] = useState(null)
  const [modal, setModal]               = useState(null) // 'add'|'edit'|'fiado'|'pagar'
  const [form, setForm]                 = useState(emptyForm)
  const [editId, setEditId]             = useState(null)
  const [clienteSel, setClienteSel]     = useState(null)
  const [fiadoCliente, setFiadoCliente] = useState([])
  const [guardando, setGuardando]       = useState(false)
  const [error, setError]               = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Fiado manual
  const [fiadoForm, setFiadoForm] = useState({ monto:'', concepto:'' })
  // Pago
  const [pagoForm, setPagoForm]   = useState({ fiadoId:null, monto:'' })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const [c, r] = await Promise.all([
      window.electronAPI.getClientes(),
      window.electronAPI.getResumenFiado(),
    ])
    setClientes(c)
    setResumenFiado(r)
  }

  // Búsqueda también por DNI/RUC
  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.telefono && c.telefono.includes(busqueda)) ||
    (c.dni_ruc  && c.dni_ruc.includes(busqueda))
  )

  function abrirAgregar() { setForm(emptyForm); setEditId(null); setError(''); setModal('add') }

  function abrirEditar(c) {
    setForm({ nombre:c.nombre, telefono:c.telefono||'', referencia:c.referencia||'', dni_ruc:c.dni_ruc||'' })
    setEditId(c.id); setError(''); setModal('edit')
  }

  async function abrirFiado(c) {
    setClienteSel(c)
    const fiado = await window.electronAPI.getFiadoCliente(c.id)
    setFiadoCliente(fiado)
    setFiadoForm({ monto:'', concepto:'' })
    setModal('fiado')
  }

  async function guardar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return }
    setGuardando(true); setError('')
    if (modal === 'add') {
      await window.electronAPI.addCliente(form)
    } else {
      await window.electronAPI.updateCliente({ ...form, id: editId })
    }
    setGuardando(false); setModal(null); cargar()
  }

  async function eliminar(id) {
    const result = await window.electronAPI.deleteCliente(id)
    if (!result.success) { alert(result.error); return }
    setConfirmDelete(null); cargar()
  }

  async function agregarFiado() {
    if (!fiadoForm.monto || parseFloat(fiadoForm.monto) <= 0) return
    await window.electronAPI.addFiado({
      clienteId: clienteSel.id,
      monto:     parseFloat(fiadoForm.monto),
      concepto:  fiadoForm.concepto || 'Fiado manual',
    })
    setFiadoForm({ monto:'', concepto:'' })
    const fiado = await window.electronAPI.getFiadoCliente(clienteSel.id)
    setFiadoCliente(fiado)
    cargar()
  }

  async function registrarPago() {
    if (!pagoForm.fiadoId || !pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return
    await window.electronAPI.pagarFiado({
      fiadoId: pagoForm.fiadoId,
      monto:   parseFloat(pagoForm.monto),
    })
    setPagoForm({ fiadoId:null, monto:'' })
    const fiado = await window.electronAPI.getFiadoCliente(clienteSel.id)
    setFiadoCliente(fiado)
    cargar()
  }

  const deudaTotal = fiadoCliente.filter(f=>f.estado==='pendiente').reduce((s,f)=>s+f.saldo,0)

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 16px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Clientes</h1>
          <p className="text-muted" style={{ fontSize:13 }}>{clientes.length} clientes registrados</p>
        </div>
        <button className="btn btn-primary" onClick={abrirAgregar}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo cliente
        </button>
      </div>

      {/* Cards resumen fiado */}
      {resumenFiado && (
        <div style={{ padding:'0 24px 16px', flexShrink:0, display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {[
            { label:'Total en fiado',     value:fmt(resumenFiado.total_deuda), icon:'📋', color:'#ef4444' },
            { label:'Clientes con deuda', value:resumenFiado.clientes_deuda,   icon:'👥', color:'#f59e0b' },
            { label:'Cuentas pendientes', value:resumenFiado.total_fiados,     icon:'🧾', color:'#637a93' },
          ].map(s => (
            <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <span style={{ fontSize:24 }}>{s.icon}</span>
              <div>
                <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:18, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'#637a93' }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Buscador */}
      <div style={{ padding:'0 24px 12px', flexShrink:0 }}>
        <div style={{ position:'relative', maxWidth:440 }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input" style={{ paddingLeft:40 }} placeholder="Buscar por nombre, teléfono o DNI/RUC..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {busqueda && <button onClick={() => setBusqueda('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>✕</button>}
        </div>
      </div>

      {/* Lista de clientes */}
      <div style={{ flex:1, overflowY:'auto', padding:'0 24px 24px' }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          {filtrados.length === 0 ? (
            <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
              <p>{busqueda ? `No se encontró "${busqueda}"` : 'No hay clientes registrados'}</p>
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Cliente','DNI / RUC','Teléfono','Referencia','Deuda','Acciones'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.6, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => (
                  <tr key={c.id}
                    style={{ borderBottom: i<filtrados.length-1 ? '1px solid rgba(30,51,71,0.6)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#1e3347,#2a4a65)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#34d399', flexShrink:0 }}>
                          {c.nombre.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600 }}>{c.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {c.dni_ruc
                        ? <span style={{ fontFamily:'JetBrains Mono', fontSize:13, color:'var(--text)', fontWeight:600 }}>{c.dni_ruc}</span>
                        : <span style={{ color:'#3a5068', fontSize:13 }}>—</span>
                      }
                    </td>
                    <td style={{ padding:'12px 16px', fontFamily:'JetBrains Mono', fontSize:13, color:'#637a93' }}>{c.telefono||'—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'#637a93' }}>{c.referencia||'—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {c.deuda_total > 0
                        ? <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#ef4444', fontSize:14 }}>{fmt(c.deuda_total)}</span>
                        : <span className="badge badge-emerald">Al día</span>
                      }
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:8 }}>
                        <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:13 }} onClick={() => abrirFiado(c)}>
                          📋 Fiado
                        </button>
                        <button className="btn btn-ghost" style={{ padding:'6px 12px', fontSize:13 }} onClick={() => abrirEditar(c)}>Editar</button>
                        <button className="btn btn-danger" style={{ padding:'6px 12px', fontSize:13 }} onClick={() => setConfirmDelete(c)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal Agregar/Editar cliente */}
      {(modal==='add'||modal==='edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:18, padding:28, width:440, display:'flex', flexDirection:'column', gap:16 }}>
            <h2 style={{ fontSize:18, fontWeight:700 }}>{modal==='add' ? 'Nuevo cliente' : 'Editar cliente'}</h2>

            <Campo label="Nombre completo" required>
              <input className="input" placeholder="Ej: María García"
                value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} autoFocus />
            </Campo>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Campo label="DNI / RUC">
                <input className="input" style={{ fontFamily:'JetBrains Mono' }}
                  placeholder="Ej: 45678901"
                  value={form.dni_ruc} onChange={e => setForm(f=>({...f,dni_ruc:e.target.value.trim()}))} />
              </Campo>
              <Campo label="Teléfono">
                <input className="input" placeholder="Ej: 987654321"
                  value={form.telefono} onChange={e => setForm(f=>({...f,telefono:e.target.value}))} style={{ fontFamily:'JetBrains Mono' }} />
              </Campo>
            </div>

            <Campo label="Referencia / Dirección">
              <input className="input" placeholder="Ej: Vecino calle Los Pinos"
                value={form.referencia} onChange={e => setForm(f=>({...f,referencia:e.target.value}))} />
            </Campo>

            {/* Aviso SUNAT */}
            <div style={{ background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:10, padding:'10px 14px', fontSize:12, color:'#38bdf8' }}>
              ℹ️ El DNI/RUC es necesario para boletas de venta que superen S/ 700 (requisito SUNAT).
            </div>

            {error && <div style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>⚠️ {error}</div>}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar} disabled={guardando}>
                {guardando ? 'Guardando...' : modal==='add' ? 'Agregar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fiado del cliente */}
      {modal==='fiado' && clienteSel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:560, maxHeight:'85vh', display:'flex', flexDirection:'column', gap:16 }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>📋 Fiado — {clienteSel.nombre}</h2>
                {clienteSel.dni_ruc && (
                  <p style={{ fontSize:12, color:'#637a93', marginTop:2, fontFamily:'JetBrains Mono' }}>
                    DNI/RUC: {clienteSel.dni_ruc}
                  </p>
                )}
                <p style={{ fontSize:13, color: deudaTotal>0 ? '#ef4444' : '#34d399', marginTop:2, fontFamily:'JetBrains Mono', fontWeight:700 }}>
                  {deudaTotal>0 ? `Deuda: ${fmt(deudaTotal)}` : '✓ Sin deuda pendiente'}
                </p>
              </div>
              <button onClick={() => setModal(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            {/* Agregar fiado manual */}
            <div style={{ background:'var(--bg-700)', borderRadius:12, padding:16, display:'flex', gap:10, alignItems:'flex-end' }}>
              <div style={{ flex:1 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>Concepto</label>
                <input className="input" placeholder="Ej: Abarrotes del día"
                  value={fiadoForm.concepto} onChange={e => setFiadoForm(f=>({...f,concepto:e.target.value}))} />
              </div>
              <div style={{ width:120 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, display:'block', marginBottom:6 }}>Monto S/</label>
                <input className="input" type="number" min="0.1" placeholder="0.00"
                  value={fiadoForm.monto} onChange={e => setFiadoForm(f=>({...f,monto:e.target.value}))}
                  style={{ fontFamily:'JetBrains Mono', fontWeight:700 }} />
              </div>
              <button className="btn btn-primary" style={{ padding:'10px 16px', fontSize:13, flexShrink:0 }}
                onClick={agregarFiado} disabled={!fiadoForm.monto||parseFloat(fiadoForm.monto)<=0}>
                + Agregar
              </button>
            </div>

            {/* Lista de fiados */}
            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 }}>
              {fiadoCliente.length === 0 ? (
                <div style={{ textAlign:'center', padding:'30px 0', color:'#637a93', fontSize:13 }}>
                  <div style={{ fontSize:32, marginBottom:8 }}>📭</div>
                  No hay registros de fiado para este cliente
                </div>
              ) : fiadoCliente.map(f => (
                <div key={f.id} style={{ background:'var(--bg-card)', border:`1px solid ${f.estado==='pendiente' ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`, borderRadius:12, padding:'14px 16px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
                    <div>
                      <p style={{ fontWeight:600, fontSize:14 }}>{f.concepto}</p>
                      <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>{fmtFecha(f.fecha)}</p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:16, color: f.estado==='pendiente' ? '#ef4444' : '#34d399' }}>
                        {fmt(f.saldo)}
                      </div>
                      <div style={{ fontSize:11, color:'#637a93' }}>de {fmt(f.monto_original)}</div>
                    </div>
                  </div>

                  <div style={{ height:4, background:'var(--bg-700)', borderRadius:999, overflow:'hidden', marginBottom:8 }}>
                    <div style={{ height:'100%', borderRadius:999, background: f.estado==='pagado' ? '#10b981' : '#ef4444', width:`${((f.monto_original-f.saldo)/f.monto_original)*100}%` }} />
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span className={f.estado==='pendiente' ? 'badge badge-red' : 'badge badge-emerald'}>
                      {f.estado==='pendiente' ? '⏳ Pendiente' : '✓ Pagado'}
                    </span>
                    {f.estado==='pendiente' && (
                      pagoForm.fiadoId===f.id ? (
                        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                          <input className="input" type="number" min="0.1" max={f.saldo}
                            placeholder={`Máx ${fmt(f.saldo)}`}
                            value={pagoForm.monto} onChange={e => setPagoForm(p=>({...p,monto:e.target.value}))}
                            style={{ width:120, fontFamily:'JetBrains Mono', fontWeight:700, fontSize:14 }} autoFocus />
                          <button className="btn btn-primary" style={{ padding:'7px 14px', fontSize:13 }} onClick={registrarPago}>✓ Pagar</button>
                          <button className="btn btn-ghost" style={{ padding:'7px 12px', fontSize:13 }} onClick={() => setPagoForm({fiadoId:null,monto:''})}>✕</button>
                        </div>
                      ) : (
                        <button className="btn btn-ghost" style={{ fontSize:13, padding:'6px 14px', color:'#10b981', borderColor:'rgba(16,185,129,0.3)' }}
                          onClick={() => setPagoForm({ fiadoId:f.id, monto:String(f.saldo) })}>
                          💵 Registrar pago
                        </button>
                      )
                    )}
                  </div>

                  {f.pagos && f.pagos.length > 0 && (
                    <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid rgba(30,51,71,0.5)' }}>
                      <p style={{ fontSize:11, color:'#637a93', marginBottom:6, fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Pagos registrados</p>
                      {f.pagos.map(p => (
                        <div key={p.id} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#637a93', marginBottom:2 }}>
                          <span>{fmtFecha(p.fecha)}</span>
                          <span style={{ fontFamily:'JetBrains Mono', color:'#34d399', fontWeight:600 }}>+{fmt(p.monto)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
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
              <p style={{ fontWeight:700, fontSize:16 }}>Eliminar cliente</p>
              <p style={{ color:'#637a93', fontSize:13, marginTop:6 }}>
                ¿Eliminar a <strong style={{ color:'var(--text)' }}>{confirmDelete.nombre}</strong>?
                {confirmDelete.deuda_total>0 && <><br/><span style={{ color:'#ef4444' }}>⚠️ Tiene deuda de {fmt(confirmDelete.deuda_total)}</span></>}
              </p>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => eliminar(confirmDelete.id)}>Eliminar</button>
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