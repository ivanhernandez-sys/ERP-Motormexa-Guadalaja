import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  SUCURSALES, FABRICANTE_POR_MARCA, MODELOS_POR_MARCA,
  TIPOS_ORDEN, UBICACIONES, HORARIOS_CORTE, calcularETA, formatFecha, generarReferencia,
} from "../utils/catalogos";

const ANIOS = Array.from({ length: 12 }, (_, i) => 2025 - i);

function FilaRefaccion({ index, fila, onChange, onRemove, permitEUA, fabricante }) {
  const ubicacionesDisponibles = UBICACIONES.filter(u => {
    if (u === "EUA" && (!permitEUA || fabricante !== "Stellantis")) return false;
    return true;
  });

  const eta = fila.ubicacion && fila.fecha_compra_est
    ? formatFecha(calcularETA(fila.ubicacion, fabricante))
    : null;

  return (
    <tr style={{ borderBottom: "1px solid #1f2937" }}>
      <td style={tdStyle}>
        <select value={fila.ubicacion} onChange={e => onChange(index, "ubicacion", e.target.value)} style={inputSmall}>
          <option value="">Ubic.</option>
          {ubicacionesDisponibles.map(u => <option key={u}>{u}</option>)}
        </select>
      </td>
      <td style={tdStyle}>
        <input
          placeholder="Descripción"
          value={fila.descripcion}
          onChange={e => onChange(index, "descripcion", e.target.value)}
          style={{ ...inputSmall, width: "200px" }}
        />
      </td>
      <td style={tdStyle}>
        <input
          placeholder="N° Parte"
          value={fila.numero_parte}
          onChange={e => onChange(index, "numero_parte", e.target.value)}
          style={inputSmall}
        />
      </td>
      <td style={tdStyle}>
        <input
          type="number" min={1}
          value={fila.cantidad}
          onChange={e => onChange(index, "cantidad", parseInt(e.target.value) || 1)}
          style={{ ...inputSmall, width: "60px" }}
        />
      </td>
      <td style={{ ...tdStyle, color: "#9ca3af", fontSize: "11px", whiteSpace: "nowrap" }}>
        {fila.ubicacion ? formatFecha(calcularETA(fila.ubicacion, fabricante)) : "—"}
      </td>
      <td style={tdStyle}>
        <button onClick={() => onRemove(index)} style={btnDanger}>✕</button>
      </td>
    </tr>
  );
}

