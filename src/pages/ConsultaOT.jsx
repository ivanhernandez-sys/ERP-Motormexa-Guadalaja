import { useState } from "react";
import { supabase } from "../services/supabase";
import { COLOR_ESTATUS, formatFecha } from "../utils/catalogos";

function Badge({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span style={{ background: c.bg, color: c.text, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700 }}>
      {estatus}
    </span>
  );
}

export default function ConsultaOT() {
  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  const consultar = async () => {
    const q = query.trim().toUpperCase();
    if (!q) return;

    setCargando(true);
    setResultado(null);

    // Buscar por OT o folio de cotización
    const { data } = await supabase
      .from("items")
      .select("*")
      .or(`ot.eq.${q},folio_cotizacion.eq.${q}`)
      .order("created_at", { ascending: true });

    setCargando(false);

    if (!data || data.length === 0) {
      setResultado({ vacia: true, ot: q });
      return;
    }

    const entregadas = data.filter(r => r.estatus === "Entregada").length;
    const recibidas = data.filter(r => r.estatus === "Recibida").length;
    const pendientes = data.filter(r => r.estatus === "Pendiente").length;

    let estatusOT = "Pendiente";
    if (entregadas === data.length) estatusOT = "Completa";
    else if (entregadas > 0 || recibidas > 0) estatusOT = "Parcial";

    setResultado({ items: data, ot: q, entregadas, recibidas, pendientes, estatusOT });
  };

  const copiar = () => {
    if (!resultado?.items) return;
    const texto = resultado.items.map(r =>
      `${r.ot} | ${r.descripcion || r.numero_parte} | ${r.estatus} | ETA: ${formatFecha(r.eta)}`
    ).join("\n");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb", maxWidth: "800px" }}>
      <h2 style={{ marginBottom: "4px" }}>🔍 Consulta de OT</h2>
      <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "20px" }}>
        Ingresa el número de OT o folio de cotización
      </p>

      <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && consultar()}
          placeholder="Ej: 12345 o FOL-001"
          style={{
            flex: 1, background: "#111827", border: "1px solid #1f2937",
            color: "#e5e7eb", padding: "10px 14px", borderRadius: "8px", fontSize: "14px",
          }}
        />
        <button onClick={consultar} disabled={cargando} style={{
          background: "#2563eb", color: "#fff", border: "none",
          padding: "10px 24px", borderRadius: "8px", cursor: "pointer", fontWeight: 700,
        }}>
          {cargando ? "..." : "Consultar"}
        </button>
      </div>

      {resultado?.vacia && (
        <div style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>
          ❌ No se encontraron refacciones para <strong>{resultado.ot}</strong>
        </div>
      )}

      {resultado?.items && (
        <div>
          {/* Resumen */}
          <div style={{
            background: "#111827", border: "1px solid #1f2937", borderRadius: "12px",
            padding: "16px 20px", marginBottom: "16px",
            display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px",
          }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 700 }}>OT {resultado.ot}</div>
              {resultado.items[0]?.marca && (
                <div style={{ color: "#9ca3af", fontSize: "13px" }}>
                  {resultado.items[0].marca} {resultado.items[0].modelo} {resultado.items[0].anio}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <span style={{ color: "#9ca3af", fontSize: "13px" }}>
                {resultado.entregadas}/{resultado.items.length} entregadas
              </span>
              <span style={{
                padding: "5px 14px", borderRadius: "20px", fontWeight: 700, fontSize: "13px",
                background: resultado.estatusOT === "Completa" ? "#166534" : resultado.estatusOT === "Parcial" ? "#1e40af" : "#7f1d1d",
                color: "#fff",
              }}>
                {resultado.estatusOT}
              </span>
              <button onClick={copiar} style={{
                background: "#1f2937", color: "#9ca3af", border: "none",
                padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px",
              }}>
                {copiado ? "✅ Copiado" : "📋 Copiar"}
              </button>
            </div>
          </div>

          {/* Lista de ítems */}
          {resultado.items.map(r => (
            <div key={r.id} style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "12px 16px", background: "#111827",
              border: "1px solid #1f2937", borderRadius: "8px", marginBottom: "6px",
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{r.descripcion || r.numero_parte}</div>
                {r.numero_parte && r.descripcion && (
                  <div style={{ color: "#6b7280", fontSize: "12px" }}>{r.numero_parte}</div>
                )}
              </div>
              <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ color: "#60a5fa", fontSize: "12px", fontWeight: 700 }}>{r.ubicacion}</span>
                {r.eta && <span style={{ color: "#9ca3af", fontSize: "12px" }}>ETA {formatFecha(r.eta)}</span>}
                <Badge estatus={r.estatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
