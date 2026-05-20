import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts'
import VistaTicket from '../components/VistaTicket'

const fmt  = (n) => `S/ ${Number(n||0).toFixed(2)}`
const fmtH = (f) => new Date(f).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

const METODO_BADGE = {
  'Efectivo': { bg:'rgba(16,185,129,0.15)',  color:'#34d399', icon:'💵' },
  'Yape':     { bg:'rgba(124,58,237,0.15)',  color:'#a78bfa', icon:'📱' },
  'Plin':     { bg:'rgba(14,165,233,0.15)',  color:'#38bdf8', icon:'📲' },
  'Tarjeta':  { bg:'rgba(245,158,11,0.15)',  color:'#fbbf24', icon:'💳' },
}

const TABS = [
  { id:'hoy',    label:'Hoy' },
  { id:'semana', label:'7 días' },
  { id:'mes',    label:'30 días' },
  { id:'6meses', label:'6 meses' },
]

function TooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#111d2b', border:'1px solid #1e3347', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'#637a93', marginBottom:4 }}>{label}</p>
      <p style={{ color:'#34d399', fontWeight:700 }}>{fmt(payload[0]?.value)}</p>
      {payload[1] && <p style={{ color:'#637a93', fontSize:11 }}>{payload[1]?.value} ventas</p>}
    </div>
  )
}