export default function Captura() {
  const { user } = useAuth();
  const sucursalId = user?.sucursal_id;
  const sucursalCfg = SUCURSALES[sucursalId] || SUCURSALES["taller_vallarta"];
  const esMayoreo = sucursalId === "mayoreo_menudeo";

  // ── Encabezado ──
  const [ot, setOt] = useState("");
  const [tipoOrden, setTipoOrden] = useState("Público");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [modeloOtro, setModeloOtro] = useState("");
  const [anio, setAnio] = useState("");
  const [vin, setVin] = useState("");
  const [km, setKm] = useState("");
  const [vehiculoEstatus, setVehiculoEstatus] = useState("En taller");
  // Mayoreo extra
  const [tipoCotizacion, setTipoCotizacion] = useState("Menudeo");
  const [folioCotizacion, setFolioCotizacion] = useState("");
  const [siniestro, setSiniestro] = useState("");
  const [clienteAseguradora, setClienteAseguradora] = useState("");

  // ── Filas refacciones ──
  const [filas, setFilas] = useState([{ ubicacion: "MX", descripcion: "", numero_parte: "", cantidad: 1 }]);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState(false);

  const fabricante = FABRICANTE_POR_MARCA[marca] || "";
  const modelosDisponibles = marca ? MODELOS_POR_MARCA[marca] || [] : [];

  // Marcas disponibles según sucursal
  const marcasDisponibles = sucursalCfg.fabricantes
    .flatMap(f => Object.entries(FABRICANTE_POR_MARCA)
      .filter(([, fab]) => fab === f)
      .map(([m]) => m));

  const corte = HORARIOS_CORTE[fabricante];

  const handleFila = (i, campo, val) => {
    setFilas(prev => prev.map((f, idx) => idx === i ? { ...f, [campo]: val } : f));
  };

  const agregarFila = () => {
    setFilas(prev => [...prev, { ubicacion: "MX", descripcion: "", numero_parte: "", cantidad: 1 }]);
  };

  const quitarFila = (i) => {
    setFilas(prev => prev.filter((_, idx) => idx !== i));
  };

  const guardar = async () => {
    if (!ot) { alert("La OT es obligatoria"); return; }
    if (!marca) { alert("Selecciona una marca"); return; }
    if (filas.some(f => !f.descripcion && !f.numero_parte)) {
      alert("Todas las filas deben tener descripción o número de parte");
      return;
    }
    if (esMayoreo && !folioCotizacion) { alert("El folio de cotización es obligatorio"); return; }

    setGuardando(true);

    const modeloFinal = modelo === "Otro" ? modeloOtro : modelo;
    const ref = generarReferencia(sucursalId, ot, user?.nombre);

    const items = filas.map(f => ({
      ot,
      tipo_orden: esMayoreo ? tipoCotizacion : tipoOrden,
      fabricante,
      marca,
      modelo: modeloFinal,
      anio: anio || null,
      vin: vin || null,
      km: km || null,
      vehiculo_estatus: vehiculoEstatus,
      ubicacion: f.ubicacion,
      descripcion: f.descripcion,
      numero_parte: f.numero_parte || null,
      cantidad: f.cantidad,
      estatus: "Pendiente",
      asesor_id: user?.id,
      sucursal_id: sucursalId,
      referencia: ref,
      folio_cotizacion: esMayoreo ? folioCotizacion : null,
      tipo_cotizacion: esMayoreo ? tipoCotizacion : null,
      siniestro: esMayoreo && tipoCotizacion === "Aseguradora" ? siniestro : null,
      cliente_aseguradora: esMayoreo ? clienteAseguradora : null,
      eta: calcularETA(f.ubicacion, fabricante)?.toISOString() || null,
    }));

    const { error } = await supabase.from("items").insert(items);

    setGuardando(false);

    if (error) {
      console.error(error);
      alert("Error al guardar. Revisa la consola.");
      return;
    }

    setExito(true);
    // Reset
    setOt(""); setMarca(""); setModelo(""); setModeloOtro(""); setAnio(""); setVin(""); setKm("");
    setFolioCotizacion(""); setSiniestro(""); setClienteAseguradora("");
    setFilas([{ ubicacion: "MX", descripcion: "", numero_parte: "", cantidad: 1 }]);
    setTimeout(() => setExito(false), 3000);
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb", maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h2 style={{ margin: 0 }}>📦 Captura de Refacciones</h2>
          <p style={{ color: "#9ca3af", margin: "4px 0 0", fontSize: "13px" }}>
            {sucursalCfg.nombre}
            {fabricante && <span style={{ marginLeft: "10px", color: "#60a5fa" }}>· {fabricante}</span>}
            {corte && <span style={{ marginLeft: "10px", color: "#facc15" }}>· Corte {corte}</span>}
          </p>
        </div>
        {exito && (
          <div style={{ background: "#166534", color: "#bbf7d0", padding: "10px 16px", borderRadius: "8px" }}>
            ✅ Guardado correctamente
          </div>
        )}
      </div>

      {/* ── ENCABEZADO ── */}
      <div style={seccionStyle}>
        <h3 style={seccionTitle}>Encabezado</h3>

        <div style={gridDos}>
          {esMayoreo ? (
            <>
              <Campo label="Folio Cotización *">
                <input value={folioCotizacion} onChange={e => setFolioCotizacion(e.target.value)} style={inputStyle} placeholder="FOL-001" />
              </Campo>
              <Campo label="Tipo de Cotización *">
                <select value={tipoCotizacion} onChange={e => setTipoCotizacion(e.target.value)} style={inputStyle}>
                  {["Aseguradora", "Mayoreo", "Menudeo"].map(t => <option key={t}>{t}</option>)}
                </select>
              </Campo>
              {tipoCotizacion === "Aseguradora" && (
                <Campo label="N° Siniestro *">
                  <input value={siniestro} onChange={e => setSiniestro(e.target.value)} style={inputStyle} />
                </Campo>
              )}
              <Campo label="Cliente / Aseguradora">
                <input value={clienteAseguradora} onChange={e => setClienteAseguradora(e.target.value)} style={inputStyle} />
              </Campo>
            </>
          ) : (
            <>
              <Campo label="OT *">
                <input value={ot} onChange={e => setOt(e.target.value)} style={inputStyle} placeholder="12345" />
              </Campo>
              <Campo label="Tipo de Orden">
                <select value={tipoOrden} onChange={e => setTipoOrden(e.target.value)} style={inputStyle}>
                  {TIPOS_ORDEN.map(t => <option key={t}>{t}</option>)}
                </select>
              </Campo>
            </>
          )}

          <Campo label="Marca *">
            <select value={marca} onChange={e => { setMarca(e.target.value); setModelo(""); }} style={inputStyle}>
              <option value="">Selecciona...</option>
              {marcasDisponibles.map(m => <option key={m}>{m}</option>)}
              <option value="Otra">Otra marca</option>
            </select>
          </Campo>

          {marca && marca !== "Otra" && (
            <Campo label="Modelo">
              <select value={modelo} onChange={e => setModelo(e.target.value)} style={inputStyle}>
                <option value="">Selecciona...</option>
                {modelosDisponibles.map(m => <option key={m}>{m}</option>)}
              </select>
            </Campo>
          )}

          {(marca === "Otra" || modelo === "Otro") && (
            <Campo label="Especifica modelo">
              <input value={modeloOtro} onChange={e => setModeloOtro(e.target.value)} style={inputStyle} />
            </Campo>
          )}

          {!esMayoreo && (
            <>
              <Campo label="Año">
                <select value={anio} onChange={e => setAnio(e.target.value)} style={inputStyle}>
                  <option value="">—</option>
                  {ANIOS.map(a => <option key={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo label="VIN">
                <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} style={inputStyle} maxLength={17} placeholder="17 caracteres" />
              </Campo>
              <Campo label="KM">
                <input type="number" value={km} onChange={e => setKm(e.target.value)} style={inputStyle} />
              </Campo>
              <Campo label="Estatus del vehículo">
                <select value={vehiculoEstatus} onChange={e => setVehiculoEstatus(e.target.value)} style={inputStyle}>
                  <option>En taller</option>
                  <option>En circulación</option>
                </select>
              </Campo>
            </>
          )}
        </div>
      </div>

      {/* ── TABLA DE REFACCIONES ── */}
      <div style={seccionStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ ...seccionTitle, margin: 0 }}>Lista de Refacciones</h3>
          <button onClick={agregarFila} style={btnPrimary}>+ Agregar fila</button>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af", fontSize: "12px" }}>
                <th style={thStyle}>Ubicación</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>N° Parte</th>
                <th style={thStyle}>Cant.</th>
                <th style={thStyle}>ETA estimado</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <FilaRefaccion
                  key={i} index={i} fila={f}
                  onChange={handleFila} onRemove={quitarFila}
                  permitEUA={sucursalCfg.permitEUA}
                  fabricante={fabricante}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: "16px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <span style={{ color: "#9ca3af", fontSize: "13px", alignSelf: "center" }}>
            {filas.length} ítem{filas.length !== 1 ? "s" : ""}
          </span>
          <button onClick={guardar} disabled={guardando} style={btnGuardar}>
            {guardando ? "Guardando..." : "💾 Guardar orden"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", marginBottom: "4px" }}>{label}</label>
      {children}
    </div>
  );
}

// ── Estilos ──
const seccionStyle = {
  background: "#111827", border: "1px solid #1f2937",
  borderRadius: "12px", padding: "20px", marginBottom: "20px",
};
const seccionTitle = { color: "#e5e7eb", fontSize: "14px", fontWeight: 700, marginBottom: "16px", marginTop: 0 };
const gridDos = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "14px" };
const inputStyle = { background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", padding: "8px 10px", borderRadius: "8px", width: "100%", boxSizing: "border-box", fontSize: "13px" };
const inputSmall = { background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", padding: "6px 8px", borderRadius: "6px", fontSize: "13px" };
const thStyle = { padding: "8px 10px", textAlign: "left", fontWeight: 600, borderBottom: "1px solid #1f2937" };
const tdStyle = { padding: "8px 6px" };
const btnPrimary = { background: "#2563eb", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 };
const btnDanger = { background: "#7f1d1d", color: "#fca5a5", border: "none", padding: "4px 8px", borderRadius: "6px", cursor: "pointer" };
const btnGuardar = { background: "#16a34a", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "14px" };
