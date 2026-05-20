import React from 'react'

const fmt  = (n) => `S/ ${Number(n).toFixed(2)}`
const fmtP = (n) => `S/${Number(n).toFixed(2)}`
const METODO_ICON = { Efectivo:'💵', Yape:'📱', Plin:'📲', Tarjeta:'💳', Fiado:'📋' }
const ANCHOS = { 'a4':48, '80mm':42, '58mm':32 }

function Linea() {
  return <div style={{ borderBottom:'1px dashed #999', margin:'6px 0' }} />
}

function FilaItem({ nombre, cantidad, precio, subtotal, precioOriginal, tieneOferta, ancho }) {
  const ahorroUnidad = tieneOferta && precioOriginal ? precioOriginal - precio : 0
  const ahorroTotal  = ahorroUnidad * cantidad
  const es58 = ancho <= 32

  return (
    <div style={{ marginBottom: tieneOferta ? 8 : 4 }}>
      {/* Nombre + subtotal */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 11 : 12 }}>
        <span style={{ flex:1, wordBreak:'break-word', paddingRight:8 }}>{nombre}</span>
        <span style={{ whiteSpace:'nowrap', fontWeight:700 }}>{fmtP(subtotal)}</span>
      </div>
      {/* Cantidad × precio */}
      <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
        <span style={{ color:'#555' }}>
          {cantidad} x {fmtP(precio)}
          {tieneOferta && precioOriginal && (
            <span style={{ textDecoration:'line-through', color:'#aaa', marginLeft:4 }}>{fmtP(precioOriginal)}</span>
          )}
        </span>
        {tieneOferta && ahorroTotal > 0 && (
          <span style={{ color:'#1a7a4a', fontWeight:600, fontSize: es58 ? 9 : 10 }}>
            🏷️ -{fmtP(ahorroTotal)}
          </span>
        )}
      </div>
      {/* Etiqueta oferta */}
      {tieneOferta && (
        <div style={{ fontSize: es58 ? 9 : 10, color:'#1a7a4a', borderLeft:'2px solid #1a7a4a', paddingLeft:4, marginTop:2 }}>
          Precio oferta aplicado
        </div>
      )}
    </div>
  )
}