export default function Reportes() {
  const [tab, setTab]                   = useState('hoy')
  const [resumen, setResumen]           = useState(null)
  const [ventasHoy, setVentasHoy]       = useState([])
  const [chartData, setChartData]       = useState([])
  const [topProductos, setTopProductos] = useState([])
  const [detalleVenta, setDetalleVenta] = useState(null)
  const [ventaSel, setVentaSel]         = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [config, setConfig]             = useState({})
  const [modalTicket, setModalTicket]   = useState(null) // venta a reimprimir

  useEffect(() => {
    cargar()
    window.electronAPI.getConfig().then(setConfig)
  }, [tab])

  async function cargar() {
    setCargando(true)
    setDetalleVenta(null); setVentaSel(null)
    if (tab === 'hoy') {
      const [r, v] = await Promise.all([window.electronAPI.getResumenHoy(), window.electronAPI.getVentasHoy()])
      setResumen(r); setVentasHoy(v); setChartData([]); setTopProductos([])
    } else if (tab === 'semana') {
      const [r, c, t] = await Promise.all([window.electronAPI.getResumenPeriodo(7), window.electronAPI.getVentasPorDias(7), window.electronAPI.getTopProductos(7)])
      setResumen(r); setChartData(c); setTopProductos(t); setVentasHoy([])
    } else if (tab === 'mes') {
      const [r, c, t] = await Promise.all([window.electronAPI.getResumenPeriodo(30), window.electronAPI.getVentasPorDias(30), window.electronAPI.getTopProductos(30)])
      setResumen(r); setChartData(c); setTopProductos(t); setVentasHoy([])
    } else if (tab === '6meses') {
      const [r, c, t] = await Promise.all([window.electronAPI.getResumenPeriodo(180), window.electronAPI.getVentasPorMes(), window.electronAPI.getTopProductos(180)])
      setResumen(r); setChartData(c); setTopProductos(t); setVentasHoy([])
    }
    setCargando(false)
  }

  async function verDetalle(venta) {
    setVentaSel(venta)
    const d = await window.electronAPI.getDetalleVenta(venta.id)
    setDetalleVenta(d)
  }

  async function abrirTicket(venta) {
    const detalle = await window.electronAPI.getDetalleVenta(venta.id)
    setModalTicket({ ...venta, items: detalle })
  }

  function imprimirTicket() {
    const contenido = document.getElementById('ticket-imprimible')
    if (!contenido) return
    const w = window.open('', '_blank', 'width=420,height=620')
    w.document.write(`<html><head><title>Ticket #${modalTicket.id}</title>
      <style>body{margin:0;padding:10px;font-family:'Courier New',monospace;}@media print{body{margin:0;}}</style>
      </head><body>${contenido.outerHTML}</body></html>`)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print(); w.close() }, 300)
  }

  const metodosPago = [
    { name:'Efectivo', value:resumen?.efectivo||0, color:'#10b981' },
    { name:'Yape',     value:resumen?.yape||0,     color:'#7c3aed' },
    { name:'Plin',     value:resumen?.plin||0,     color:'#0ea5e9' },
    { name:'Tarjeta',  value:resumen?.tarjeta||0,  color:'#f59e0b' },
  ].filter(m => m.value > 0)

  const stats = [
    { label:'Ventas',         value:resumen?.total_ventas??0, icon:'🧾', color:'#10b981' },
    { label:'Ingresos',       value:fmt(resumen?.ingresos),   icon:'💰', color:'#34d399' },
    { label:'Ticket promedio',value:fmt(resumen?.ticket_promedio), icon:'📊', color:'#f59e0b' },
    { label:'Venta más alta', value:fmt(resumen?.venta_maxima),    icon:'🏆', color:'#818cf8' },
  ]

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'20px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700 }}>Reportes</h1>
            <p className="text-muted" style={{ fontSize:13 }}>{new Date().toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
          </div>
          <button className="btn btn-ghost" onClick={cargar} style={{ fontSize:13 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Actualizar
          </button>
        </div>
        {/* Tabs */}
        <div style={{ display:'flex', gap:4, background:'var(--bg-800)', borderRadius:12, padding:4, width:'fit-content' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding:'8px 20px', borderRadius:9, border:'none', cursor:'pointer', fontSize:13, fontWeight:600, transition:'all 0.15s',
                background: tab===t.id ? 'var(--bg-card)' : 'transparent',
                color: tab===t.id ? '#34d399' : '#637a93',
                boxShadow: tab===t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Contenido scrolleable */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px 24px 24px', display:'flex', flexDirection:'column', gap:16 }}>
        {cargando ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#637a93' }}>Cargando...</div>
        ) : (
          <>
            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
              {stats.map(s => (
                <div key={s.label} style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'14px 16px' }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
                  <div style={{ fontSize:20, fontWeight:800, fontFamily:'JetBrains Mono', color:s.color }}>{s.value}</div>
                  <div style={{ fontSize:12, color:'#637a93', marginTop:3 }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Gráfico de barras */}
            {tab !== 'hoy' && chartData.length > 0 && (
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
                <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>{tab==='6meses' ? 'Ingresos por mes' : 'Ingresos por día'}</p>
                <p style={{ fontSize:12, color:'#637a93', marginBottom:16 }}>{tab==='semana' ? 'Últimos 7 días' : tab==='mes' ? 'Últimos 30 días' : 'Últimos 6 meses'}</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData} margin={{ top:0, right:10, left:10, bottom:0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" vertical={false} />
                    <XAxis dataKey="fecha" tick={{ fill:'#637a93', fontSize:11 }} axisLine={false} tickLine={false} interval={tab==='mes' ? 4 : 0} />
                    <YAxis tick={{ fill:'#637a93', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v => `S/${v}`} width={55} />
                    <Tooltip content={<TooltipBar />} cursor={{ fill:'rgba(255,255,255,0.04)' }} />
                    <Bar dataKey="ingresos" radius={[6,6,0,0]} maxBarSize={40}>
                      {chartData.map((entry,i) => (
                        <Cell key={i} fill={entry.esHoy||entry.esActual ? '#34d399' : '#10b981'} opacity={entry.ingresos===0 ? 0.3 : 1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Métodos de pago + Top productos / Historial */}
            <div style={{ display:'grid', gridTemplateColumns: tab==='hoy' ? '1fr 1fr' : '340px 1fr', gap:16 }}>

              {/* Métodos de pago */}
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
                <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Métodos de pago</p>
                <p style={{ fontSize:12, color:'#637a93', marginBottom:12 }}>Distribución de ingresos</p>
                {metodosPago.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'30px 0', color:'#637a93', fontSize:13 }}>Sin datos en este período</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={metodosPago} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                          {metodosPago.map((m,i) => <Cell key={i} fill={m.color} />)}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} contentStyle={{ background:'#111d2b', border:'1px solid #1e3347', borderRadius:8, fontSize:12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:4 }}>
                      {metodosPago.map(m => {
                        const pct = resumen?.ingresos ? ((m.value/resumen.ingresos)*100).toFixed(0) : 0
                        return (
                          <div key={m.name} style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                              <div style={{ width:10, height:10, borderRadius:3, background:m.color }} />
                              <span style={{ fontSize:13 }}>{METODO_BADGE[m.name]?.icon} {m.name}</span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <span style={{ fontSize:12, color:'#637a93' }}>{pct}%</span>
                              <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, fontSize:13, color:m.color }}>{fmt(m.value)}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>

              {tab === 'hoy' ? (
                /* Historial con botón reimprimir */
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, display:'flex', flexDirection:'column', overflow:'hidden' }}>
                  <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <p style={{ fontWeight:700, fontSize:15 }}>Ventas de hoy</p>
                    <span className="badge badge-emerald">{ventasHoy.length} ventas</span>
                  </div>
                  <div style={{ overflowY:'auto', flex:1 }}>
                    {ventasHoy.length === 0 ? (
                      <div style={{ textAlign:'center', padding:40, color:'#637a93' }}>
                        <div style={{ fontSize:32, marginBottom:8 }}>📭</div>No hay ventas registradas hoy
                      </div>
                    ) : (
                      <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom:'1px solid var(--border)' }}>
                            {['#','Hora','Método','Ítems','Total','',''].map((h,i) => (
                              <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {ventasHoy.map((v,i) => {
                            const badge = METODO_BADGE[v.metodo_pago] || METODO_BADGE['Efectivo']
                            return (
                              <tr key={v.id}
                                style={{ borderBottom: i<ventasHoy.length-1 ? '1px solid rgba(30,51,71,0.6)' : 'none',
                                  background: ventaSel?.id===v.id ? 'rgba(16,185,129,0.06)' : 'transparent' }}
                                onMouseEnter={e => { if (ventaSel?.id!==v.id) e.currentTarget.style.background='rgba(255,255,255,0.02)' }}
                                onMouseLeave={e => { if (ventaSel?.id!==v.id) e.currentTarget.style.background='transparent' }}>
                                <td style={{ padding:'10px 14px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>#{v.id}</td>
                                <td style={{ padding:'10px 14px', fontSize:13 }}>{fmtH(v.fecha)}</td>
                                <td style={{ padding:'10px 14px' }}>
                                  <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:badge.bg, color:badge.color, borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                                    {badge.icon} {v.metodo_pago}
                                  </span>
                                </td>
                                <td style={{ padding:'10px 14px' }}><span className="badge badge-gray">{v.num_productos}</span></td>
                                <td style={{ padding:'10px 14px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981' }}>{fmt(v.total)}</td>
                                {/* Ver detalle */}
                                <td style={{ padding:'10px 8px' }}>
                                  <button onClick={() => verDetalle(v)}
                                    style={{ background:'var(--bg-700)', border:'1px solid var(--border)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'#637a93', fontSize:12, fontWeight:600 }}>
                                    Ver
                                  </button>
                                </td>
                                {/* Reimprimir ticket */}
                                <td style={{ padding:'10px 14px 10px 4px' }}>
                                  <button onClick={() => abrirTicket(v)}
                                    title="Reimprimir ticket"
                                    style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:8, padding:'5px 10px', cursor:'pointer', color:'#34d399', fontSize:13, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
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
                </div>
              ) : (
                /* Top productos */
                <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
                  <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Top productos</p>
                  <p style={{ fontSize:12, color:'#637a93', marginBottom:16 }}>
                    {tab==='semana' ? 'Más vendidos en 7 días' : tab==='mes' ? 'Más vendidos en 30 días' : 'Más vendidos en 6 meses'}
                  </p>
                  {topProductos.length === 0 ? (
                    <div style={{ textAlign:'center', padding:'30px 0', color:'#637a93', fontSize:13 }}>Sin datos en este período</div>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {topProductos.map((p,i) => {
                        const pct = (p.cantidad / (topProductos[0]?.cantidad||1)) * 100
                        return (
                          <div key={p.nombre} style={{ display:'flex', alignItems:'center', gap:12 }}>
                            <span style={{ fontSize:13, fontWeight:800, color:'#637a93', minWidth:20, textAlign:'right' }}>#{i+1}</span>
                            <div style={{ flex:1 }}>
                              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                <span style={{ fontSize:13, fontWeight:600 }}>{p.nombre}</span>
                                <div style={{ display:'flex', gap:12 }}>
                                  <span style={{ fontSize:12, color:'#637a93' }}>{p.cantidad} uds</span>
                                  <span style={{ fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, color:'#10b981' }}>{fmt(p.ingresos)}</span>
                                </div>
                              </div>
                              <div style={{ height:6, background:'var(--bg-700)', borderRadius:999, overflow:'hidden' }}>
                                <div style={{ width:`${pct}%`, height:'100%', background: i===0 ? '#34d399' : '#10b981', borderRadius:999, opacity: 0.6 + (0.4 * pct/100) }} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Detalle de venta expandido */}
            {tab === 'hoy' && ventaSel && detalleVenta && (
              <div style={{ background:'var(--bg-card)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:14, padding:'18px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:15 }}>Detalle — Venta #{ventaSel.id}</p>
                    <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>{fmtH(ventaSel.fecha)} · {ventaSel.metodo_pago} · Total: <strong style={{ color:'#34d399' }}>{fmt(ventaSel.total)}</strong></p>
                  </div>
                  <button onClick={() => { setVentaSel(null); setDetalleVenta(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:10 }}>
                  {detalleVenta.map(d => (
                    <div key={d.id} style={{ background:'var(--bg-700)', borderRadius:10, padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <p style={{ fontWeight:600, fontSize:13 }}>{d.nombre_producto}</p>
                        <p style={{ fontSize:11, color:'#637a93', marginTop:2 }}>{d.cantidad} × {fmt(d.precio_unitario)}</p>
                      </div>
                      <span style={{ fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981', fontSize:13 }}>{fmt(d.subtotal)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Modal reimprimir ticket ─── */}
      {modalTicket && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:200 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:24, width:500, maxHeight:'90vh', display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:17, fontWeight:700 }}>🖨️ Reimprimir ticket</h2>
                <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>Venta #{modalTicket.id} · {fmtH(modalTicket.fecha)} · {fmt(modalTicket.total)}</p>
              </div>
              <button onClick={() => setModalTicket(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>
            {/* Vista previa */}
            <div style={{ overflowY:'auto', background:'#f5f5f5', borderRadius:12, padding:16, display:'flex', justifyContent:'center' }}>
              <VistaTicket venta={modalTicket} config={config} />
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModalTicket(null)}>Cerrar</button>
              <button className="btn btn-primary" style={{ flex:1, fontSize:15 }} onClick={imprimirTicket}>
                🖨️ Imprimir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}