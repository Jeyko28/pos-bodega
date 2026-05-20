import React, { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'

const CATEGORIAS = ['General','Bebidas','Snacks','Panadería','Lácteos','Limpieza','Higiene','Frutas','Verduras','Otros']
const ICONOS = { 'Todas':'🛒','Bebidas':'🥤','Snacks':'🍿','Panadería':'🍞','Lácteos':'🥛','Limpieza':'🧹','Higiene':'🧴','Frutas':'🍎','Verduras':'🥦','Otros':'📦','General':'🏷️' }
const fmt = (n) => `S/ ${Number(n).toFixed(2)}`
const emptyForm = { nombre:'', precio:'', stock:'', codigo:'', categoria:'General' }

export default function Productos() {
  const [productos, setProductos]         = useState([])
  const [busqueda, setBusqueda]           = useState('')
  const [categoriaActiva, setCatActiva]   = useState('Todas')
  const [modal, setModal]                 = useState(null)
  const [form, setForm]                   = useState(emptyForm)
  const [editId, setEditId]               = useState(null)
  const [guardando, setGuardando]         = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // Import Excel
  const [modalImport, setModalImport]     = useState(false)
  const [preview, setPreview]             = useState([])
  const [erroresPreview, setErroresPreview] = useState([])
  const [importando, setImportando]       = useState(false)
  const [resultadoImport, setResultadoImport] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const data = await window.electronAPI.getProductos()
    setProductos(data)
  }

  const categoriasConProductos = ['Todas', ...new Set(productos.map(p => p.categoria))]

  const filtrados = productos.filter(p => {
    const matchB = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.codigo && p.codigo.includes(busqueda))
    const matchC = categoriaActiva === 'Todas' || p.categoria === categoriaActiva
    return matchB && matchC
  })

  function abrirAgregar() { setForm(emptyForm); setEditId(null); setModal('add') }
  function abrirEditar(p) {
    setForm({ nombre:p.nombre, precio:String(p.precio), stock:String(p.stock), codigo:p.codigo||'', categoria:p.categoria })
    setEditId(p.id); setModal('edit')
  }

  async function guardar() {
    if (!form.nombre || !form.precio || form.stock === '') return
    setGuardando(true)
    try {
      if (modal === 'add') await window.electronAPI.addProducto(form)
      else await window.electronAPI.updateProducto({ ...form, id:editId })
      setModal(null); cargar()
    } catch(e) { alert('Error: ' + e.message) }
    setGuardando(false)
  }

  async function eliminar(id) {
    await window.electronAPI.deleteProducto(id)
    setConfirmDelete(null); cargar()
  }

  function stockColor(stock) {
    if (stock <= 0) return 'badge badge-red'
    if (stock < 5)  return 'badge badge-amber'
    return 'badge badge-emerald'
  }

  // ─── IMPORTAR EXCEL ───────────────────────────────────────────
  function descargarPlantilla() {
    const plantilla = [
      { nombre:'Coca Cola 500ml', precio:3.50, stock:48, codigo:'7501055330075', categoria:'Bebidas' },
      { nombre:'Pan de molde',    precio:6.90, stock:15, codigo:'7440002001048', categoria:'Panadería' },
      { nombre:'Jabón Dove 90g',  precio:4.20, stock:24, codigo:'8801040041407', categoria:'Higiene' },
    ]
    const ws = XLSX.utils.json_to_sheet(plantilla)
    ws['!cols'] = [{ wch:25 },{ wch:10 },{ wch:10 },{ wch:18 },{ wch:14 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'plantilla-productos.xlsx')
  }

  function handleArchivoExcel(e) {
    const archivo = e.target.files[0]
    if (!archivo) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type:'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const filas = XLSX.utils.sheet_to_json(ws)

        if (!filas.length) { setErroresPreview(['El archivo está vacío o no tiene datos']); setPreview([]); return }

        // Validación previa
        const errores = []
        filas.forEach((f, i) => {
          const linea = i + 2
          const nombre = String(f.nombre || f.Nombre || f.NOMBRE || '').trim()
          if (!nombre) errores.push(`Fila ${linea}: nombre vacío`)
          const precio = parseFloat(f.precio || f.Precio || f.PRECIO)
          if (isNaN(precio) || precio < 0) errores.push(`Fila ${linea}: precio inválido`)
          const stock  = parseInt(f.stock  || f.Stock  || f.STOCK)
          if (isNaN(stock) || stock < 0) errores.push(`Fila ${linea}: stock inválido`)
        })

        setErroresPreview(errores)
        setPreview(filas.slice(0, 10))
        setResultadoImport(null)
      } catch(err) {
        setErroresPreview(['Error al leer el archivo: ' + err.message])
        setPreview([])
      }
    }
    reader.readAsArrayBuffer(archivo)
  }

  async function confirmarImport() {
    const archivo = fileRef.current?.files[0]
    if (!archivo) return
    setImportando(true)
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const wb    = XLSX.read(ev.target.result, { type:'array' })
      const ws    = wb.Sheets[wb.SheetNames[0]]
      const filas = XLSX.utils.sheet_to_json(ws)
      const result = await window.electronAPI.importarProductosExcel(filas)
      setResultadoImport(result)
      setImportando(false)
      await cargar()
    }
    reader.readAsArrayBuffer(archivo)
  }

  function cerrarImport() {
    setModalImport(false)
    setPreview([])
    setErroresPreview([])
    setResultadoImport(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div style={{ padding:24, height:'100vh', display:'flex', flexDirection:'column', gap:16, overflow:'hidden' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div>
          <h1 style={{ fontSize:20, fontWeight:700 }}>Productos</h1>
          <p className="text-muted" style={{ fontSize:13 }}>
            {filtrados.length} de {productos.length} productos
          </p>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost" style={{ fontSize:13 }} onClick={() => { setModalImport(true); setPreview([]); setErroresPreview([]); setResultadoImport(null) }}>
            📥 Importar Excel
          </button>
          <button className="btn btn-primary" onClick={abrirAgregar}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ position:'relative', maxWidth:420, flexShrink:0 }}>
        <svg style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'#637a93' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input className="input" style={{ paddingLeft:40 }} placeholder="Buscar por nombre, categoría o código..."
          value={busqueda} onChange={e => { setBusqueda(e.target.value); setCatActiva('Todas') }} />
        {busqueda && <button onClick={() => setBusqueda('')} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:16 }}>✕</button>}
      </div>

      {/* Filtros categoría */}
      <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2, flexShrink:0 }}>
        {categoriasConProductos.map(cat => {
          const isActive = categoriaActiva === cat
          const count = cat==='Todas' ? productos.length : productos.filter(p=>p.categoria===cat).length
          return (
            <button key={cat} onClick={() => { setCatActiva(cat); setBusqueda('') }}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:999, flexShrink:0,
                border: isActive ? '1px solid rgba(16,185,129,0.6)' : '1px solid var(--border)',
                background: isActive ? 'rgba(16,185,129,0.15)' : 'var(--bg-card)',
                color: isActive ? '#34d399' : '#637a93', cursor:'pointer',
                fontSize:13, fontWeight:isActive?700:500, whiteSpace:'nowrap', transition:'all 0.15s' }}>
              <span>{ICONOS[cat]||'📦'}</span><span>{cat}</span>
              <span style={{ background:isActive?'rgba(16,185,129,0.25)':'var(--bg-700)', color:isActive?'#34d399':'#637a93', borderRadius:999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{count}</span>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div style={{ flex:1, overflowY:'auto', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:14 }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ borderBottom:'1px solid var(--border)' }}>
              {['Producto','Código','Categoría','Precio','Stock','Acciones'].map(h => (
                <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'#637a93', textTransform:'uppercase', letterSpacing:0.6, whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map((p, i) => (
              <tr key={p.id}
                style={{ borderBottom: i<filtrados.length-1?'1px solid rgba(30,51,71,0.6)':'none' }}
                onMouseEnter={e => e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                <td style={{ padding:'12px 16px', fontWeight:600 }}>{p.nombre}</td>
                <td style={{ padding:'12px 16px', fontFamily:'JetBrains Mono', fontSize:12, color:'#637a93' }}>{p.codigo||'—'}</td>
                <td style={{ padding:'12px 16px' }}><span className="badge badge-gray">{ICONOS[p.categoria]||'📦'} {p.categoria}</span></td>
                <td style={{ padding:'12px 16px', fontFamily:'JetBrains Mono', fontWeight:700, color:'#10b981' }}>{fmt(p.precio)}</td>
                <td style={{ padding:'12px 16px' }}><span className={stockColor(p.stock)}>{p.stock} uds</span></td>
                <td style={{ padding:'12px 16px' }}>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-ghost"   style={{ padding:'6px 12px', fontSize:13 }} onClick={() => abrirEditar(p)}>Editar</button>
                    <button className="btn btn-danger"  style={{ padding:'6px 12px', fontSize:13 }} onClick={() => setConfirmDelete(p)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtrados.length===0 && (
          <div style={{ textAlign:'center', padding:60, color:'#637a93' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>📦</div>
            {busqueda ? `No se encontraron productos para "${busqueda}"` : 'No hay productos registrados'}
          </div>
        )}
      </div>

      {/* Modal Agregar / Editar */}
      {(modal==='add'||modal==='edit') && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:18, padding:28, width:420, display:'flex', flexDirection:'column', gap:18 }}>
            <h2 style={{ fontSize:18, fontWeight:700 }}>{modal==='add'?'Nuevo Producto':'Editar Producto'}</h2>
            <Campo label="Nombre del producto" required>
              <input className="input" placeholder="Ej: Coca Cola 500ml" value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))} />
            </Campo>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Campo label="Precio (S/)" required>
                <input className="input" type="number" placeholder="0.00" min="0" step="0.10" value={form.precio} onChange={e => setForm(f=>({...f,precio:e.target.value}))} />
              </Campo>
              <Campo label="Stock" required>
                <input className="input" type="number" placeholder="0" min="0" value={form.stock} onChange={e => setForm(f=>({...f,stock:e.target.value}))} />
              </Campo>
            </div>
            <Campo label="Código de barras">
              <input className="input" style={{ fontFamily:'JetBrains Mono' }} placeholder="Escanear o ingresar..." value={form.codigo} onChange={e => setForm(f=>({...f,codigo:e.target.value}))} />
            </Campo>
            <Campo label="Categoría">
              <select className="input" value={form.categoria} onChange={e => setForm(f=>({...f,categoria:e.target.value}))}>
                {CATEGORIAS.map(c => <option key={c} value={c}>{ICONOS[c]||'📦'} {c}</option>)}
              </select>
            </Campo>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost" style={{ flex:1 }} onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" style={{ flex:1 }} onClick={guardar} disabled={guardando||!form.nombre||!form.precio||form.stock===''}>
                {guardando ? 'Guardando...' : modal==='add' ? 'Agregar' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmar Eliminar */}
      {confirmDelete && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid rgba(239,68,68,0.3)', borderRadius:18, padding:28, width:360, display:'flex', flexDirection:'column', gap:16, textAlign:'center' }}>
            <div style={{ fontSize:40 }}>🗑️</div>
            <div>
              <p style={{ fontWeight:700, fontSize:17 }}>Eliminar producto</p>
              <p style={{ color:'#637a93', fontSize:14, marginTop:6 }}>¿Seguro que deseas eliminar <strong style={{ color:'var(--text)' }}>{confirmDelete.nombre}</strong>?</p>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <button className="btn btn-ghost"  style={{ flex:1 }} onClick={() => setConfirmDelete(null)}>Cancelar</button>
              <button className="btn btn-danger" style={{ flex:1 }} onClick={() => eliminar(confirmDelete.id)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Importar Excel ─── */}
      {modalImport && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100 }}>
          <div style={{ background:'#111d2b', border:'1px solid var(--border)', borderRadius:20, padding:28, width:580, maxHeight:'85vh', display:'flex', flexDirection:'column', gap:18 }}>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <h2 style={{ fontSize:18, fontWeight:700 }}>📥 Importar productos desde Excel</h2>
                <p style={{ fontSize:13, color:'#637a93', marginTop:2 }}>Carga masiva de productos desde un archivo .xlsx</p>
              </div>
              <button onClick={cerrarImport} style={{ background:'none', border:'none', cursor:'pointer', color:'#637a93', fontSize:22 }}>✕</button>
            </div>

            {/* Resultado exitoso */}
            {resultadoImport ? (
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.3)', borderRadius:12, padding:'18px 20px' }}>
                  <p style={{ fontWeight:700, fontSize:16, color:'#34d399', marginBottom:12 }}>✓ Importación completada</p>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div style={{ background:'rgba(16,185,129,0.1)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
                      <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:24, color:'#34d399' }}>{resultadoImport.agregados}</div>
                      <div style={{ fontSize:12, color:'#637a93', marginTop:4 }}>Productos agregados</div>
                    </div>
                    <div style={{ background:'rgba(245,158,11,0.1)', borderRadius:10, padding:'12px 16px', textAlign:'center' }}>
                      <div style={{ fontFamily:'JetBrains Mono', fontWeight:800, fontSize:24, color:'#f59e0b' }}>{resultadoImport.actualizados}</div>
                      <div style={{ fontSize:12, color:'#637a93', marginTop:4 }}>Productos actualizados</div>
                    </div>
                  </div>
                  {resultadoImport.errores?.length > 0 && (
                    <div style={{ marginTop:12, background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:'12px 14px' }}>
                      <p style={{ fontSize:13, color:'#ef4444', fontWeight:600, marginBottom:6 }}>⚠️ {resultadoImport.errores.length} filas con errores:</p>
                      {resultadoImport.errores.map((e,i) => <p key={i} style={{ fontSize:12, color:'#637a93' }}>• {e}</p>)}
                    </div>
                  )}
                </div>
                <button className="btn btn-primary" style={{ width:'100%' }} onClick={cerrarImport}>✓ Listo</button>
              </div>
            ) : (
              <>
                {/* Paso 1: Plantilla */}
                <div style={{ background:'var(--bg-700)', borderRadius:12, padding:'14px 18px' }}>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:4 }}>1️⃣ Descarga la plantilla Excel</p>
                  <p style={{ fontSize:13, color:'#637a93', marginBottom:10 }}>
                    La plantilla tiene las columnas correctas: <strong>nombre</strong>, <strong>precio</strong>, <strong>stock</strong>, <strong>codigo</strong>, <strong>categoria</strong>
                  </p>
                  <button className="btn btn-ghost" style={{ fontSize:13 }} onClick={descargarPlantilla}>
                    📄 Descargar plantilla.xlsx
                  </button>
                </div>

                {/* Paso 2: Subir archivo */}
                <div>
                  <p style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>2️⃣ Selecciona tu archivo Excel</p>
                  <label style={{ display:'block', background:'var(--bg-700)', border:'2px dashed var(--border)', borderRadius:12, padding:'20px', textAlign:'center', cursor:'pointer', transition:'border-color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor='#10b981'}
                    onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleArchivoExcel} />
                    <div style={{ fontSize:32, marginBottom:8 }}>📊</div>
                    <p style={{ fontSize:14, fontWeight:600 }}>Haz clic para seleccionar el archivo</p>
                    <p style={{ fontSize:12, color:'#637a93', marginTop:4 }}>Formatos: .xlsx, .xls</p>
                  </label>
                </div>

                {/* Errores de validación */}
                {erroresPreview.length > 0 && (
                  <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'12px 16px', maxHeight:120, overflowY:'auto' }}>
                    <p style={{ fontSize:13, color:'#ef4444', fontWeight:600, marginBottom:6 }}>⚠️ Errores encontrados:</p>
                    {erroresPreview.map((e,i) => <p key={i} style={{ fontSize:12, color:'#637a93' }}>• {e}</p>)}
                  </div>
                )}

                {/* Vista previa */}
                {preview.length > 0 && (
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, marginBottom:8 }}>
                      3️⃣ Vista previa — primeras {preview.length} filas
                    </p>
                    <div style={{ background:'var(--bg-700)', borderRadius:10, overflow:'auto', maxHeight:180 }}>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                        <thead>
                          <tr style={{ borderBottom:'1px solid var(--border)' }}>
                            {['Nombre','Precio','Stock','Código','Categoría'].map(h => (
                              <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#637a93', fontWeight:700, textTransform:'uppercase', fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {preview.map((f,i) => (
                            <tr key={i} style={{ borderBottom:'1px solid rgba(30,51,71,0.4)' }}>
                              <td style={{ padding:'7px 12px' }}>{f.nombre||f.Nombre||f.NOMBRE||'—'}</td>
                              <td style={{ padding:'7px 12px', fontFamily:'JetBrains Mono', color:'#10b981' }}>S/{f.precio||f.Precio||f.PRECIO||'?'}</td>
                              <td style={{ padding:'7px 12px' }}>{f.stock||f.Stock||f.STOCK||'?'}</td>
                              <td style={{ padding:'7px 12px', fontFamily:'JetBrains Mono', fontSize:11, color:'#637a93' }}>{f.codigo||f.Código||f.CODIGO||'—'}</td>
                              <td style={{ padding:'7px 12px' }}>{f.categoria||f.Categoría||f.CATEGORIA||'General'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div style={{ display:'flex', gap:12 }}>
                  <button className="btn btn-ghost" style={{ flex:1 }} onClick={cerrarImport}>Cancelar</button>
                  <button className="btn btn-primary" style={{ flex:1 }} onClick={confirmarImport}
                    disabled={importando || preview.length===0 || erroresPreview.length>0}>
                    {importando ? 'Importando...' : `✓ Importar ${preview.length > 0 ? 'productos' : ''}`}
                  </button>
                </div>
              </>
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