export default function VistaTicket({ venta, config = {} }) {
  const tipo  = config.ticket_tipo || 'a4'
  const ancho = ANCHOS[tipo] || 42
  const es58  = tipo === '58mm'
  const esA4  = tipo === 'a4'

  const anchoPixels = esA4 ? 380 : tipo==='80mm' ? 300 : 220

  const fecha    = new Date(venta.fecha)
  const fechaStr = fecha.toLocaleDateString('es-PE', { day:'2-digit', month:'2-digit', year:'numeric' })
  const horaStr  = fecha.toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' })

  const tieneDescuento = venta.descuento > 0

  // Ahorro total por ofertas en los ítems
  const ahorroOfertas = (venta.items||[]).reduce((s, item) => {
    if (item.oferta || item.precioOriginal) {
      const orig = item.precioOriginal || item.precio_unitario
      const pag  = item.precio || item.precio_unitario
      if (orig > pag) return s + (orig - pag) * item.cantidad
    }
    return s
  }, 0)

  const nombreCliente = venta.cliente
    ? venta.cliente
    : venta.nombre_cliente
      ? venta.nombre_cliente
      : venta.es_fiado
        ? 'Cliente con Fiado'
        : 'Cliente General'

  return (
    <div id="ticket-imprimible" style={{
      width: anchoPixels,
      fontFamily: "'Courier New', Courier, monospace",
      fontSize: es58 ? 11 : 12,
      color: '#111',
      background: 'white',
      padding: esA4 ? '20px 24px' : '12px 10px',
      lineHeight: 1.5,
      margin: '0 auto',
    }}>

      {/* Encabezado negocio */}
      <div style={{ textAlign:'center', marginBottom:8 }}>
        <div style={{ fontSize: es58 ? 14 : 16, fontWeight:900, textTransform:'uppercase', letterSpacing:1 }}>
          {config.negocio_nombre || 'MI BODEGA'}
        </div>
        {config.ticket_mostrar_ruc!==false && config.negocio_ruc && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>RUC: {config.negocio_ruc}</div>
        )}
        {config.ticket_mostrar_direccion!==false && config.negocio_direccion && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>{config.negocio_direccion}</div>
        )}
        {config.ticket_mostrar_telefono!==false && config.negocio_telefono && (
          <div style={{ fontSize: es58 ? 10 : 11 }}>Tel: {config.negocio_telefono}</div>
        )}
      </div>

      <Linea />

      {/* Info de venta */}
      <div style={{ fontSize: es58 ? 10 : 11, marginBottom:4 }}>
        {config.ticket_mostrar_codigo!==false && (
          <div style={{ display:'flex', justifyContent:'space-between' }}>
            <span>VENTA N°</span>
            <span style={{ fontWeight:700 }}>#{String(venta.id).padStart(5,'0')}</span>
          </div>
        )}
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>FECHA</span><span>{fechaStr}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>HORA</span><span>{horaStr}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>PAGO</span>
          <span>{METODO_ICON[venta.metodo_pago]||''} {venta.metodo_pago}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <span>CLIENTE</span>
          <span style={{ fontWeight: venta.cliente||venta.nombre_cliente ? 700 : 400 }}>
            {nombreCliente}
          </span>
        </div>
      </div>

      <Linea />

      {/* Productos */}
      <div style={{ fontSize: es58 ? 10 : 11, marginBottom:2 }}>
        <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, marginBottom:6, borderBottom:'1px solid #ccc', paddingBottom:4 }}>
          <span>DESCRIPCIÓN</span><span>TOTAL</span>
        </div>
        {(venta.items||[]).map((item,i) => {
          // Detectar si el ítem tiene oferta
          const precio         = item.precio || item.precio_unitario
          const precioOriginal = item.precioOriginal || null
          const tieneOferta    = !!(item.oferta || (precioOriginal && precioOriginal > precio))
          return (
            <FilaItem key={i}
              nombre={item.nombre_producto || item.nombre}
              cantidad={item.cantidad}
              precio={precio}
              subtotal={item.subtotal}
              precioOriginal={precioOriginal}
              tieneOferta={tieneOferta}
              ancho={ancho}
            />
          )
        })}
      </div>

      <Linea />

      {/* Totales */}
      <div style={{ fontSize: es58 ? 11 : 12 }}>

        {/* Ahorro por ofertas */}
        {ahorroOfertas > 0 && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11, color:'#1a7a4a' }}>
            <span>🏷️ Ahorro en ofertas</span>
            <span style={{ fontWeight:700 }}>-{fmt(ahorroOfertas)}</span>
          </div>
        )}

        {tieneDescuento && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
            <span>Subtotal</span>
            <span>{fmt(venta.subtotal_bruto || (venta.total + venta.descuento))}</span>
          </div>
        )}
        {tieneDescuento && (
          <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 10 : 11 }}>
            <span>Descuento 🏷️</span>
            <span style={{ fontWeight:700 }}>−{fmt(venta.descuento)}</span>
          </div>
        )}

        {/* Separador antes del total */}
        {(ahorroOfertas > 0 || tieneDescuento) && (
          <div style={{ borderBottom:'1px solid #ccc', margin:'4px 0' }} />
        )}

        <div style={{ display:'flex', justifyContent:'space-between', fontSize: es58 ? 14 : 16, fontWeight:900, margin:'6px 0' }}>
          <span>TOTAL</span><span>{fmt(venta.total)}</span>
        </div>

        {venta.metodo_pago==='Efectivo' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span>Efectivo</span><span>{fmt(venta.monto_recibido)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700 }}>
              <span>Vuelto</span><span>{fmt(venta.vuelto)}</span>
            </div>
          </>
        )}

        {/* Resumen ahorro total */}
        {(ahorroOfertas > 0 || tieneDescuento) && (
          <div style={{ marginTop:6, padding:'5px 8px', border:'1px dashed #1a7a4a', borderRadius:3, textAlign:'center', fontSize: es58 ? 9 : 10, color:'#1a7a4a' }}>
            💰 Ahorro total: {fmt(ahorroOfertas + (venta.descuento||0))}
          </div>
        )}

        {/* Nota fiado */}
        {venta.metodo_pago==='Fiado' && (
          <div style={{ marginTop:6, padding:'6px 8px', border:'1px dashed #999', borderRadius:4, fontSize: es58?10:11, textAlign:'center', color:'#555' }}>
            ⚠️ Pendiente de pago — {nombreCliente}
          </div>
        )}
      </div>

      <Linea />

      {/* Pie */}
      <div style={{ textAlign:'center', fontSize: es58 ? 10 : 11, marginTop:8 }}>
        <div>{config.ticket_mensaje || '¡Gracias por su compra!'}</div>
        <div style={{ marginTop:4, color:'#555' }}>{fechaStr} {horaStr}</div>
      </div>

    </div>
  )
}