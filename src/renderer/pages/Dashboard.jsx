import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSesion } from '../App'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const fmt = (n) => `S/ ${Number(n||0).toFixed(2)}`
const fmtHora = (f) => new Date(f).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

function TooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background:'#111d2b', border:'1px solid #1e3347', borderRadius:10, padding:'10px 14px', fontSize:13 }}>
      <p style={{ color:'#637a93', marginBottom:4 }}>{label}</p>
      <p style={{ color:'#34d399', fontWeight:700 }}>{fmt(payload[0]?.value)}</p>
    </div>
  )
}

const METODO_COLOR = { Efectivo:'#10b981', Yape:'#7c3aed', Plin:'#0ea5e9', Tarjeta:'#f59e0b', Fiado:'#ef4444' }
const METODO_ICON  = { Efectivo:'💵', Yape:'📱', Plin:'📲', Tarjeta:'💳', Fiado:'📋' }

export default function Dashboard() {
  const { usuario } = useSesion()
  const navigate    = useNavigate()
  const esAdmin     = usuario?.rol === 'admin'

  const [resumen, setResumen]           = useState(null)
  const [resumenFiado, setResumenFiado] = useState(null)
  const [alertas, setAlertas]           = useState([])
  const [chartData, setChartData]       = useState([])
  const [ventasHoy, setVentasHoy]       = useState([])
  const [turno, setTurno]               = useState(null)
  const [cargando, setCargando]         = useState(true)
  const [hora, setHora]                 = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setCargando(true)
    const promesas = [
      window.electronAPI.getProductosBajoStock(),
      window.electronAPI.getVentasHoy(),
      window.electronAPI.getTurnoActivo(usuario?.id),
    ]
    if (esAdmin) {
      promesas.push(
        window.electronAPI.getResumenHoy(),
        window.electronAPI.getResumenFiado(),
        window.electronAPI.getVentasPorDias(7),
      )
    }
    const resultados = await Promise.all(promesas)
    setAlertas(resultados[0])
    setVentasHoy(resultados[1])
    setTurno(resultados[2])
    if (esAdmin) {
      setResumen(resultados[3])
      setResumenFiado(resultados[4])
      setChartData(resultados[5])
    }
    setCargando(false)
  }

  async function handleToggleTurno() {
    if (turno) await window.electronAPI.cerrarTurno(usuario.id)
    else       await window.electronAPI.abrirTurno(usuario.id)
    const t = await window.electronAPI.getTurnoActivo(usuario.id)
    setTurno(t)
  }

  const saludoHora = () => {
    const h = hora.getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  // Ventas del cajero actual (hoy)
  const ventasPropias = ventasHoy.filter(v => v.usuario_id === usuario?.id || !v.usuario_id)
  const ingresosPropios = ventasPropias.filter(v=>!v.es_fiado).reduce((s,v)=>s+v.total,0)

  const ultimasVentas = (esAdmin ? ventasHoy : ventasPropias).slice(0, 5)

  if (cargando) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#637a93', height:'100vh' }}>
      <div style={{ textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:12 }}>
        <div style={{ width:40, height:40, border:'3px solid #1e3347', borderTop:'3px solid #10b981', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
        <p>Cargando...</p>
      </div>
    </div>
  )

  return (
    <div style={{ height:'100vh', overflowY:'auto', padding:'20px 24px 32px', display:'flex', flexDirection:'column', gap:20 }}>

      {/* ─── Header ─── */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:22, fontWeight:800 }}>
            {saludoHora()}, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-muted" style={{ fontSize:13, marginTop:4 }}>
            {hora.toLocaleDateString('es-PE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
            {!esAdmin && <span style={{ marginLeft:8, background:'rgba(99,122,147,0.15)', color:'#637a93', borderRadius:999, padding:'2px 8px', fontSize:11, fontWeight:600 }}>Cajero</span>}
            {esAdmin && <span style={{ marginLeft:8, background:'rgba(16,185,129,0.12)', color:'#34d399', borderRadius:999, padding:'2px 8px', fontSize:11, fontWeight:600 }}>👑 Admin</span>}
          </p>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {/* Reloj */}
          <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:12, padding:'10px 16px' }}>
            <div style={{ fontFamily:'JetBrains Mono', fontSize:20, fontWeight:800, color:'#34d399', letterSpacing:2 }}>
              {hora.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </div>
          </div>
          {/* Turno */}
          <button onClick={handleToggleTurno}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 16px', borderRadius:12, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, transition:'all 0.15s',
              background: turno ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
              color: turno ? '#ef4444' : '#34d399',
              border: turno ? '1px solid rgba(239,68,68,0.3)' : '1px solid rgba(16,185,129,0.3)' }}>
            {turno ? '⏹ Cerrar turno' : '▶ Abrir turno'}
          </button>
          {/* Ir a Caja */}
          <button className="btn btn-primary" onClick={() => navigate('/pos')} style={{ fontSize:13 }}>
            🖥️ Ir a Caja
          </button>
          <button className="btn btn-ghost" onClick={cargar} style={{ fontSize:13, padding:'10px 12px' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </button>
        </div>
      </div>

      {/* ─── Estado turno ─── */}
      {turno && (
        <div style={{ background:'rgba(16,185,129,0.06)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:12, padding:'12px 18px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#10b981', boxShadow:'0 0 8px #10b981' }} />
          <span style={{ fontSize:13, color:'#34d399', fontWeight:600 }}>Turno abierto desde {fmtHora(turno.apertura)}</span>
          <span style={{ fontSize:13, color:'#637a93', marginLeft:4 }}>
            · {Math.floor((new Date()-new Date(turno.apertura))/60000)} min
          </span>
        </div>
      )}

      {/* ════════════════════════════════════════
          VISTA ADMIN — ve todo
          ════════════════════════════════════════ */}
      {esAdmin && (
        <>
          {/* Stats admin */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, flexShrink:0 }}>
            {[
              { label:'Ventas hoy',       value:resumen?.total_ventas??0,      icon:'🧾', color:'#10b981', ruta:'/reportes' },
              { label:'Ingresos hoy',     value:fmt(resumen?.ingresos),         icon:'💰', color:'#34d399', ruta:'/reportes' },
              { label:'Ticket promedio',  value:fmt(resumen?.ticket_promedio),  icon:'📊', color:'#f59e0b', ruta:'/reportes' },
              { label:'Fiado pendiente',  value:fmt(resumenFiado?.total_deuda), icon:'📋', color:'#ef4444', ruta:'/clientes' },
            ].map(s => (
              <button key={s.label} onClick={() => navigate(s.ruta)}
                style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'16px 18px', textAlign:'left', cursor:'pointer', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor=s.color; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='none' }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{s.icon}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:20, color:s.color }}>{s.value}</div>
                <div style={{ fontSize:12, color:'#637a93', marginTop:4 }}>{s.label}</div>
              </button>
            ))}
          </div>

          {/* Gráfico + Métodos de pago */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, flexShrink:0 }}>
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Ingresos — últimos 7 días</p>
              <p style={{ fontSize:12, color:'#637a93', marginBottom:16 }}>Evolución semanal</p>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData} margin={{ top:0, right:8, left:8, bottom:0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e3347" vertical={false} />
                  <XAxis dataKey="fecha" tick={{ fill:'#637a93', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#637a93', fontSize:11 }} axisLine={false} tickLine={false} tickFormatter={v=>`S/${v}`} width={50} />
                  <Tooltip content={<TooltipBar />} cursor={{ fill:'rgba(255,255,255,0.04)' }} />
                  <Bar dataKey="ingresos" radius={[6,6,0,0]} maxBarSize={40}>
                    {chartData.map((entry,i) => (
                      <Cell key={i} fill={entry.esHoy?'#34d399':'#10b981'} opacity={entry.ingresos===0?0.3:1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px' }}>
              <p style={{ fontWeight:700, fontSize:15, marginBottom:4 }}>Métodos de pago</p>
              <p style={{ fontSize:12, color:'#637a93', marginBottom:16 }}>Distribución de hoy</p>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {[
                  { label:'Efectivo', value:resumen?.efectivo||0 },
                  { label:'Yape',     value:resumen?.yape||0 },
                  { label:'Plin',     value:resumen?.plin||0 },
                  { label:'Tarjeta',  value:resumen?.tarjeta||0 },
                  { label:'Fiado',    value:resumen?.fiado||0 },
                ].filter(m=>m.value>0).map(m => {
                  const pct = resumen?.ingresos ? Math.round((m.value/resumen.ingresos)*100) : 0
                  return (
                    <div key={m.label}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:13 }}>{METODO_ICON[m.label]} {m.label}</span>
                        <span style={{ fontFamily:'JetBrains Mono', fontSize:13, fontWeight:700, color:METODO_COLOR[m.label] }}>{fmt(m.value)}</span>
                      </div>
                      <div style={{ height:5, background:'var(--bg-700)', borderRadius:999, overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:METODO_COLOR[m.label], borderRadius:999 }} />
                      </div>
                    </div>
                  )
                })}
                {(resumen?.ingresos||0)===0 && <p style={{ fontSize:13, color:'#637a93', textAlign:'center', padding:'20px 0' }}>Sin ventas aún hoy</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════
          VISTA CAJERO — solo su info
          ════════════════════════════════════════ */}
      {!esAdmin && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, flexShrink:0 }}>
          {[
            { label:'Mis ventas hoy',    value:ventasPropias.length,   unit:'transacciones', icon:'🧾', color:'#10b981' },
            { label:'Mis ingresos hoy',  value:fmt(ingresosPropios),    unit:'soles',         icon:'💵', color:'#34d399' },
            { label:'Stock bajo',        value:alertas.length,          unit:'productos',     icon:'⚠️', color: alertas.length>0?'#f59e0b':'#10b981', ruta:'/alertas' },
          ].map(s => (
            <button key={s.label} onClick={() => s.ruta && navigate(s.ruta)}
              style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, padding:'18px 20px', textAlign:'left', cursor:s.ruta?'pointer':'default', transition:'all 0.15s' }}
              onMouseEnter={e => { if(s.ruta){e.currentTarget.style.borderColor=s.color;e.currentTarget.style.transform='translateY(-2px)'} }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.transform='none' }}>
              <div style={{ fontSize:28, marginBottom:10 }}>{s.icon}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:22, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:12, color:'#637a93', marginTop:4 }}>{s.label}</div>
            </button>
          ))}
        </div>
      )}

      {/* ─── Fila inferior: Stock bajo + Últimas ventas ─── */}
      <div style={{ display:'grid', gridTemplateColumns: esAdmin?'280px 1fr':'280px 1fr', gap:16, flexShrink:0 }}>

        {/* Alertas stock */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontWeight:700, fontSize:15 }}>⚠️ Stock bajo</p>
            <button onClick={() => navigate('/alertas')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#637a93' }}>Ver →</button>
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {alertas.length===0 ? (
              <div style={{ textAlign:'center', padding:'24px 0', color:'#637a93', fontSize:13 }}>
                <div style={{ fontSize:24, marginBottom:6 }}>✅</div>
                Todo el stock está bien
              </div>
            ) : alertas.slice(0,7).map(a => (
              <div key={a.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 18px', borderBottom:'1px solid rgba(30,51,71,0.4)' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <span style={{ fontSize:13, fontWeight:500 }}>{a.nombre}</span>
                <span style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:13, color:a.stock===0?'#ef4444':'#f59e0b' }}>
                  {a.stock===0?'Agotado':`${a.stock} uds`}
                </span>
              </div>
            ))}
            {alertas.length>7 && <p style={{ textAlign:'center', fontSize:12, color:'#637a93', padding:'8px 0' }}>+{alertas.length-7} más</p>}
          </div>
        </div>

        {/* Últimas ventas */}
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden' }}>
          <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <p style={{ fontWeight:700, fontSize:15 }}>
              🧾 {esAdmin ? 'Últimas ventas' : 'Mis últimas ventas'}
            </p>
            {esAdmin && <button onClick={() => navigate('/reportes')} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, color:'#637a93' }}>Ver reportes →</button>}
          </div>
          {ultimasVentas.length===0 ? (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#637a93', fontSize:13 }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🛒</div>
              {esAdmin ? 'No hay ventas hoy' : 'No has realizado ventas hoy. ¡A vender!'}
            </div>
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['#','Hora','Método', esAdmin?'Cajero':'Productos','Total'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ultimasVentas.map((v,i) => (
                  <tr key={v.id}
                    style={{ borderBottom:i<ultimasVentas.length-1?'1px solid rgba(30,51,71,0.5)':'none' }}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding:'11px 16px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>#{v.id}</td>
                    <td style={{ padding:'11px 16px', fontSize:13 }}>{fmtHora(v.fecha)}</td>
                    <td style={{ padding:'11px 16px', fontSize:13 }}>{METODO_ICON[v.metodo_pago]||'💵'} {v.metodo_pago}</td>
                    <td style={{ padding:'11px 16px', fontSize:13, color:'#637a93' }}>
                      {esAdmin ? (v.nombre_usuario||'—') : `${v.num_productos} ítem${v.num_productos!==1?'s':''}`}
                    </td>
                    <td style={{ padding:'11px 16px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981' }}>{fmt(v.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ─── Accesos rápidos ─── */}
      <div style={{ flexShrink:0 }}>
        <p style={{ fontSize:12, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.6, marginBottom:12 }}>Accesos rápidos</p>
        <div style={{ display:'flex', gap:10 }}>
          {[
            { label:'Nueva venta', icon:'🖥️', ruta:'/pos',      color:'#10b981' },
            { label:'Productos',   icon:'📦', ruta:'/productos', color:'#637a93' },
            { label:'Clientes',    icon:'👥', ruta:'/clientes',  color:'#637a93' },
            { label:'Ofertas',     icon:'🏷️', ruta:'/ofertas',   color:'#637a93' },
            { label:'Alertas',     icon:'⚠️', ruta:'/alertas',   color:alertas.length>0?'#f59e0b':'#637a93' },
            ...(esAdmin ? [{ label:'Reportes', icon:'📊', ruta:'/reportes', color:'#637a93' }] : []),
          ].map(a => (
            <button key={a.ruta} onClick={() => navigate(a.ruta)}
              style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 8px', borderRadius:12, border:'1px solid var(--border)', background:'var(--bg-card)', cursor:'pointer', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor=a.color; e.currentTarget.style.background='rgba(255,255,255,0.03)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.background='var(--bg-card)' }}>
              <span style={{ fontSize:22 }}>{a.icon}</span>
              <span style={{ fontSize:12, fontWeight:600, color:a.color }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}