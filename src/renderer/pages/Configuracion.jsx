import React, { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'

export default function Configuracion() {
  const [config, setConfig]       = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [exito, setExito]         = useState(false)
  const [abiertos, setAbiertos]   = useState({ negocio:true, tickets:false, alertas:false, datos:false })
  const [rutaBD, setRutaBD]       = useState('')

  // Estados feedback
  const [msgBackup, setMsgBackup]   = useState(null) // { tipo:'ok'|'error', texto }
  const [msgExcel, setMsgExcel]     = useState(null)
  const [exportando, setExportando] = useState(false)
  const [restaurando, setRestaurando] = useState(false)

  useEffect(() => {
    cargar()
    window.electronAPI.getRutaBD().then(setRutaBD)
  }, [])

  async function cargar() {
    const c = await window.electronAPI.getConfig()
    setConfig(c)
  }

  async function guardar() {
    setGuardando(true)
    await window.electronAPI.updateConfig(config)
    setGuardando(false)
    setExito(true)
    setTimeout(() => setExito(false), 2500)
  }

  function set(key, val) { setConfig(prev => ({ ...prev, [key]:val })) }
  function toggle(k) { setAbiertos(prev => ({ ...prev, [k]:!prev[k] })) }

  // ─── Backup ───────────────────────────────────────────────────
  async function handleExportarBackup() {
    setMsgBackup(null)
    const result = await window.electronAPI.exportarBackup()
    if (result.canceled) return
    if (result.success) {
      setMsgBackup({ tipo:'ok', texto:`✓ Backup guardado: ${result.nombre}` })
    } else {
      setMsgBackup({ tipo:'error', texto:`Error: ${result.error}` })
    }
    setTimeout(() => setMsgBackup(null), 5000)
  }

  async function handleImportarBackup() {
    if (!confirm('⚠️ Esto reemplazará TODOS los datos actuales con los del backup. ¿Estás seguro?')) return
    setRestaurando(true)
    setMsgBackup(null)
    const result = await window.electronAPI.importarBackup()
    setRestaurando(false)
    if (result.canceled) return
    if (result.success) {
      setMsgBackup({ tipo:'ok', texto:'✓ Backup restaurado correctamente. Reinicia la app para ver los cambios.' })
    } else {
      setMsgBackup({ tipo:'error', texto:`Error: ${result.error}` })
    }
  }

  // ─── Exportar Excel ───────────────────────────────────────────
  async function handleExportarExcel(tipo) {
    setExportando(true)
    setMsgExcel(null)
    try {
      const carpeta = await window.electronAPI.elegirCarpetaExcel()
      if (!carpeta.success) { setExportando(false); return }

      const datos = await window.electronAPI.getDatosExcel({ tipo, dias:365 })
      if (!datos.length) {
        setMsgExcel({ tipo:'error', texto:'No hay datos para exportar' })
        setExportando(false)
        return
      }

      // Crear workbook con XLSX
      const ws = XLSX.utils.json_to_sheet(datos)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, tipo.charAt(0).toUpperCase()+tipo.slice(1))

      // Ajustar ancho de columnas
      const cols = Object.keys(datos[0]).map(k => ({ wch: Math.max(k.length, 12) }))
      ws['!cols'] = cols

      const nombre  = `${tipo}-${new Date().toISOString().slice(0,10)}.xlsx`
      const rutaXls = `${carpeta.ruta}\\${nombre}`
      XLSX.writeFile(wb, rutaXls)

      setMsgExcel({ tipo:'ok', texto:`✓ Excel guardado: ${nombre}` })
    } catch(e) {
      setMsgExcel({ tipo:'error', texto:`Error: ${e.message}` })
    }
    setExportando(false)
    setTimeout(() => setMsgExcel(null), 5000)
  }

  if (!config) return <div style={{ padding:24, color:'#637a93' }}>Cargando...</div>

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 16px', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', borderBottom:'1px solid var(--border)' }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Configuración</h1>
          <p className="text-muted" style={{ fontSize:13 }}>Datos del negocio y preferencias del sistema</p>
        </div>
        <button className="btn btn-primary" onClick={guardar} disabled={guardando} style={{ minWidth:160 }}>
          {exito ? '✓ Guardado' : guardando ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      {/* Contenido */}
      <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 40px', display:'flex', flexDirection:'column', gap:10 }}>

        {/* 🏪 Datos del Negocio */}
        <Seccion titulo="🏪 Datos del Negocio" desc="Nombre, RUC, dirección y contacto — aparecen en los tickets"
          abierto={abiertos.negocio} onToggle={() => toggle('negocio')}
          badge={config.negocio_nombre ? '✓ Configurado' : null}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <Campo label="Nombre del negocio" required>
              <input className="input" placeholder="Bodega El Buen Precio"
                value={config.negocio_nombre||''} onChange={e => set('negocio_nombre',e.target.value)} />
            </Campo>
            <Campo label="RUC / DNI">
              <input className="input" placeholder="20123456789"
                value={config.negocio_ruc||''} onChange={e => set('negocio_ruc',e.target.value)} />
            </Campo>
            <Campo label="Dirección">
              <input className="input" placeholder="Av. Principal 123, Piura"
                value={config.negocio_direccion||''} onChange={e => set('negocio_direccion',e.target.value)} />
            </Campo>
            <Campo label="Teléfono">
              <input className="input" placeholder="074-123456"
                value={config.negocio_telefono||''} onChange={e => set('negocio_telefono',e.target.value)} />
            </Campo>
          </div>
        </Seccion>

        {/* 🖨️ Tickets */}
        <Seccion titulo="🖨️ Configuración de Tickets" desc="Tipo de impresora, contenido y mensaje del comprobante"
          abierto={abiertos.tickets} onToggle={() => toggle('tickets')}
          badge={config.ticket_tipo ? `✓ ${config.ticket_tipo==='a4'?'Hoja A4':config.ticket_tipo}` : null}>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <Campo label="Tipo de impresora">
              <div style={{ display:'flex', gap:10 }}>
                {[{ id:'a4',label:'Hoja A4',icon:'📄',desc:'Impresora normal' },{ id:'80mm',label:'Térmica 80mm',icon:'🖨️',desc:'Recomendada' },{ id:'58mm',label:'Térmica 58mm',icon:'🖨️',desc:'Más compacta' }].map(t => {
                  const isActive=(config.ticket_tipo||'a4')===t.id
                  return (
                    <button key={t.id} onClick={() => set('ticket_tipo',t.id)}
                      style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, padding:'14px 10px', borderRadius:12, cursor:'pointer',
                        border:isActive?'2px solid #10b981':'2px solid var(--border)',
                        background:isActive?'rgba(16,185,129,0.1)':'var(--bg-700)', transition:'all 0.15s' }}>
                      <span style={{ fontSize:22 }}>{t.icon}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:isActive?'#34d399':'var(--text)' }}>{t.label}</span>
                      <span style={{ fontSize:11, color:'#637a93' }}>{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </Campo>
            <Campo label="Mensaje al pie del ticket">
              <input className="input" placeholder="¡Gracias por su compra! Vuelva pronto 😊"
                value={config.ticket_mensaje||''} onChange={e => set('ticket_mensaje',e.target.value)} />
            </Campo>
            <Campo label="¿Qué mostrar en el ticket?">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <Toggle label="Mostrar RUC"         value={config.ticket_mostrar_ruc!==false}       onChange={v => set('ticket_mostrar_ruc',v)} />
                <Toggle label="Mostrar dirección"   value={config.ticket_mostrar_direccion!==false} onChange={v => set('ticket_mostrar_direccion',v)} />
                <Toggle label="Mostrar teléfono"    value={config.ticket_mostrar_telefono!==false}  onChange={v => set('ticket_mostrar_telefono',v)} />
                <Toggle label="Mostrar N° de venta" value={config.ticket_mostrar_codigo!==false}    onChange={v => set('ticket_mostrar_codigo',v)} />
              </div>
            </Campo>
          </div>
        </Seccion>

        {/* 🔔 Alertas */}
        <Seccion titulo="🔔 Alertas de Stock" desc="A partir de cuántas unidades se considera stock bajo"
          abierto={abiertos.alertas} onToggle={() => toggle('alertas')}
          badge={`Umbral: ${config.umbral_stock_bajo||5} uds`}>
          <Campo label="Umbral de stock bajo (unidades)">
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <input className="input" type="number" min="1" max="100"
                style={{ maxWidth:110, fontFamily:'JetBrains Mono', fontWeight:700, fontSize:18, textAlign:'center' }}
                value={config.umbral_stock_bajo||5}
                onChange={e => set('umbral_stock_bajo',parseInt(e.target.value)||5)} />
              <p style={{ fontSize:13, color:'#637a93', flex:1 }}>
                Si un producto tiene menos de este número aparecerá en la pantalla de <strong style={{ color:'var(--text)' }}>Alertas</strong>.
              </p>
            </div>
          </Campo>
        </Seccion>

        {/* 💾 Datos y Exportación */}
        <Seccion titulo="💾 Datos y Exportación" desc="Backup de la base de datos y exportar reportes a Excel"
          abierto={abiertos.datos} onToggle={() => toggle('datos')} badge={null}>
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

            {/* Ruta BD */}
            <div style={{ background:'var(--bg-700)', borderRadius:10, padding:'10px 14px' }}>
              <p style={{ fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>Ubicación de la base de datos</p>
              <p style={{ fontSize:12, fontFamily:'JetBrains Mono', color:'#637a93', wordBreak:'break-all' }}>{rutaBD || 'Cargando...'}</p>
            </div>

            {/* Backup */}
            <div>
              <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>🗄️ Copia de seguridad (Backup)</p>
              <p style={{ fontSize:13, color:'#637a93', marginBottom:12 }}>Guarda todos tus datos en un archivo JSON que puedes restaurar si algo sale mal.</p>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={handleExportarBackup}>
                  ⬆️ Exportar backup
                </button>
                <button className="btn btn-ghost" style={{ flex:1 }} onClick={handleImportarBackup} disabled={restaurando}>
                  {restaurando ? 'Restaurando...' : '⬇️ Restaurar backup'}
                </button>
              </div>
              {msgBackup && (
                <div style={{ marginTop:10, background:msgBackup.tipo==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${msgBackup.tipo==='ok'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:msgBackup.tipo==='ok'?'#34d399':'#ef4444' }}>
                  {msgBackup.texto}
                </div>
              )}
            </div>

            {/* Exportar Excel */}
            <div>
              <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>📊 Exportar a Excel</p>
              <p style={{ fontSize:13, color:'#637a93', marginBottom:12 }}>Descarga tus datos en formato Excel (.xlsx) para analizarlos o compartirlos.</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { tipo:'ventas',   label:'Ventas',   icon:'🧾', desc:'Historial completo' },
                  { tipo:'productos',label:'Productos', icon:'📦', desc:'Catálogo y stock' },
                  { tipo:'clientes', label:'Clientes',  icon:'👥', desc:'Lista y deudas' },
                  { tipo:'fiado',    label:'Fiado',     icon:'📋', desc:'Cuentas por cobrar' },
                ].map(e => (
                  <button key={e.tipo} onClick={() => handleExportarExcel(e.tipo)} disabled={exportando}
                    style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderRadius:12, cursor:exportando?'wait':'pointer',
                      background:'var(--bg-700)', border:'1px solid var(--border)', transition:'all 0.15s',
                      opacity:exportando?0.7:1 }}
                    onMouseEnter={e => { if(!exportando) e.currentTarget.style.borderColor='#10b981' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)' }}>
                    <span style={{ fontSize:26 }}>{e.icon}</span>
                    <div style={{ textAlign:'left' }}>
                      <p style={{ fontWeight:700, fontSize:14 }}>{e.label}</p>
                      <p style={{ fontSize:12, color:'#637a93' }}>{e.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
              {msgExcel && (
                <div style={{ marginTop:10, background:msgExcel.tipo==='ok'?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${msgExcel.tipo==='ok'?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`, borderRadius:10, padding:'10px 14px', fontSize:13, color:msgExcel.tipo==='ok'?'#34d399':'#ef4444' }}>
                  {msgExcel.texto}
                </div>
              )}
            </div>
          </div>
        </Seccion>

        <p style={{ textAlign:'center', fontSize:12, color:'#3a5068', paddingTop:8 }}>
          Más opciones disponibles próximamente
        </p>
      </div>
    </div>
  )
}

// ─── Componentes ──────────────────────────────────────────────────
function Seccion({ titulo, desc, abierto, onToggle, badge, children }) {
  return (
    <div style={{ background:'var(--bg-card)', border:`1px solid ${abierto?'rgba(16,185,129,0.3)':'var(--border)'}`, borderRadius:14 }}>
      <button onClick={onToggle} style={{ width:'100%', background:'none', border:'none', cursor:'pointer', padding:'16px 20px', display:'flex', alignItems:'center', gap:12, borderRadius:abierto?'14px 14px 0 0':14 }}>
        <div style={{ flex:1, textAlign:'left' }}>
          <p style={{ fontWeight:700, fontSize:15, color:'var(--text)' }}>{titulo}</p>
          <p style={{ fontSize:12, color:'#637a93', marginTop:2 }}>{desc}</p>
        </div>
        {badge && !abierto && (
          <span style={{ background:'rgba(16,185,129,0.12)', color:'#34d399', borderRadius:999, padding:'3px 10px', fontSize:11, fontWeight:600, whiteSpace:'nowrap' }}>{badge}</span>
        )}
        <svg style={{ color:'#637a93', flexShrink:0, transition:'transform 0.2s', transform:abierto?'rotate(180deg)':'none' }}
          width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {abierto && (
        <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border)' }}>
          <div style={{ paddingTop:18 }}>{children}</div>
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

function Toggle({ label, value, onChange }) {
  return (
    <div onClick={() => onChange(!value)}
      style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg-700)', borderRadius:10, padding:'11px 14px', cursor:'pointer', userSelect:'none' }}>
      <span style={{ fontSize:13, fontWeight:500 }}>{label}</span>
      <div style={{ width:40, height:22, borderRadius:999, background:value?'#10b981':'#374151', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ position:'absolute', top:3, left:value?21:3, width:16, height:16, borderRadius:'50%', background:'white', transition:'left 0.2s' }} />
      </div>
    </div>
  )
}