import React, { useState, useEffect } from 'react'
import VistaTicket from '../components/VistaTicket'

const fmt     = (n) => `S/ ${Number(n||0).toFixed(2)}`
const fmtDate = (f) => new Date(f).toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
const fmtHora = (f) => new Date(f).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

// Fechas en formato ISO YYYY-MM-DD para compatibilidad con la BD
function getFechaHoy() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function getFecha30() {
  const d = new Date(Date.now() - 30*24*60*60*1000)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const METODO_BADGE = {
  'Efectivo': { bg:'rgba(16,185,129,0.15)',  color:'#34d399', icon:'💵' },
  'Yape':     { bg:'rgba(124,58,237,0.15)',  color:'#a78bfa', icon:'📱' },
  'Plin':     { bg:'rgba(14,165,233,0.15)',  color:'#38bdf8', icon:'📲' },
  'Tarjeta':  { bg:'rgba(245,158,11,0.15)',  color:'#fbbf24', icon:'💳' },
  'Fiado':    { bg:'rgba(239,68,68,0.15)',   color:'#f87171', icon:'📋' },
}

export default function Historial() {
  const [filtros, setFiltros]           = useState({ fechaDesde:getFecha30(), fechaHasta:getFechaHoy(), metodoPago:'Todos', usuarioId:'', soloFiado:false, busqueda:'', pagina:1 })
  const [resultado, setResultado]       = useState(null)
  const [usuarios, setUsuarios]         = useState([])
  const [detalleVenta, setDetalleVenta] = useState(null)
  const [ventaSel, setVentaSel]         = useState(null)
  const [config, setConfig]             = useState({})
  const [modalTicket, setModalTicket]   = useState(null)
  const [cargando, setCargando]         = useState(false)

  useEffect(() => {
    window.electronAPI.getUsuarios().then(setUsuarios)
    window.electronAPI.getConfig().then(setConfig)
    const f = {
      fechaDesde: getFecha30(),
      fechaHasta: getFechaHoy(),
      metodoPago: 'Todos', usuarioId: '', soloFiado: false, busqueda: '', pagina: 1
    }
    setFiltros(f)
    buscar(f)
  }, [])

  async function buscar(f) {
    setCargando(true)
    const result = await window.electronAPI.getHistorialVentas(f)
    setResultado(result)
    setDetalleVenta(null)
    setVentaSel(null)
    setCargando(false)
  }

  function setFiltro(key, val) {
    setFiltros(prev => ({ ...prev, [key]:val, pagina:1 }))
  }

  function handleBuscar() { buscar({ ...filtros, pagina:1 }) }

  function handleLimpiar() {
    const f = { fechaDesde:getFecha30(), fechaHasta:getFechaHoy(), metodoPago:'Todos', usuarioId:'', soloFiado:false, busqueda:'', pagina:1 }
    setFiltros(f); buscar(f)
  }

  function handlePagina(p) {
    const f = { ...filtros, pagina:p }
    setFiltros(f); buscar(f)
  }

  async function verDetalle(venta) {
    if (ventaSel?.id === venta.id) { setVentaSel(null); setDetalleVenta(null); return }
    setVentaSel(venta)
    const d = await window.electronAPI.getDetalleVenta(venta.id)
    setDetalleVenta(d)
  }

  async function abrirTicket(venta) {
    const detalle = await window.electronAPI.getDetalleVenta(venta.id)
    setModalTicket({ ...venta, items:detalle })
  }

  function imprimirTicket() {
    const contenido = document.getElementById('ticket-imprimible')
    if (!contenido) return
    const w = window.open('', '_blank', 'width=420,height=620')
    w.document.write(`<html><head><title>Ticket #${modalTicket.id}</title><style>body{margin:0;padding:10px;font-family:'Courier New',monospace;}@media print{body{margin:0;}}</style></head><body>${contenido.outerHTML}</body></html>`)
    w.document.close(); w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const ventas = resultado?.ventas || []

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 16px', flexShrink:0 }}>
        <h1 style={{ fontSize:20, fontWeight:700 }}>Historial de Ventas</h1>
        <p className="text-muted" style={{ fontSize:13, marginTop:2 }}>
          {resultado ? `${resultado.cantidadTotal} venta${resultado.cantidadTotal!==1?'s':''} · Total: ${fmt(resultado.totalPeriodo)}` : 'Cargando...'}
        </p>
      </div>

      {/* Filtros */}
      <div style={{ padding:'0 24px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Desde</label>
            <input className="input" type="date" style={{ width:150 }}
              value={filtros.fechaDesde} onChange={e => setFiltro('fechaDesde', e.target.value)} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Hasta</label>
            <input className="input" type="date" style={{ width:150 }}
              value={filtros.fechaHasta} onChange={e => setFiltro('fechaHasta', e.target.value)} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Método</label>
            <select className="input" style={{ width:140 }}
              value={filtros.metodoPago} onChange={e => setFiltro('metodoPago', e.target.value)}>
              {['Todos','Efectivo','Yape','Plin','Tarjeta','Fiado'].map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Cajero</label>
            <select className="input" style={{ width:160 }}
              value={filtros.usuarioId} onChange={e => setFiltro('usuarioId', e.target.value ? parseInt(e.target.value) : '')}>
              <option value="">Todos</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:180 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Buscar</label>
            <input className="input" placeholder="N° venta o cliente..."
              value={filtros.busqueda} onChange={e => setFiltro('busqueda', e.target.value)}
              onKeyDown={e => { if(e.key==='Enter') handleBuscar() }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>Solo fiado</label>
            <div onClick={() => setFiltro('soloFiado', !filtros.soloFiado)}
              style={{ height:42, display:'flex', alignItems:'center', gap:8, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, padding:'0 14px', cursor:'pointer', userSelect:'none' }}>
              <div style={{ width:36, height:20, borderRadius:999, background:filtros.soloFiado?'#ef4444':'#374151', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:2, left:filtros.soloFiado?18:2, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
              </div>
              <span style={{ fontSize:13, color:filtros.soloFiado?'#f87171':'#637a93', fontWeight:filtros.soloFiado?700:400 }}>📋</span>
            </div>
          </div>

          <button className="btn btn-primary" onClick={handleBuscar} disabled={cargando} style={{ height:42, paddingTop:0, paddingBottom:0 }}>
            {cargando ? '...' : '🔍 Buscar'}
          </button>
          <button className="btn btn-ghost" onClick={handleLimpiar} style={{ height:42, paddingTop:0, paddingBottom:0 }}>
            Limpiar
          </button>
        </div>

        {resultado && resultado.cantidadTotal > 0 && (
          <div style={{ display:'flex', gap:10 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:600, color:'#637a93' }}>
              {resultado.cantidadTotal} ventas
            </div>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:600, color:'#34d399' }}>
              Total: {fmt(resultado.totalPeriodo)}
            </div>
          </div>
        )}
      </div>

      {/* Tabla + Detalle */}
      <div style={{ flex:1, overflow:'hidden', display:'flex', flexDirection:'column', padding:'0 24px 24px', gap:12 }}>
        <div style={{ flex:1, overflow:'hidden', display:'flex', gap:14 }}>

          <div style={{ flex:1, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{ overflowY:'auto', flex:1 }}>
              {cargando ? (
                <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>Buscando...</div>
              ) : ventas.length === 0 ? (
                <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🔍</div>
                  <p>No se encontraron ventas con los filtros actuales</p>
                  <p style={{ fontSize:12, marginTop:8, color:'#3a5068' }}>Intenta cambiar el rango de fechas</p>
                </div>
              ) : (
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-card)', zIndex:1 }}>
                      {['#','Fecha','Hora','Método','Cajero','Cliente','Ítems','Total',''].map(h => (
                        <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.map((v,i) => {
                      const badge = METODO_BADGE[v.metodo_pago] || METODO_BADGE['Efectivo']
                      const selec = ventaSel?.id === v.id
                      return (
                        <tr key={v.id}
                          style={{ borderBottom:i<ventas.length-1?'1px solid rgba(30,51,71,0.6)':'none', background:selec?'rgba(16,185,129,0.06)':'transparent', cursor:'pointer' }}
                          onMouseEnter={e => { if(!selec) e.currentTarget.style.background='rgba(255,255,255,0.02)' }}
                          onMouseLeave={e => { if(!selec) e.currentTarget.style.background='transparent' }}
                          onClick={() => verDetalle(v)}>
                          <td style={{ padding:'10px 14px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>#{v.id}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, whiteSpace:'nowrap' }}>{fmtDate(v.fecha)}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, color:'#637a93' }}>{fmtHora(v.fecha)}</td>
                          <td style={{ padding:'10px 14px' }}>
                            <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:badge.bg, color:badge.color, borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600, whiteSpace:'nowrap' }}>
                              {badge.icon} {v.metodo_pago}
                            </span>
                          </td>
                          <td style={{ padding:'10px 14px', fontSize:13, color:'#637a93' }}>{v.nombre_usuario||'—'}</td>
                          <td style={{ padding:'10px 14px', fontSize:13, color:'#637a93' }}>{v.nombre_cliente||'—'}</td>
                          <td style={{ padding:'10px 14px' }}><span className="badge badge-gray">{v.num_productos}</span></td>
                          <td style={{ padding:'10px 14px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981', whiteSpace:'nowrap' }}>{fmt(v.total)}</td>
                          <td style={{ padding:'10px 10px' }}>
                            <button onClick={e => { e.stopPropagation(); abrirTicket(v) }}
                              title="Reimprimir ticket"
                              style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, padding:'5px 9px', cursor:'pointer', color:'#34d399', fontSize:13 }}>
                              🖨️
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {resultado && resultado.totalPaginas > 1 && (
              <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
                <span style={{ fontSize:13, color:'#637a93' }}>Página {resultado.paginaActual} de {resultado.totalPaginas}</span>
                <div style={{ display:'flex', gap:6 }}>
                  <button className="btn btn-ghost" style={{ padding:'6px 14px', fontSize:13 }}
                    onClick={() => handlePagina(resultado.paginaActual-1)} disabled={resultado.paginaActual<=1}>← Anterior</button>
                  {Array.from({length:Math.min(resultado.totalPaginas,5)},(_,i)=>{
                    let p=i+1
                    if(resultado.totalPaginas>5){const s=Math.max(1,resultado.paginaActual-2);p=s+i;if(p>resultado.totalPaginas)return null}
                    return(
                      <button key={p} onClick={()=>handlePagina(p)}
                        style={{ width:36,height:36,borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s',
                          background:resultado.paginaActual===p?'#10b981':'var(--bg-700)',
                          color:resultado.paginaActual===p?'white':'#637a93' }}>
                        {p}
                      </button>
                    )
                  })}
                  <button className="btn btn-ghost" style={{ padding:'6px 14px', fontSize:13 }}
                    onClick={() => handlePagina(resultado.paginaActual+1)} disabled={resultado.paginaActual>=resultado.totalPaginas}>Siguiente →</button>
                </div>
              </div>
            )}
          </div>

          {/* Panel detalle */}
          {ventaSel && detalleVenta && (
            <div style={{ width:280, background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>
              <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontWeight:700, fontSize:15 }}>Venta #{ventaSel.id}</p>
                  <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>{fmtDate(ventaSel.fecha)} {fmtHora(ventaSel.fecha)}</p>
                </div>
                <button onClick={() => { setVentaSel(null); setDetalleVenta(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>
              </div>
              <div style={{ flex:1, overflowY:'auto', padding:16, display:'flex', flexDirection:'column', gap:8 }}>
                {detalleVenta.map(d => (
                  <div key={d.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', padding:'8px 0', borderBottom:'1px solid rgba(30,51,71,0.5)' }}>
                    <div>
                      <p style={{ fontSize:13, fontWeight:600 }}>{d.nombre_producto}</p>
                      <p style={{ fontSize:11, color:'#637a93', marginTop:2 }}>{d.cantidad} × S/{Number(d.precio_unitario).toFixed(2)}</p>
                    </div>
                    <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:13, color:'#10b981' }}>S/{Number(d.subtotal).toFixed(2)}</span>
                  </div>
                ))}
                <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:6 }}>
                  {ventaSel.descuento>0 && (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#637a93' }}>
                        <span>Subtotal</span>
                        <span style={{ fontFamily:'JetBrains Mono' }}>{fmt(ventaSel.subtotal_bruto)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#f59e0b' }}>
                        <span>Descuento</span>
                        <span style={{ fontFamily:'JetBrains Mono' }}>−{fmt(ventaSel.descuento)}</span>
                      </div>
                    </>
                  )}
                  <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700 }}>
                    <span>Total</span>
                    <span style={{ fontFamily:'JetBrains Mono', color:'#34d399', fontSize:16 }}>{fmt(ventaSel.total)}</span>
                  </div>
                  {ventaSel.metodo_pago==='Efectivo' && (
                    <>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#637a93' }}>
                        <span>Recibido</span><span style={{ fontFamily:'JetBrains Mono' }}>{fmt(ventaSel.monto_recibido)}</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'#f59e0b' }}>
                        <span>Vuelto</span><span style={{ fontFamily:'JetBrains Mono' }}>{fmt(ventaSel.vuelto)}</span>
                      </div>
                    </>
                  )}
                  {ventaSel.nombre_cliente && (
                    <div style={{ marginTop:4, background:'rgba(239,68,68,0.08)', borderRadius:8, padding:'8px 12px', fontSize:12, color:'#f87171' }}>
                      📋 Cliente: <strong>{ventaSel.nombre_cliente}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal ticket */}
      {modalTicket && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:24, width:500, maxHeight:'90vh', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:17, fontWeight:700 }}>🖨️ Ticket #{modalTicket.id}</h2>
              <button onClick={() => setModalTicket(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>
            <div style={{ overflowY:'auto', background:'#f5f5f5', borderRadius:12, padding:16, display:'flex', justifyContent:'center' }}>
              <VistaTicket venta={modalTicket} config={config} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModalTicket(null)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={imprimirTicket}>🖨️ Imprimir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}