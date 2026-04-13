// src/pages/MisCotizaciones.jsx
// Flujo Mayoreo: Cotizaciones → aprobación parcial → Compras
// Coordinador de taller: igual que antes (liberar pieza a pieza)

import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { COLOR_ESTATUS, formatFecha, diasTranscurridos } from "../utils/catalogos";

function Badge({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "3px 10px", borderRadius: "20px",
      fontSize: "11px", fontWeight: 700,
    }}>
      {estatus}
    </span>
  );
}

// ── Vista Mayoreo ────────────────────────────────────────────────────────────
function MisCotizacionesMayoreo({ user }) {
  const [tab, setTab]             = useState("cotizaciones"); // "cotizaciones" | "ordenes"
  const [cotizaciones, setCotiz]  = useState([]);
  const [ordenes, setOrdenes]     = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [seleccion, setSeleccion] = useState({}); // { [folioId]: Set<itemId> }
  const [liberando, setLiberando] = useState(false);

  const cargar = async () => {
    if (!user?.id) return;
    setCargando(true);

    // Cotizaciones pendientes de aprobación (estatus = "Cotizada")
    const { data: dataCotiz } = await supabase
      .from("items")
      .select("*")
      .eq("asesor_id", user.id)
      .eq("es_cotizacion", true)
      .eq("estatus", "Cotizada")
      .order("created_at", { ascending: false });

    // Órdenes ya liberadas a compras (estatus != "Cotizada", es_cotizacion = true)
    const { data: dataOrd } = await supabase
      .from("items")
      .select("*")
      .eq("asesor_id", user.id)
      .eq("es_cotizacion", true)
      .neq("estatus", "Cotizada")
      .order("created_at", { ascending: false });

    // Agrupar cotizaciones por folio
    const folioMap = {};
    (dataCotiz || []).forEach(item => {
      const f = item.folio_cotizacion || "SIN-FOLIO";
      if (!folioMap[f]) folioMap[f] = {
        folio: f,
        tipo: item.tipo_cotizacion,
        cliente: item.cliente_aseguradora,
        siniestro: item.siniestro,
        orden_compra: item.orden_compra,
        marca: item.marca,
        modelo: item.modelo,
        created_at: item.created_at,
        items: [],
      };
      folioMap[f].items.push(item);
    });

    // Agrupar órdenes por folio
    const ordenMap = {};
    (dataOrd || []).forEach(item => {
      const f = item.folio_cotizacion || "SIN-FOLIO";
      if (!ordenMap[f]) ordenMap[f] = {
        folio: f,
        tipo: item.tipo_cotizacion,
        cliente: item.cliente_aseguradora,
        marca: item.marca,
        modelo: item.modelo,
        created_at: item.created_at,
        items: [],
      };
      ordenMap[f].items.push(item);
    });

    setCotiz(Object.values(folioMap));
    setOrdenes(Object.values(ordenMap));
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [user]);

  // Toggle selección de una pieza dentro de un folio
  const togglePieza = (folio, itemId) => {
    setSeleccion(prev => {
      const set = new Set(prev[folio] || []);
      if (set.has(itemId)) set.delete(itemId);
      else set.add(itemId);
      return { ...prev, [folio]: set };
    });
  };

  // Seleccionar/deseleccionar todas las piezas de un folio
  const toggleTodas = (folio, items) => {
    setSeleccion(prev => {
      const set = prev[folio] || new Set();
      const todasSeleccionadas = items.every(i => set.has(i.id));
      const nueva = new Set(todasSeleccionadas ? [] : items.map(i => i.id));
      return { ...prev, [folio]: nueva };
    });
  };

  // Liberar piezas seleccionadas a Compras
  const liberarACompras = async (folio) => {
    const ids = [...(seleccion[folio] || [])];
    if (ids.length === 0) { alert("Selecciona al menos una pieza"); return; }

    const total = cotizaciones.find(c => c.folio === folio)?.items.length || 0;
    const msg = ids.length === total
      ? `¿Liberar TODAS las ${ids.length} piezas del folio ${folio} a Compras?`
      : `¿Liberar ${ids.length} de ${total} piezas del folio ${folio} a Compras?\n\nLas piezas NO seleccionadas quedarán como "Cotizadas" (no aprobadas).`;

    if (!confirm(msg)) return;

    setLiberando(true);

    const { error } = await supabase
      .from("items")
      .update({
        estatus:          "Pendiente",
        es_cotizacion:    true,           // mantiene el vínculo al folio
        fecha_liberacion: new Date().toISOString(),
      })
      .in("id", ids);

    setLiberando(false);

    if (error) {
      alert("Error al liberar: " + error.message);
      return;
    }

    alert(`✅ ${ids.length} pieza(s) liberadas a Compras`);
    setSeleccion(prev => ({ ...prev, [folio]: new Set() }));
    cargar();
  };

  // ── Métricas de efectividad ────────────────────────────────────────────
  const totalCotizadas = cotizaciones.reduce((s, c) => s + c.items.length, 0);
  const totalVendidas  = ordenes.reduce((s, o) => s + o.items.filter(i => i.estatus !== "Cotizada").length, 0);
  const efectividad    = (totalCotizadas + totalVendidas) > 0
    ? ((totalVendidas / (totalCotizadas + totalVendidas)) * 100).toFixed(1)
    : 0;

  // Calcular estatus de una orden
  const calcEstatusOrden = (items) => {
    if (items.every(i => i.estatus === "Entregada")) return "Completa";
    if (items.some(i => i.estatus === "Entregada" || i.estatus === "Recibida")) return "Parcial";
    return "Pendiente";
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2 style={{ margin: "0 0 4px" }}>📋 Mis Cotizaciones</h2>
      <p style={{ color: "#9ca3af", fontSize: "13px", margin: "0 0 20px" }}>
        {user?.nombre} · Mayoreo/Menudeo
      </p>

      {/* ── Métricas de efectividad ── */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        {[
          { label: "Piezas cotizadas",    val: totalCotizadas,              color: "#93c5fd" },
          { label: "Piezas vendidas",     val: totalVendidas,               color: "#4ade80" },
          { label: "Efectividad",         val: `${efectividad}%`,           color: efectividad >= 50 ? "#22c55e" : "#f87171" },
          { label: "Folios activos",      val: cotizaciones.length,         color: "#e5e7eb" },
          { label: "Órdenes en proceso",  val: ordenes.length,              color: "#fbbf24" },
        ].map(k => (
          <div key={k.label} style={{
            background: "#111827", border: "1px solid #1f2937",
            borderRadius: "8px", padding: "12px 18px", textAlign: "center", minWidth: "100px"
          }}>
            <div style={{ color: k.color, fontSize: "20px", fontWeight: 700 }}>{k.val}</div>
            <div style={{ color: "#9ca3af", fontSize: "11px" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          onClick={() => setTab("cotizaciones")}
          style={{
            padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: tab === "cotizaciones" ? "#2563eb" : "#1f2937",
            color: "#fff", fontWeight: tab === "cotizaciones" ? 600 : 400,
          }}
        >
          📋 Cotizaciones ({cotizaciones.length})
        </button>
        <button
          onClick={() => setTab("ordenes")}
          style={{
            padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            background: tab === "ordenes" ? "#2563eb" : "#1f2937",
            color: "#fff", fontWeight: tab === "ordenes" ? 600 : 400,
          }}
        >
          🛒 Órdenes de Compra ({ordenes.length})
        </button>
      </div>

      {cargando ? (
        <p style={{ color: "#9ca3af" }}>Cargando...</p>
      ) : (
        <>
          {/* ══════════ TAB: COTIZACIONES ══════════ */}
          {tab === "cotizaciones" && (
            cotizaciones.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>
                No tienes cotizaciones pendientes de aprobación
              </p>
            ) : (
              cotizaciones.map(cot => {
                const sel = seleccion[cot.folio] || new Set();
                const todasSel = cot.items.every(i => sel.has(i.id));

                return (
                  <div key={cot.folio} style={{
                    background: "#111827", border: "1px solid #1f2937",
                    borderRadius: "12px", marginBottom: "16px", overflow: "hidden"
                  }}>
                    {/* Header del folio */}
                    <div style={{
                      padding: "14px 16px", background: "#0f172a",
                      borderBottom: "1px solid #1f2937",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      flexWrap: "wrap", gap: "10px"
                    }}>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: "15px", color: "#60a5fa" }}>
                          {cot.folio}
                        </span>
                        <span style={{
                          marginLeft: "10px", fontSize: "11px", fontWeight: 600,
                          background: "#1e3a5f", color: "#93c5fd",
                          padding: "2px 8px", borderRadius: "20px"
                        }}>
                          {cot.tipo}
                        </span>
                        {cot.cliente && (
                          <span style={{ marginLeft: "10px", color: "#9ca3af", fontSize: "13px" }}>
                            {cot.cliente}
                          </span>
                        )}
                        {cot.siniestro && (
                          <span style={{ marginLeft: "10px", color: "#fbbf24", fontSize: "12px" }}>
                            Siniestro: {cot.siniestro}
                          </span>
                        )}
                        {cot.orden_compra && (
                          <span style={{ marginLeft: "10px", color: "#a78bfa", fontSize: "12px" }}>
                            OC: {cot.orden_compra}
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                        <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                          {cot.marca} {cot.modelo} · {diasTranscurridos(cot.created_at)}d
                        </span>
                        <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                          {sel.size}/{cot.items.length} seleccionadas
                        </span>
                        <button
                          onClick={() => liberarACompras(cot.folio)}
                          disabled={liberando || sel.size === 0}
                          style={{
                            background: sel.size > 0 ? "#16a34a" : "#1f2937",
                            color: "#fff", border: "none",
                            padding: "8px 16px", borderRadius: "6px",
                            cursor: sel.size > 0 ? "pointer" : "not-allowed",
                            fontWeight: 600, fontSize: "13px"
                          }}
                        >
                          {liberando ? "..." : "✅ Cliente aprobó → Compras"}
                        </button>
                      </div>
                    </div>

                    {/* Tabla de piezas con selección */}
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ background: "#0a0f1a", color: "#6b7280" }}>
                          <th style={{ padding: "8px 12px", width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={todasSel}
                              onChange={() => toggleTodas(cot.folio, cot.items)}
                              style={{ cursor: "pointer" }}
                            />
                          </th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Descripción</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>N° Parte</th>
                          <th style={{ padding: "8px 12px", textAlign: "center" }}>Cant.</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>Ubicación</th>
                          <th style={{ padding: "8px 12px", textAlign: "left" }}>ETA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cot.items.map(item => (
                          <tr
                            key={item.id}
                            onClick={() => togglePieza(cot.folio, item.id)}
                            style={{
                              borderBottom: "1px solid #1f2937",
                              background: sel.has(item.id) ? "#052e16" : "transparent",
                              cursor: "pointer",
                            }}
                          >
                            <td style={{ padding: "10px 12px", textAlign: "center" }}>
                              <input
                                type="checkbox"
                                checked={sel.has(item.id)}
                                onChange={() => togglePieza(cot.folio, item.id)}
                                onClick={e => e.stopPropagation()}
                                style={{ cursor: "pointer" }}
                              />
                            </td>
                            <td style={{ padding: "10px 12px" }}>{item.descripcion || "—"}</td>
                            <td style={{ padding: "10px 12px", color: "#9ca3af" }}>{item.numero_parte || "—"}</td>
                            <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>{item.cantidad}</td>
                            <td style={{ padding: "10px 12px", color: "#60a5fa" }}>{item.ubicacion}</td>
                            <td style={{ padding: "10px 12px", color: "#9ca3af", fontSize: "11px" }}>
                              {formatFecha(item.eta)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })
            )
          )}

          {/* ══════════ TAB: ÓRDENES DE COMPRA ══════════ */}
          {tab === "ordenes" && (
            ordenes.length === 0 ? (
              <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>
                No tienes órdenes de compra aún
              </p>
            ) : (
              ordenes.map(ord => {
                const estatusOrden = calcEstatusOrden(ord.items);

                return (
                  <div key={ord.folio} style={{
                    background: "#111827", border: "1px solid #1f2937",
                    borderRadius: "12px", marginBottom: "12px", overflow: "hidden"
                  }}>
                    {/* Header */}
                    <div style={{
                      padding: "12px 16px", background: estatusOrden === "Completa" ? "#052e16" : "#0f172a",
                      borderBottom: "1px solid #1f2937",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span style={{ fontWeight: 700, fontSize: "15px" }}>{ord.folio}</span>
                        <span style={{ color: "#9ca3af", fontSize: "12px" }}>{ord.marca} {ord.modelo}</span>
                        {ord.cliente && (
                          <span style={{ color: "#9ca3af", fontSize: "12px" }}>{ord.cliente}</span>
                        )}
                        <span style={{ color: "#6b7280", fontSize: "11px" }}>
                          {ord.items.length} pza{ord.items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                          {diasTranscurridos(ord.created_at)}d
                        </span>
                        <span style={{
                          padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700,
                          background: estatusOrden === "Completa" ? "#166534" : estatusOrden === "Parcial" ? "#1e40af" : "#7f1d1d",
                          color: "#fff",
                        }}>
                          {estatusOrden}
                        </span>
                      </div>
                    </div>

                    {/* Piezas */}
                    <div style={{ padding: "4px 0" }}>
                      {ord.items.map(p => (
                        <div key={p.id} style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          padding: "8px 16px", borderBottom: "1px solid #0f172a",
                        }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: "13px" }}>{p.descripcion || p.numero_parte}</span>
                            {p.numero_parte && p.descripcion && (
                              <span style={{ color: "#6b7280", fontSize: "11px", marginLeft: "8px" }}>{p.numero_parte}</span>
                            )}
                            <span style={{ color: "#4b5563", fontSize: "11px", marginLeft: "8px" }}>[{p.ubicacion}]</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            {p.eta && (
                              <span style={{ color: "#60a5fa", fontSize: "11px" }}>ETA {formatFecha(p.eta)}</span>
                            )}
                            <Badge estatus={p.estatus} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )
          )}
        </>
      )}
    </div>
  );
}

// ── Vista Taller (coordinador) — igual que antes ─────────────────────────────
function MisCotizacionesTaller({ user }) {
  const [cotizaciones, setCotizaciones] = useState([]);
  const [cargando, setCargando]         = useState(true);
  const [filtro, setFiltro]             = useState("todas");

  const cargar = async () => {
    if (!user?.id) return;
    setCargando(true);
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("es_cotizacion", true)
      .eq("asesor_id", user.id)
      .order("created_at", { ascending: false });
    setCotizaciones(data || []);
    setCargando(false);
  };

  useEffect(() => { cargar(); }, [user]);

  const liberarACompras = async (id) => {
    if (!confirm("¿Liberar esta pieza a Compras?")) return;
    const { error } = await supabase
      .from("items")
      .update({ estatus: "Pendiente", es_cotizacion: false, fecha_liberacion: new Date().toISOString() })
      .eq("id", id);
    if (!error) { alert("✅ Pieza liberada correctamente a Compras"); cargar(); }
    else alert("Error al liberar la pieza");
  };

  const filtradas = cotizaciones.filter(c => {
    if (filtro === "pendientes") return c.estatus !== "Pendiente";
    if (filtro === "liberadas")  return c.estatus === "Pendiente";
    return true;
  });

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>📋 Mis Cotizaciones</h2>
        <select
          value={filtro}
          onChange={e => setFiltro(e.target.value)}
          style={{ padding: "8px 12px", background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", borderRadius: "8px" }}
        >
          <option value="todas">Todas</option>
          <option value="pendientes">Pendientes de liberar</option>
          <option value="liberadas">Ya liberadas a compras</option>
        </select>
      </div>

      {cargando ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>Cargando cotizaciones...</p>
      ) : filtradas.length === 0 ? (
        <p style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>No tienes cotizaciones registradas</p>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Folio Cotización</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Marca / Modelo</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Número de Parte</th>
                <th style={{ padding: "14px 12px", textAlign: "left" }}>Descripción</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Cantidad</th>
                <th style={{ padding: "14px 12px", textAlign: "center" }}>Estatus</th>
                <th style={{ padding: "14px 12px" }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(c => (
                <tr key={c.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  <td style={{ padding: "14px 12px" }}>{c.folio_cotizacion || "—"}</td>
                  <td style={{ padding: "14px 12px" }}>{c.marca} {c.modelo}</td>
                  <td style={{ padding: "14px 12px" }}>{c.numero_parte}</td>
                  <td style={{ padding: "14px 12px" }}>{c.descripcion}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center", fontWeight: 600 }}>{c.cantidad}</td>
                  <td style={{ padding: "14px 12px", textAlign: "center" }}>
                    <span style={{
                      padding: "6px 14px", borderRadius: "20px", fontSize: "13px",
                      background: c.estatus === "Pendiente" ? "#854d0e" : "#166534",
                      color: c.estatus === "Pendiente" ? "#fcd34d" : "#86efac"
                    }}>
                      {c.estatus || "Cotización"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 12px" }}>
                    {c.estatus !== "Pendiente" ? (
                      <button
                        onClick={() => liberarACompras(c.id)}
                        style={{ background: "#2563eb", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}
                      >
                        Liberar a Compras
                      </button>
                    ) : (
                      <span style={{ color: "#9ca3af", fontSize: "13px" }}>Ya liberada</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Componente raíz — decide qué vista mostrar ────────────────────────────────
export default function MisCotizaciones() {
  const { user } = useAuth();
  const esMayoreo = user?.sucursal_id === "mayoreo_menudeo";

  if (esMayoreo) return <MisCotizacionesMayoreo user={user} />;
  return <MisCotizacionesTaller user={user} />;
}
