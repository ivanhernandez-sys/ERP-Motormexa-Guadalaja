// src/pages/ConsultaOT.jsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { COLOR_ESTATUS, formatFecha } from "../utils/catalogos";
import { Link } from "react-router-dom";

function Badge({ estatus }) {
  const c = COLOR_ESTATUS[estatus] || { bg: "#374151", text: "#d1d5db" };
  return (
    <span
      style={{
        background: c.bg,
        color: c.text,
        padding: "4px 12px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 700,
      }}
    >
      {estatus}
    </span>
  );
}

export default function ConsultaOT() {
  const { user } = useAuth();
  const [modo, setModo] = useState("buscar"); // "buscar" | "listado"
  const [filtroEstado, setFiltroEstado] = useState("todas"); // "todas" | "incompletas" | "completas"

  const [query, setQuery] = useState("");
  const [resultado, setResultado] = useState(null);
  const [misOTs, setMisOTs] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);

  // Cargar todas las OTs del asesor
  const cargarMisOTs = async () => {
    if (!user?.id) return;

    setCargando(true);
    const { data, error } = await supabase
      .from("items")
      .select(`
        ot, 
        estatus, 
        created_at, 
        fecha_compra,
        fabricante, 
        marca, 
        modelo
      `)
      .eq("asesor_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error al cargar OTs:", error);
      setCargando(false);
      return;
    }

    // Agrupar por OT
    const agrupadas = {};
    data.forEach((item) => {
      if (!agrupadas[item.ot]) {
        agrupadas[item.ot] = {
          ot: item.ot,
          created_at: item.created_at,
          fecha_compra: item.fecha_compra,
          fabricante: item.fabricante,
          marca: item.marca,
          modelo: item.modelo,
          items: [],
        };
      }
      agrupadas[item.ot].items.push(item);
    });

    let lista = Object.values(agrupadas).map((grupo) => {
      const total = grupo.items.length;
      const entregadas = grupo.items.filter((i) => i.estatus === "Entregada").length;

      let estado = "Pendiente";
      if (entregadas === total) estado = "Completa";
      else if (entregadas > 0) estado = "Parcial";

      return {
        ...grupo,
        total,
        entregadas,
        estado,
      };
    });

    // Aplicar filtro
    if (filtroEstado === "incompletas") {
      lista = lista.filter((ot) => ot.estado !== "Completa");
    } else if (filtroEstado === "completas") {
      lista = lista.filter((ot) => ot.estado === "Completa");
    }

    setMisOTs(lista);
    setCargando(false);
  };

  // Buscar OT específica
  const consultar = async () => {
    const q = query.trim().toUpperCase();
    if (!q) return;

    setCargando(true);
    setResultado(null);

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

    const entregadas = data.filter((r) => r.estatus === "Entregada").length;
    const recibidas = data.filter((r) => r.estatus === "Recibida").length;

    let estatusOT = "Pendiente";
    if (entregadas === data.length) estatusOT = "Completa";
    else if (entregadas > 0 || recibidas > 0) estatusOT = "Parcial";

    setResultado({ items: data, ot: q, entregadas, recibidas, estatusOT });
  };

  const copiar = () => {
    if (!resultado?.items) return;
    const texto = resultado.items
      .map((r) => `${r.ot} | ${r.descripcion || r.numero_parte} | ${r.estatus} | ETA: ${formatFecha(r.eta)}`)
      .join("\n");
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  // Recargar listado cuando cambie modo o filtro
  useEffect(() => {
    if (modo === "listado") {
      cargarMisOTs();
    }
  }, [modo, filtroEstado]);

  return (
    <div style={{ padding: "20px", color: "#e5e7eb", maxWidth: "1100px" }}>
      <h2 style={{ marginBottom: "20px" }}>🔍 Consulta de OT</h2>

      {/* Selector de modo */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <button
          onClick={() => setModo("buscar")}
          style={{
            padding: "10px 20px",
            background: modo === "buscar" ? "#2563eb" : "#1f2937",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: modo === "buscar" ? 600 : 400,
          }}
        >
          Buscar OT específica
        </button>

        <button
          onClick={() => setModo("listado")}
          style={{
            padding: "10px 20px",
            background: modo === "listado" ? "#2563eb" : "#1f2937",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: modo === "listado" ? 600 : 400,
          }}
        >
          Ver mis OTs
        </button>
      </div>

      {/* ====================== MODO BÚSQUEDA ESPECÍFICA ====================== */}
      {modo === "buscar" && (
        <div>
          <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && consultar()}
              placeholder="Ingresa OT o Folio de Cotización"
              style={{
                flex: 1,
                background: "#111827",
                border: "1px solid #1f2937",
                color: "#e5e7eb",
                padding: "12px 16px",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />
            <button
              onClick={consultar}
              disabled={cargando}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "12px 28px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {cargando ? "Buscando..." : "Consultar"}
            </button>
          </div>

          {resultado?.vacia && (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: "60px" }}>
              ❌ No se encontraron refacciones para <strong>{resultado.ot}</strong>
            </div>
          )}

          {resultado?.items && (
            <div>
              <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "18px", fontWeight: 700 }}>OT {resultado.ot}</div>
                  <div style={{ color: "#9ca3af" }}>
                    {resultado.items[0]?.marca} {resultado.items[0]?.modelo}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <span>{resultado.entregadas}/{resultado.items.length} entregadas</span>
                  <Badge estatus={resultado.estatusOT} />
                  <button onClick={copiar} style={btnCopiar}>
                    {copiado ? "✅ Copiado" : "📋 Copiar"}
                  </button>
                </div>
              </div>

              {resultado.items.map((r) => (
                <div key={r.id} style={itemStyle}>
                  <div style={{ flex: 1 }}>
                    <div>{r.descripcion || r.numero_parte}</div>
                    {r.numero_parte && <div style={{ color: "#6b7280", fontSize: "13px" }}>{r.numero_parte}</div>}
                  </div>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ color: "#60a5fa" }}>{r.ubicacion}</span>
                    {r.eta && <span>ETA {formatFecha(r.eta)}</span>}
                    <Badge estatus={r.estatus} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ====================== MODO LISTADO DE MIS OTs ====================== */}
      {modo === "listado" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3>Mis Órdenes de Trabajo</h3>

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              style={{
                background: "#1f2937",
                color: "#e5e7eb",
                border: "1px solid #374151",
                padding: "8px 12px",
                borderRadius: "8px",
              }}
            >
              <option value="todas">Todas las OTs</option>
              <option value="incompletas">Solo Incompletas</option>
              <option value="completas">Solo Completas</option>
            </select>
          </div>

          {cargando ? (
            <p style={{ color: "#9ca3af" }}>Cargando tus órdenes...</p>
          ) : misOTs.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No tienes órdenes registradas aún.</p>
          ) : (
            misOTs.map((ot) => (
              <div key={ot.ot} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: 700 }}>
                      OT {ot.ot}
                    </div>
                    <div style={{ color: "#9ca3af", fontSize: "14px" }}>
                      {ot.marca} {ot.modelo}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Badge estatus={ot.estado} />
                    <Link
                      to={`/ventanilla/${ot.ot}`}
                      style={{
                        background: "#1e40af",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        textDecoration: "none",
                        fontSize: "13px",
                      }}
                    >
                      Ver detalle →
                    </Link>
                  </div>
                </div>

                <div style={{ marginTop: "14px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", fontSize: "13.5px" }}>
                  <div>
                    <strong>Fecha de Captura:</strong><br />
                    {formatFecha(ot.created_at)}
                  </div>
                  <div>
                    <strong>Fecha de Compra:</strong><br />
                    {ot.fecha_compra ? formatFecha(ot.fecha_compra) : "—"}
                  </div>
                  <div>
                    <strong>Progreso:</strong><br />
                    {ot.entregadas} / {ot.total} entregadas
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Estilos
const cardStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "12px",
  padding: "18px",
  marginBottom: "14px",
};

const itemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "12px 16px",
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: "8px",
  marginBottom: "8px",
};

const btnCopiar = {
  background: "#1f2937",
  color: "#9ca3af",
  border: "none",
  padding: "6px 14px",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "13px",
};