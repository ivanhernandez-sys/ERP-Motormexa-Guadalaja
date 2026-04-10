import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { SUCURSALES } from "../utils/catalogos";
import StockPedidos from "./StockPedidos";
import * as XLSX from "xlsx";

// ─── Paleta por fabricante ────────────────────────────────────────────────────
const COLORES_FABRICANTE = {
  Stellantis: {
    header: "#0f2847",
    border: "#1d4ed8",
    badge: "#1d4ed8",
    badgeText: "#bfdbfe",
    rowAlt: "#0c1f3a",
  },
  Mitsubishi: {
    header: "#0a2818",
    border: "#15803d",
    badge: "#15803d",
    badgeText: "#bbf7d0",
    rowAlt: "#091f14",
  },
  Peugeot: {
    header: "#2a0f1e",
    border: "#be185d",
    badge: "#be185d",
    badgeText: "#fbcfe8",
    rowAlt: "#200c17",
  },
};

const COLOR_DEFAULT = {
  header: "#1e293b",
  border: "#334155",
  badge: "#334155",
  badgeText: "#e2e8f0",
  rowAlt: "#111827",
};

// ─── Componente: bloque de recepción por fabricante ──────────────────────────
function BloqueRecepcion({ fabricante, sucursalNombre, items, seleccionados, onToggle }) {
  const col = COLORES_FABRICANTE[fabricante] || COLOR_DEFAULT;
  const ids = items.map((i) => i.id);
  const todosSeleccionados = ids.length > 0 && ids.every((id) => seleccionados.includes(id));

  const toggleTodos = () => {
    if (todosSeleccionados) {
      onToggle(ids, false);
    } else {
      onToggle(ids, true);
    }
  };

  return (
    <div
      style={{
        marginBottom: "28px",
        border: `1px solid ${col.border}`,
        borderRadius: "12px",
        overflow: "hidden",
      }}
    >
      {/* Header del bloque */}
      <div
        style={{
          background: col.header,
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          borderBottom: `1px solid ${col.border}`,
        }}
      >
        <span
          style={{
            background: col.badge,
            color: col.badgeText,
            padding: "4px 14px",
            borderRadius: "9999px",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          {fabricante}
        </span>
        <span style={{ color: "#94a3b8", fontSize: "13px" }}>
          {sucursalNombre}
        </span>
        <span style={{ color: "#64748b", fontSize: "12px" }}>
          · {items.length} pieza{items.length !== 1 ? "s" : ""}
        </span>

        <button
          onClick={toggleTodos}
          style={{
            marginLeft: "auto",
            background: todosSeleccionados ? "#374151" : col.badge,
            color: col.badgeText,
            border: "none",
            padding: "5px 14px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          {todosSeleccionados ? "Quitar todos" : "Seleccionar todos"}
        </button>
      </div>

      {/* Tabla */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#0f172a", color: "#64748b" }}>
              <th style={{ padding: "10px 14px", width: "40px" }}>✓</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>OT</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Número de Parte</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Descripción</th>
              <th style={{ padding: "10px 14px", textAlign: "center" }}>Cant.</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Estatus</th>
              <th style={{ padding: "10px 14px", textAlign: "left" }}>Fecha Recepción</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const seleccionado = seleccionados.includes(item.id);
              return (
                <tr
                  key={item.id}
                  style={{
                    background: seleccionado
                      ? col.rowAlt
                      : idx % 2 === 0
                      ? "#111827"
                      : "#0f172a",
                    borderBottom: "1px solid #1f2937",
                    cursor: "pointer",
                  }}
                  onClick={() => onToggle([item.id], !seleccionado)}
                >
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      onChange={() => {}} // controlado por el onClick del tr
                      style={{ accentColor: col.badge, width: "16px", height: "16px" }}
                    />
                  </td>
                  <td style={{ padding: "10px 14px", fontWeight: 700, color: "#e2e8f0" }}>
                    {item.ot}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#cbd5e1", fontFamily: "monospace" }}>
                    {item.numero_parte}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#94a3b8" }}>
                    {item.descripcion || "—"}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, color: "#e2e8f0" }}>
                    {item.cantidad}
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "9999px",
                        fontSize: "11px",
                        fontWeight: 600,
                        background: item.estatus === "Comprada" ? "#1e3a5f" : "#422006",
                        color: item.estatus === "Comprada" ? "#93c5fd" : "#fcd34d",
                      }}
                    >
                      {item.estatus}
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px", color: "#64748b", fontSize: "12px" }}>
                    {item.fecha_recepcion
                      ? new Date(item.fecha_recepcion).toLocaleDateString("es-MX")
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function Almacen() {
  const { user } = useAuth();
  const [tabActivo, setTabActivo] = useState("recepcion");
  const [data, setData] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [filtroSucursal, setFiltroSucursal] = useState("todas");
  const [confirmando, setConfirmando] = useState(false);

  const esAdmin =
    user?.rol?.toLowerCase() === "admin" ||
    user?.rol?.toLowerCase() === "gerente";

  // ─── Cargar ítems pendientes de recepción ───────────────────────────────
  const cargarItems = useCallback(async () => {
    setCargando(true);

    let query = supabase
      .from("items")
      .select("*")
      .in("estatus", ["Pendiente", "Comprada"]) // ✅ BUG FIX: solo piezas pendientes de recibir
      .order("fabricante", { ascending: true })
      .order("created_at", { ascending: false });

    if (!esAdmin && user?.sucursal_id) {
      query = query.eq("sucursal_id", user.sucursal_id);
    }

    const { data: rows, error } = await query;

    if (error) {
      console.error("Error cargando items:", error);
      setData([]);
    } else {
      setData(rows || []);
    }

    setCargando(false);
  }, [user, esAdmin]);

  useEffect(() => {
    cargarItems();
  }, [cargarItems]);

  // ─── Agrupar por sucursal → fabricante ──────────────────────────────────
  const datosFiltrados =
    filtroSucursal === "todas"
      ? data
      : data.filter((i) => i.sucursal_id === filtroSucursal);

  // Estructura: { [sucursal_id]: { [fabricante]: [items] } }
  const agrupado = datosFiltrados.reduce((acc, item) => {
    const suc = item.sucursal_id || "sin_sucursal";
    const fab = item.fabricante || "Sin fabricante";
    if (!acc[suc]) acc[suc] = {};
    if (!acc[suc][fab]) acc[suc][fab] = [];
    acc[suc][fab].push(item);
    return acc;
  }, {});

  // ─── Toggle selección (acepta array de ids y estado deseado) ────────────
  const handleToggle = (ids, seleccionar) => {
    setSeleccionados((prev) => {
      if (seleccionar) {
        // Agregar los que no estén ya
        const nuevos = ids.filter((id) => !prev.includes(id));
        return [...prev, ...nuevos];
      } else {
        // Quitar los que estén
        return prev.filter((id) => !ids.includes(id));
      }
    });
  };

  // ─── Recepción masiva ────────────────────────────────────────────────────
  const recibirMasivo = async () => {
    if (seleccionados.length === 0) {
      alert("Selecciona al menos una pieza");
      return;
    }
    if (!window.confirm(`¿Marcar ${seleccionados.length} pieza(s) como Recibidas?`)) return;

    setConfirmando(true);

    const { error } = await supabase
      .from("items")
      .update({
        estatus: "Recibida",
        fecha_recepcion: new Date().toISOString(),
      })
      .in("id", seleccionados);

    setConfirmando(false);

    if (!error) {
      alert(`✅ ${seleccionados.length} pieza(s) recibidas correctamente`);
      setSeleccionados([]);
      cargarItems();
    } else {
      alert("❌ Error al confirmar recepción: " + error.message);
    }
  };

  // ─── Carga CSV inventario ────────────────────────────────────────────────
  const subirInventarioCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: "array" });
        const jsonData = XLSX.utils.sheet_to_json(
          workbook.Sheets[workbook.SheetNames[0]]
        );

        let procesados = 0;

        for (const row of jsonData) {
          if (!row.numero_parte) continue;

          const cantStock = parseInt(row.cantidad_stock) || 0;

          await supabase
            .from("items")
            .update({
              stock_fisico: cantStock,
              clasificacion: row.clasificacion,
              tiene_stock_almacen: cantStock > 0,
              comentario_almacen:
                cantStock > 0 ? "Verificar disponibilidad en almacén" : null,
            })
            .eq(
              "numero_parte",
              row.numero_parte?.toString().trim().toUpperCase()
            );

          procesados++;
        }

        alert(`✅ ${procesados} piezas actualizadas desde inventario`);
        // Limpiar el input para permitir subir el mismo archivo de nuevo
        e.target.value = "";
        cargarItems();
      } catch (err) {
        alert("Error al procesar el archivo: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ─── Sucursales disponibles para el filtro ───────────────────────────────
  const sucursalesEnData = [
    ...new Set(data.map((i) => i.sucursal_id).filter(Boolean)),
  ];

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px", color: "#e5e7eb", minHeight: "100%" }}>
      <h2 style={{ margin: "0 0 20px", color: "#f1f5f9", fontSize: "20px" }}>
        🏭 Almacén
      </h2>

      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          borderBottom: "2px solid #1f2937",
          paddingBottom: "12px",
        }}
      >
        {[
          { key: "recepcion", label: "📦 Recepción Masiva", color: "#16a34a" },
          { key: "inventario", label: "📤 Cargar Inventario (CSV)", color: "#2563eb" },
          { key: "pedidos", label: "📋 Pedidos de Stock", color: "#d97706" },
        ].map(({ key, label, color }) => (
          <button
            key={key}
            onClick={() => setTabActivo(key)}
            style={{
              padding: "10px 20px",
              background: tabActivo === key ? color : "#1f2937",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: tabActivo === key ? 700 : 400,
              fontSize: "13px",
              transition: "background 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════ RECEPCIÓN MASIVA ══════════════════ */}
      {tabActivo === "recepcion" && (
        <div>
          {/* Barra de acciones */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "20px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={recibirMasivo}
              disabled={seleccionados.length === 0 || confirmando}
              style={{
                padding: "11px 24px",
                background:
                  seleccionados.length === 0 ? "#374151" : "#16a34a",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor:
                  seleccionados.length === 0 ? "not-allowed" : "pointer",
                fontWeight: 700,
                fontSize: "14px",
                opacity: confirmando ? 0.7 : 1,
              }}
            >
              {confirmando
                ? "Confirmando..."
                : `✅ Recibir Seleccionados (${seleccionados.length})`}
            </button>

            {/* Filtro por sucursal — solo visible para admin/gerente */}
            {esAdmin && sucursalesEnData.length > 1 && (
              <select
                value={filtroSucursal}
                onChange={(e) => {
                  setFiltroSucursal(e.target.value);
                  setSeleccionados([]); // limpiar selección al cambiar filtro
                }}
                style={{
                  padding: "9px 14px",
                  background: "#0f172a",
                  border: "1px solid #334155",
                  color: "#e2e8f0",
                  borderRadius: "8px",
                  fontSize: "13px",
                  cursor: "pointer",
                }}
              >
                <option value="todas">Todas las sucursales</option>
                {sucursalesEnData.map((suc) => (
                  <option key={suc} value={suc}>
                    {SUCURSALES[suc]?.nombre || suc}
                  </option>
                ))}
              </select>
            )}

            <span style={{ color: "#64748b", fontSize: "12px", marginLeft: "auto" }}>
              {datosFiltrados.length} pieza(s) pendientes
            </span>
          </div>

          {/* Contenido */}
          {cargando ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px",
                color: "#4b5563",
                fontSize: "15px",
              }}
            >
              Cargando piezas...
            </div>
          ) : datosFiltrados.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "80px",
                color: "#4b5563",
                fontSize: "15px",
                background: "#111827",
                borderRadius: "12px",
                border: "1px solid #1f2937",
              }}
            >
              ✅ No hay piezas pendientes de recepción
            </div>
          ) : (
            // Iterar por sucursal → por fabricante
            Object.entries(agrupado).map(([sucId, porFabricante]) => (
              <div key={sucId}>
                {/* Título de sucursal — solo si hay más de una */}
                {(esAdmin && sucursalesEnData.length > 1) ||
                filtroSucursal === "todas" ? (
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      letterSpacing: "1px",
                      color: "#475569",
                      textTransform: "uppercase",
                      marginBottom: "10px",
                      marginTop: "8px",
                    }}
                  >
                    📍 {SUCURSALES[sucId]?.nombre || sucId}
                  </div>
                ) : null}

                {/* Bloques por fabricante dentro de la sucursal */}
                {Object.entries(porFabricante).map(([fabricante, items]) => (
                  <BloqueRecepcion
                    key={`${sucId}-${fabricante}`}
                    fabricante={fabricante}
                    sucursalNombre={SUCURSALES[sucId]?.nombre || sucId}
                    items={items}
                    seleccionados={seleccionados}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* ══════════════════ CARGA INVENTARIO CSV ══════════════════ */}
      {tabActivo === "inventario" && (
        <div
          style={{
            padding: "50px 40px",
            textAlign: "center",
            background: "#111827",
            borderRadius: "12px",
            border: "1px solid #1f2937",
          }}
        >
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>📤</div>
          <h3 style={{ color: "#e2e8f0", marginBottom: "10px" }}>
            Cargar Inventario Actual
          </h3>
          <p style={{ color: "#6b7280", marginBottom: "28px", fontSize: "14px" }}>
            Columnas requeridas:{" "}
            <code
              style={{
                background: "#0f172a",
                padding: "2px 8px",
                borderRadius: "4px",
                color: "#94a3b8",
              }}
            >
              numero_parte, cantidad_stock, clasificacion
            </code>
          </p>
          <label
            style={{
              padding: "14px 36px",
              background: "#166534",
              color: "white",
              borderRadius: "10px",
              cursor: "pointer",
              display: "inline-block",
              fontWeight: 600,
              fontSize: "14px",
              transition: "background 0.15s",
            }}
          >
            Seleccionar Archivo CSV / Excel
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={subirInventarioCSV}
              style={{ display: "none" }}
            />
          </label>
        </div>
      )}

      {/* ══════════════════ PEDIDOS DE STOCK ══════════════════ */}
      {tabActivo === "pedidos" && (
        // ✅ BUG FIX: StockPedidos integrado correctamente
        <StockPedidos />
      )}
    </div>
  );
}
