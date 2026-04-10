import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { SUCURSALES } from "../utils/catalogos";

// ─── Paleta por fabricante ────────────────────────────────────────────────────
const COLORES = {
  Stellantis: { badge: "#1d4ed8", badgeText: "#bfdbfe", border: "#1d4ed840" },
  Mitsubishi: { badge: "#15803d", badgeText: "#bbf7d0", border: "#15803d40" },
  Peugeot:    { badge: "#be185d", badgeText: "#fbcfe8", border: "#be185d40" },
};
const COLOR_DEFAULT = { badge: "#334155", badgeText: "#e2e8f0", border: "#33415540" };

export default function RecepcionMasiva() {
  const { user } = useAuth();
  const [parte, setParte]             = useState("");
  const [cantidad, setCantidad]       = useState(1);
  const [lista, setLista]             = useState([]);
  const [buscando, setBuscando]       = useState(false);
  const [confirmando, setConfirmando] = useState(false);

  // ─── Buscar OTs pendientes por número de parte ──────────────────────────
  const buscarOTs = async (numero_parte) => {
    const { data, error } = await supabase
      .from("items")
      .select("id, ot, numero_parte, descripcion, fabricante, sucursal_id")
      .eq("numero_parte", numero_parte)
      .in("estatus", ["Pendiente", "Comprada"]);
    if (error) { console.error("Error buscando OTs:", error); return []; }
    return data || [];
  };

  // ─── Agregar pieza a la lista ────────────────────────────────────────────
  const agregar = async () => {
    const parteNorm = parte.trim().toUpperCase();
    if (!parteNorm) return;

    // Duplicado: sumar sin mutar el objeto original
    const existente = lista.find((l) => l.parte === parteNorm);
    if (existente) {
      const extra = prompt("Ya escaneado. ¿Cuántas piezas más?");
      const extraNum = parseInt(extra);
      // ✅ BUG FIX: validar NaN
      if (!extra || isNaN(extraNum) || extraNum <= 0) return;
      // ✅ BUG FIX: no mutar el objeto — spread en nuevo array
      setLista((prev) =>
        prev.map((l) =>
          l.parte === parteNorm ? { ...l, cantidad: l.cantidad + extraNum } : l
        )
      );
      setParte("");
      return;
    }

    setBuscando(true);
    const ots = await buscarOTs(parteNorm);
    setBuscando(false);

    let otSeleccionada = null;
    let fabricante     = null;
    let sucursalId     = null;
    let descripcion    = null;

    if (ots.length === 0) {
      const continuar = window.confirm(
        `No se encontraron OTs pendientes para "${parteNorm}".\n¿Agregar de todas formas como stock libre?`
      );
      if (!continuar) return;

    } else if (ots.length === 1) {
      otSeleccionada = ots[0].ot;
      fabricante     = ots[0].fabricante;
      sucursalId     = ots[0].sucursal_id;
      descripcion    = ots[0].descripcion;

    } else {
      const opciones = ots
        .map((o, i) => `${i + 1}. OT: ${o.ot}  |  ${SUCURSALES[o.sucursal_id]?.nombre || o.sucursal_id || "—"}`)
        .join("\n");
      const respuesta = prompt(`Varias OTs para "${parteNorm}":\n${opciones}\n\nEscribe la OT exacta:`);
      const encontrada = ots.find((o) => o.ot === respuesta?.trim());
      if (encontrada) {
        otSeleccionada = encontrada.ot;
        fabricante     = encontrada.fabricante;
        sucursalId     = encontrada.sucursal_id;
        descripcion    = encontrada.descripcion;
      } else {
        otSeleccionada = respuesta?.trim() || null;
      }
    }

    setLista((prev) => [
      ...prev,
      { parte: parteNorm, cantidad, ot: otSeleccionada, fabricante: fabricante || "—", sucursal_id: sucursalId || null, descripcion: descripcion || null },
    ]);
    setParte("");
    setCantidad(1);
  };

  // ─── Quitar ítem ─────────────────────────────────────────────────────────
  const quitar = (index) => setLista((prev) => prev.filter((_, i) => i !== index));

  // ─── Confirmar recepción ─────────────────────────────────────────────────
  const confirmar = async () => {
    if (lista.length === 0) return;
    if (!window.confirm(`¿Confirmar recepción de ${lista.length} pieza(s)?`)) return;

    setConfirmando(true);
    let errores = 0;

    for (const item of lista) {
      if (item.ot) {
        const { data: rows, error } = await supabase
          .from("items")
          .select("id")
          .eq("numero_parte", item.parte)
          .eq("ot", item.ot)
          .in("estatus", ["Pendiente", "Comprada"]);

        if (error) { errores++; continue; }

        // ✅ BUG FIX: rows puede ser null
        const itemsOT = rows || [];
        let restantes = item.cantidad;

        for (const r of itemsOT) {
          if (restantes <= 0) break;
          await supabase
            .from("items")
            .update({ estatus: "Recibida", fecha_recepcion: new Date().toISOString() })
            .eq("id", r.id);
          restantes--;
        }

        // Sobrante → stock (solo columnas que existen en la tabla)
        if (restantes > 0) {
          await supabase.from("stock").insert([{ numero_parte: item.parte, cantidad: restantes }]);
        }
      } else {
        // Sin OT → directo a stock
        await supabase.from("stock").insert([{ numero_parte: item.parte, cantidad: item.cantidad }]);
      }
    }

    setConfirmando(false);
    if (errores > 0) {
      alert(`⚠️ Completado con ${errores} error(es). Revisa la consola.`);
    } else {
      alert("✅ Recepción completada correctamente");
    }
    setLista([]);
  };

  // ─── Agrupar lista por fabricante → sucursal ─────────────────────────────
  const agrupado = lista.reduce((acc, item, idx) => {
    const fab = item.fabricante || "Sin fabricante";
    const suc = item.sucursal_id || "sin_sucursal";
    if (!acc[fab]) acc[fab] = {};
    if (!acc[fab][suc]) acc[fab][suc] = [];
    acc[fab][suc].push({ ...item, _index: idx });
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", color: "#e5e7eb" }}>
      <h2 style={{ margin: "0 0 24px", color: "#f1f5f9", fontSize: "20px" }}>
        📦 Recepción Masiva
      </h2>

      {/* ── Formulario escaneo ── */}
      <div style={{
        display: "flex", gap: "12px", marginBottom: "28px",
        background: "#111827", padding: "18px", borderRadius: "12px",
        border: "1px solid #1f2937", flexWrap: "wrap", alignItems: "flex-end",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>
            NÚMERO DE PARTE
          </label>
          <input
            placeholder="Escanear o escribir..."
            value={parte}
            onChange={(e) => setParte(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
            autoFocus
            style={{
              padding: "10px 14px", background: "#0f172a",
              border: "1px solid #334155", color: "#e2e8f0",
              borderRadius: "8px", fontSize: "14px", width: "240px", fontFamily: "monospace",
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <label style={{ color: "#6b7280", fontSize: "11px", fontWeight: 600, letterSpacing: "0.5px" }}>
            CANTIDAD
          </label>
          <input
            type="number" min={1} value={cantidad}
            onChange={(e) => {
              const val = parseInt(e.target.value);
              setCantidad(isNaN(val) || val < 1 ? 1 : val);
            }}
            style={{
              padding: "10px 14px", background: "#0f172a",
              border: "1px solid #334155", color: "#e2e8f0",
              borderRadius: "8px", fontSize: "14px", width: "80px", textAlign: "center",
            }}
          />
        </div>

        <button
          onClick={agregar}
          disabled={!parte.trim() || buscando}
          style={{
            padding: "10px 22px", alignSelf: "flex-end",
            background: parte.trim() && !buscando ? "#1d4ed8" : "#374151",
            color: "white", border: "none", borderRadius: "8px",
            cursor: parte.trim() && !buscando ? "pointer" : "not-allowed",
            fontWeight: 700, fontSize: "14px",
          }}
        >
          {buscando ? "Buscando..." : "＋ Agregar"}
        </button>

        {lista.length > 0 && (
          <button
            onClick={confirmar}
            disabled={confirmando}
            style={{
              padding: "10px 22px", alignSelf: "flex-end", marginLeft: "auto",
              background: "#16a34a", color: "white", border: "none",
              borderRadius: "8px", cursor: "pointer", fontWeight: 700,
              fontSize: "14px", opacity: confirmando ? 0.7 : 1,
            }}
          >
            {confirmando ? "Procesando..." : `✅ Confirmar recepción (${lista.length})`}
          </button>
        )}
      </div>

      {/* ── Lista vacía ── */}
      {lista.length === 0 && (
        <div style={{
          textAlign: "center", padding: "70px", color: "#374151",
          background: "#111827", borderRadius: "12px",
          border: "1px dashed #1f2937", fontSize: "14px",
        }}>
          Escanea o escribe un número de parte para comenzar
        </div>
      )}

      {/* ── Lista agrupada por fabricante → sucursal ── */}
      {Object.entries(agrupado).map(([fabricante, porSucursal]) => {
        const col = COLORES[fabricante] || COLOR_DEFAULT;
        const totalFab = Object.values(porSucursal).flat().length;

        return (
          <div key={fabricante} style={{
            marginBottom: "24px",
            border: `1px solid ${col.border}`,
            borderRadius: "12px", overflow: "hidden",
          }}>
            {/* Header fabricante */}
            <div style={{
              background: col.badge + "22", padding: "11px 18px",
              display: "flex", alignItems: "center", gap: "12px",
              borderBottom: `1px solid ${col.border}`,
            }}>
              <span style={{
                background: col.badge, color: col.badgeText,
                padding: "4px 14px", borderRadius: "9999px",
                fontWeight: 700, fontSize: "13px",
              }}>
                {fabricante}
              </span>
              <span style={{ color: "#64748b", fontSize: "12px" }}>
                {totalFab} pieza{totalFab !== 1 ? "s" : ""} en lista
              </span>
            </div>

            {/* Sub-bloques por sucursal */}
            {Object.entries(porSucursal).map(([sucId, items]) => (
              <div key={sucId}>
                <div style={{
                  background: "#0f172a", padding: "6px 18px",
                  fontSize: "11px", color: "#475569",
                  fontWeight: 700, letterSpacing: "0.8px",
                  textTransform: "uppercase", borderBottom: "1px solid #1f2937",
                }}>
                  📍 {SUCURSALES[sucId]?.nombre || sucId}
                </div>

                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr style={{ background: "#0a0f1a", color: "#64748b" }}>
                      <th style={{ padding: "9px 14px", textAlign: "left" }}>Número de Parte</th>
                      <th style={{ padding: "9px 14px", textAlign: "left" }}>Descripción</th>
                      <th style={{ padding: "9px 14px", textAlign: "center" }}>Cant.</th>
                      <th style={{ padding: "9px 14px", textAlign: "left" }}>OT</th>
                      <th style={{ padding: "9px 14px", textAlign: "center", width: "48px" }}>✕</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item._index} style={{
                        borderBottom: "1px solid #1f2937",
                        background: idx % 2 === 0 ? "#111827" : "#0f172a",
                      }}>
                        <td style={{ padding: "9px 14px", fontFamily: "monospace", color: "#e2e8f0", fontWeight: 600 }}>
                          {item.parte}
                        </td>
                        <td style={{ padding: "9px 14px", color: "#94a3b8" }}>
                          {item.descripcion || "—"}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center", fontWeight: 700, color: "#f1f5f9" }}>
                          {item.cantidad}
                        </td>
                        <td style={{ padding: "9px 14px", color: item.ot ? "#60a5fa" : "#4b5563" }}>
                          {item.ot || <span style={{ fontStyle: "italic", color: "#4b5563" }}>Sin OT — stock libre</span>}
                        </td>
                        <td style={{ padding: "9px 14px", textAlign: "center" }}>
                          <button
                            onClick={() => quitar(item._index)}
                            style={{
                              background: "transparent", border: "none",
                              color: "#ef4444", cursor: "pointer",
                              fontSize: "16px", lineHeight: 1, padding: "2px 6px",
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
