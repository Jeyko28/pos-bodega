import React, { useState, useEffect, useRef } from 'react'

const CATEGORIAS = ['General','Abarrotes','Bebidas','Snacks','Panadería','Lácteos','Limpieza','Higiene','Frutas','Verduras','Otros']
const ICONOS = { 'Abarrotes':'🌾','Bebidas':'🥤','Snacks':'🍿','Panadería':'🍞','Lácteos':'🥛','Limpieza':'🧹','Higiene':'🧴','Frutas':'🍎','Verduras':'🥦','Otros':'📦','General':'🏷️' }

const fmt = (n) => `S/ ${Number(n||0).toFixed(2)}`

function fmtStock(p) {
  if (p.tipo_venta === 'granel') return `${parseFloat(p.stock).toFixed(2)} ${p.unidad}`
  return `${parseInt(p.stock)} uds`
}

export default function Productos() {
  const [productos, setProductos]   = useState([])
  const [busqueda, setBusqueda]     = useState('')
  const [catActiva, setCatActiva]   = useState('Todas')
  const [modal, setModal]           = useState(false)
  const [editando, setEditando]     = useState(null)
  const [guardando, setGuardando]   = useState(false)
  const [modalExcel, setModalExcel] = useState(false)
  const [importando, setImportando] = useState(false)
  const [resultExcel, setResultExcel] = useState(null)
  const fileRef = useRef(null)
  const plantRef = useRef(null)

  const [form, setForm] = useState({
    nombre:'', precio:'', stock:'', codigo:'', categoria:'General',
    tipo_venta:'unidad', unidad:'unidad'
  })

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const p = await window.electronAPI.getProductos()
    setProductos(p)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ nombre:'', precio:'', stock:'', codigo:'', categoria:'General', tipo_venta:'unidad', unidad:'unidad' })
    setModal(true)
  }

  function abrirEditar(p) {
    setEditando(p)
    setForm({ nombre:p.nombre, precio:String(p.precio), stock:String(p.stock), codigo:p.codigo||'', categoria:p.categoria, tipo_venta:p.tipo_venta||'unidad', unidad:p.unidad||'unidad' })
    setModal(true)
  }

  function setF(k,v) { setForm(p => ({ ...p, [k]:v })) }

  // Al cambiar tipo_venta, ajustar unidad automáticamente
  function cambiarTipo(tipo) {
    setForm(p => ({ ...p, tipo_venta:tipo, unidad: tipo==='granel' ? 'kg' : 'unidad' }))
  }

  async function guardar() {
    if (!form.nombre.trim()) return
    const precio = parseFloat(form.precio)
    const stock  = parseFloat(form.stock)
    if (isNaN(precio)||precio<0) return
    if (isNaN(stock)||stock<0)   return
    setGuardando(true)
    const datos = { nombre:form.nombre.trim(), precio, stock, codigo:form.codigo.trim()||null, categoria:form.categoria, tipo_venta:form.tipo_venta, unidad:form.unidad }
    if (editando) {
      await window.electronAPI.updateProducto({ id:editando.id, ...datos })
    } else {
      await window.electronAPI.addProducto(datos)
    }
    setGuardando(false); setModal(false); cargar()
  }

  async function eliminar(id) {
    if (!confirm('¿Eliminar este producto?')) return
    await window.electronAPI.deleteProducto(id)
    cargar()
  }

  // Importar Excel
  async function handleExcel(e) {
    const file = e.target.files?.[0]; if (!file) return
    setImportando(true); setResultExcel(null)
    const XLSX = await import('xlsx')
    const buf  = await file.arrayBuffer()
    const wb   = XLSX.read(buf)
    const ws   = wb.Sheets[wb.SheetNames[0]]
    const filas = XLSX.utils.sheet_to_json(ws)
    const result = await window.electronAPI.importarProductosExcel(filas)
    setResultExcel(result); setImportando(false); cargar()
    e.target.value = ''
  }

  // Descargar plantilla Excel
  async function descargarPlantilla() {
    const XLSX = await import('xlsx')
    const datos = [
      { nombre:'Arroz Costeño 1kg', precio:3.50, stock:50, codigo:'', categoria:'General', tipo_venta:'granel' },
      { nombre:'Azúcar rubia',      precio:4.00, stock:30, codigo:'', categoria:'General', tipo_venta:'granel' },
      { nombre:'Coca Cola 500ml',   precio:3.50, stock:24, codigo:'7591110144490', categoria:'Bebidas', tipo_venta:'unidad' },
      { nombre:'Huevos',            precio:0.60, stock:100, codigo:'', categoria:'General', tipo_venta:'unidad' },
    ]
    const ws = XLSX.utils.json_to_sheet(datos)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla-productos.xlsx')
  }

  const cats = ['Todas', ...new Set(productos.map(p=>p.categoria))]
  const filtrados = productos.filter(p => {
    const matchB = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (p.codigo&&p.codigo.includes(busqueda))
    const matchC = catActiva==='Todas' || p.categoria===catActiva
    return matchB && matchC
  })

  const stockBajo = (p) => {
    const umbral = p.tipo_venta==='granel' ? 1 : 5
    return parseFloat(p.stock) <= umbral
  }

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', overflow:'hidden' }}>

      {/* Header */}
      <div style={{ padding:'24px 24px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Productos</h1>
          <p className="text-muted" style={{ fontSize:13, marginTop:2 }}>
            {filtrados.length} de {productos.length} productos
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" onClick={() => setModalExcel(true)}>
            📊 Importar Excel
          </button>
          <button className="btn btn-primary" onClick={abrirNuevo}>
            + Nuevo Producto
          </button>
        </div>
      </div>

      {/* Buscador + filtros */}
      <div style={{ padding:'0 24px 16px', flexShrink:0, display:'flex', flexDirection:'column', gap:10 }}>
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input className="input" style={{ paddingLeft:42 }} placeholder="Buscar por nombre o código de barras..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          {busqueda && <button onClick={() => setBusqueda('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:18 }}>✕</button>}
        </div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
          {cats.map(cat => {
            const isA = cat===catActiva
            const count = cat==='Todas' ? productos.length : productos.filter(p=>p.categoria===cat).length
            return (
              <button key={cat} onClick={() => setCatActiva(cat)}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:999, flexShrink:0,
                  border: isA?'1px solid rgba(16,185,129,0.6)':'1px solid var(--border)',
                  background: isA?'rgba(16,185,129,0.15)':'var(--bg-card)',
                  color: isA?'#34d399':'#637a93', cursor:'pointer',
                  fontSize:13, fontWeight:isA?700:500, whiteSpace:'nowrap' }}>
                {cat!=='Todas' && <span>{ICONOS[cat]||'📦'}</span>}
                <span>{cat}</span>
                <span style={{ background:isA?'rgba(16,185,129,0.25)':'var(--bg-700)', color:isA?'#34d399':'#637a93', borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflow:'hidden', padding:'0 24px 24px' }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', height:'100%', display:'flex', flexDirection:'column' }}>
          <div style={{ overflowY:'auto', flex:1 }}>
            {filtrados.length===0 ? (
              <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
                <p>{busqueda?`No se encontró "${busqueda}"`:'No hay productos registrados'}</p>
                {!busqueda && <button className="btn btn-primary" style={{ marginTop:16 }} onClick={abrirNuevo}>+ Agregar primer producto</button>}
              </div>
            ) : (
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid var(--border)', position:'sticky', top:0, background:'var(--bg-card)', zIndex:1 }}>
                    {['Producto','Código','Categoría','Tipo','Precio','Stock','Acciones'].map(h => (
                      <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map((p,i) => (
                    <tr key={p.id} style={{ borderBottom:i<filtrados.length-1?'1px solid rgba(30,51,71,0.6)':'none' }}>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ fontWeight:600, fontSize:14 }}>{p.nombre}</span>
                      </td>
                      <td style={{ padding:'12px 14px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>
                        {p.codigo||<span style={{ color:'#3a5068' }}>—</span>}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#637a93' }}>
                          {ICONOS[p.categoria]||'📦'} {p.categoria}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        {p.tipo_venta==='granel' ? (
                          <span style={{ background:'rgba(14,165,233,0.12)', color:'#38bdf8', borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                            ⚖️ Granel/{p.unidad}
                          </span>
                        ) : (
                          <span style={{ background:'rgba(16,185,129,0.1)', color:'#34d399', borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                            📦 Unidad
                          </span>
                        )}
                      </td>
                      <td style={{ padding:'12px 14px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981' }}>
                        {fmt(p.precio)}{p.tipo_venta==='granel' && <span style={{ fontSize:11, color:'#637a93', fontWeight:400 }}>/{p.unidad}</span>}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ background:stockBajo(p)?'rgba(245,158,11,0.15)':'rgba(16,185,129,0.1)', color:stockBajo(p)?'#f59e0b':'#34d399', borderRadius:999, padding:'3px 10px', fontSize:12, fontWeight:600 }}>
                          {fmtStock(p)}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', gap:8 }}>
                          <button className="btn btn-ghost" style={{ padding:'6px 14px', fontSize:13 }} onClick={() => abrirEditar(p)}>Editar</button>
                          <button onClick={() => eliminar(p.id)} style={{ background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:13, fontWeight:600 }}>Eliminar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Modal nuevo/editar producto */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:480, display:'flex', flexDirection:'column', gap:18, maxHeight:'90vh', overflowY:'auto' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>{editando?'Editar Producto':'Nuevo Producto'}</h2>
              <button onClick={() => setModal(false)} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            {/* Tipo de venta */}
            <div>
              <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:8, textTransform:'uppercase', letterSpacing:0.5 }}>Tipo de venta</label>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                {[
                  { id:'unidad', label:'Por unidad', icon:'📦', desc:'Coca Cola, jabón, galletas...' },
                  { id:'granel', label:'A granel', icon:'⚖️', desc:'Arroz, azúcar, menestras...' },
                ].map(t => {
                  const isA = form.tipo_venta===t.id
                  return (
                    <button key={t.id} type="button" onClick={() => cambiarTipo(t.id)}
                      style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'12px', borderRadius:12, cursor:'pointer',
                        border:isA?'2px solid #10b981':'2px solid var(--border)',
                        background:isA?'rgba(16,185,129,0.1)':'var(--bg-card)', transition:'all 0.15s' }}>
                      <span style={{ fontSize:24 }}>{t.icon}</span>
                      <span style={{ fontWeight:700, fontSize:13, color:isA?'#34d399':'var(--text)' }}>{t.label}</span>
                      <span style={{ fontSize:11, color:'#637a93', textAlign:'center' }}>{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Unidad (solo para granel) */}
            {form.tipo_venta==='granel' && (
              <div>
                <label style={{ fontSize:12, fontWeight:700, color:'#637a93', display:'block', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Unidad de medida</label>
                <div style={{ display:'flex', gap:8 }}>
                  {[
                    { id:'kg', label:'Kilogramos (kg)' },
                    { id:'g',  label:'Gramos (g)' },
                  ].map(u => {
                    const isA = form.unidad===u.id
                    return (
                      <button key={u.id} type="button" onClick={() => setF('unidad', u.id)}
                        style={{ flex:1, padding:'10px', borderRadius:10, cursor:'pointer',
                          border:isA?'2px solid #0ea5e9':'2px solid var(--border)',
                          background:isA?'rgba(14,165,233,0.1)':'var(--bg-card)',
                          color:isA?'#38bdf8':'#637a93', fontWeight:isA?700:500, fontSize:13 }}>
                        {u.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Nombre */}
            <Campo label="Nombre del producto" required>
              <input className="input" placeholder="Ej: Arroz Costeño" autoFocus
                value={form.nombre} onChange={e => setF('nombre', e.target.value)}
                onKeyDown={e => { if(e.key==='Enter') guardar() }} />
            </Campo>

            {/* Precio y Stock */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <Campo label={form.tipo_venta==='granel' ? `Precio por ${form.unidad}` : 'Precio (S/)'} required>
                <input className="input" type="number" min="0" step="0.01"
                  placeholder={form.tipo_venta==='granel'?'Precio por kg':'0.00'}
                  value={form.precio} onChange={e => setF('precio', e.target.value)} />
              </Campo>
              <Campo label={form.tipo_venta==='granel' ? `Stock inicial (${form.unidad})` : 'Stock inicial (unidades)'} required>
                <input className="input" type="number" min="0"
                  step={form.tipo_venta==='granel'?'0.01':'1'}
                  placeholder={form.tipo_venta==='granel'?'Ej: 50.00':'0'}
                  value={form.stock} onChange={e => setF('stock', e.target.value)} />
              </Campo>
            </div>

            {/* Categoría */}
            <Campo label="Categoría">
              <select className="input" value={form.categoria} onChange={e => setF('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{ICONOS[c]||'📦'} {c}</option>)}
              </select>
            </Campo>

            {/* Código de barras */}
            <Campo label="Código de barras (opcional)">
              <input className="input" style={{ fontFamily:'JetBrains Mono' }}
                placeholder="Escanea o escribe el código"
                value={form.codigo} onChange={e => setF('codigo', e.target.value)} />
            </Campo>

            {/* Alerta granel */}
            {form.tipo_venta==='granel' && (
              <div style={{ background:'rgba(14,165,233,0.08)', border:'1px solid rgba(14,165,233,0.2)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#38bdf8' }}>
                ⚖️ Este producto se venderá por peso. Al venderlo en Caja, podrás ingresar el peso exacto y el precio se calculará automáticamente.
              </div>
            )}

            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(false)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar}
                disabled={guardando||!form.nombre.trim()||!form.precio||!form.stock}>
                {guardando?'Guardando...':editando?'Guardar cambios':'Agregar producto'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Excel */}
      {modalExcel && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:460, display:'flex', flexDirection:'column', gap:18 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <h2 style={{ fontSize:18, fontWeight:700 }}>📊 Importar desde Excel</h2>
              <button onClick={() => { setModalExcel(false); setResultExcel(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            <div style={{ background:'var(--bg-700)', borderRadius:12, padding:'14px 16px', fontSize:13, display:'flex', flexDirection:'column', gap:6 }}>
              <p style={{ fontWeight:700, marginBottom:4, color:'#637a93', fontSize:11, textTransform:'uppercase', letterSpacing:0.5 }}>Columnas de la plantilla</p>
              {[
                ['nombre','Obligatorio','Nombre del producto'],
                ['precio','Obligatorio','Precio de venta'],
                ['stock','Obligatorio','Cantidad inicial'],
                ['categoria','Opcional','Categoría del producto'],
                ['codigo','Opcional','Código de barras'],
                ['tipo_venta','Opcional','"unidad" o "granel" (por defecto: unidad)'],
              ].map(([col,req,desc]) => (
                <div key={col} style={{ display:'flex', gap:8, alignItems:'baseline' }}>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize:12, color:'#10b981', fontWeight:700, minWidth:90 }}>{col}</span>
                  <span style={{ fontSize:11, color:'#f59e0b', fontWeight:600, minWidth:70 }}>{req}</span>
                  <span style={{ fontSize:12, color:'#637a93' }}>{desc}</span>
                </div>
              ))}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={descargarPlantilla}>
                ⬇️ Descargar plantilla
              </button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={() => fileRef.current?.click()} disabled={importando}>
                {importando ? 'Importando...' : '📂 Seleccionar archivo'}
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleExcel} />
            </div>

            {resultExcel && (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {resultExcel.agregados>0 && (
                  <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#34d399' }}>
                    ✅ {resultExcel.agregados} producto{resultExcel.agregados>1?'s':''} agregado{resultExcel.agregados>1?'s':''}
                  </div>
                )}
                {resultExcel.actualizados>0 && (
                  <div style={{ background:'rgba(14,165,233,0.1)', border:'1px solid rgba(14,165,233,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#38bdf8' }}>
                    🔄 {resultExcel.actualizados} producto{resultExcel.actualizados>1?'s':''} actualizado{resultExcel.actualizados>1?'s':''}
                  </div>
                )}
                {resultExcel.errores?.length>0 && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ef4444' }}>
                    ⚠️ {resultExcel.errores.length} error{resultExcel.errores.length>1?'es':''}:
                    <ul style={{ margin:'6px 0 0 16px', padding:0 }}>
                      {resultExcel.errores.slice(0,3).map((e,i) => <li key={i} style={{ fontSize:12 }}>{e}</li>)}
                      {resultExcel.errores.length>3 && <li style={{ fontSize:12 }}>... y {resultExcel.errores.length-3} más</li>}
                    </ul>
                  </div>
                )}
                <button className="btn btn-ghost" style={{ width:'100%' }} onClick={() => { setModalExcel(false); setResultExcel(null) }}>
                  Cerrar
                </button>
              </div>
            )}
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