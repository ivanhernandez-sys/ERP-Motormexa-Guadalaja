// src/pages/Compras.jsx - Versión Final Mejorada (Agrupado por Sucursal)
import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import {
  HORARIOS_CORTE,
  ESTATUSES_ITEM,
} from "../utils/catalogos";
import FilaCompra from "../components/FilaCompra";
import FilaBO from "../components/FilaBO";

const FABRICANTES = ["Stellantis", "Mitsubishi", "Peugeot"];

export default function Compras() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("normal"); // "normal" | "bo"
  const [fabricanteActivo, setFabricanteActivo] = useState("Stellantis");

  const [dataNormal, setDataNormal] = useState({});
  const [dataBO, setDataBO] = useState({});

  const [cargando, setCargando] = useState(true);
  const [filtroEstatus, setFiltroEstatus] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const esAdmin = user?.rol?.toLowerCase() === "admin";

  const cargar = useCallback(async () => {
    setCargando(true);

    let q = supabase
      .from("items")
      .select("*, sucursal_id, sucursal_nombre, verificado_ventanilla, comentario_almacen")
      .order("created_at", { ascending: true });

    if (!esAdmin && user?.sucursal_id) {
      q = q.eq("sucursal_id", user.sucursal_id);
    }
    if (filtroEstatus) {
      q = q.eq("estatus", filtroEstatus);
    }

    const { data: rows } = await q;

    const normal = {};
    const bo = {};

    rows?.forEach(r => {
      const esBO = r.es_bo === true || r.estatus_bo || r.estatus === "BO";
      const target = esBO ? bo : normal;
      const fab = r.fabricante || "Otros";

      if (!target[fab]) target[fab] = [];
      target[fab].push(r);
    });

    setDataNormal(normal);
    setDataBO(bo);
    setCargando(false);
  }, [filtroEstatus, user, esAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase.channel(`compras-realtime`)
      .on("postgres_changes", { 
        event: "*", 
        schema: "public", 
        table: "items" 
      }, cargar)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [cargar]);

  const itemsActuales = activeTab === "normal" ? dataNormal : dataBO;
  const itemsFabricante = itemsActuales[fabricanteActivo] || [];

  // Agrupar por Sucursal
  const agruparPorSucursal = (items) => {
    const grupos = {};
    items.forEach(item => {
      const sucursal = item.sucursal_nombre || item.sucursal_id || "Sin Sucursal";
      if (!grupos[sucursal]) grupos[sucursal] = [];
      grupos[sucursal].push(item);
    });
    return grupos;
  };

  const grupos = agruparPorSucursal(itemsFabricante);

  // Filtrar por búsqueda
  const gruposFiltrados = Object.fromEntries(
    Object.entries(grupos).map(([sucursal, items]) => [
      sucursal,
      items.filter(item => {
        if (!busqueda) return true;
        const term = busqueda.toLowerCase();
        return (
          item.ot?.toLowerCase().includes(term) ||
          item.descripcion?.toLowerCase().includes(term) ||
          item.numero_parte?.toLowerCase().includes(term)
        );
      })
    ]).filter(([_, items]) => items.length > 0)
  );

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>🛒 Panel de Compras</h2>
        <div style={{ color: "#9ca3af" }}>
          {new Date().toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* Tabs de Fabricante */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {FABRICANTES.map(f => (
          <button
            key={f}
            onClick={() => setFabricanteActivo(f)}
            style={{
              padding: "10px 24px",
              borderRadius: "8px",
              border: "none",
              background: fabricanteActivo === f ? "#2563eb" : "#1f2937",
              color: fabricanteActivo === f ? "#fff" : "#9ca3af",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Tabs Normal / BO */}
      <div style={{ display: "flex", borderBottom: "2px solid #334155", marginBottom: "24px" }}>
        <button 
          onClick={() => setActiveTab("normal")}
          style={{
            padding: "12px 28px",
            fontWeight: "600",
            borderBottom: activeTab === "normal" ? "4px solid #3b82f6" : "none",
            color: activeTab === "normal" ? "#3b82f6" : "#9ca3af"
          }}
        >
          Compras Normales
        </button>
        <button 
          onClick={() => setActiveTab("bo")}
          style={{
            padding: "12px 28px",
            fontWeight: "600",
            borderBottom: activeTab === "bo" ? "4px solid #f59e0b" : "none",
            color: activeTab === "bo" ? "#f59e0b" : "#9ca3af"
          }}
        >
          Back Order (BO)
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        <input
          placeholder="Buscar OT, parte o descripción..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          style={{
            flex: 1,
            padding: "10px 14px",
            background: "#111827",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: "8px",
            fontSize: "14px"
          }}
        />
        <select 
          value={filtroEstatus} 
          onChange={e => setFiltroEstatus(e.target.value)}
          style={{
            padding: "10px 14px",
            background: "#111827",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: "8px"
          }}
        >
          <option value="">Todos los estatus</option>
          {ESTATUSES_ITEM.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Contenido: Agrupado por Sucursal */}
      {Object.keys(gruposFiltrados).length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px", color: "#9ca3af" }}>
          No hay piezas para mostrar con los filtros actuales.
        </div>
      ) : (
        Object.entries(gruposFiltrados).map(([sucursal, items]) => (
          <div key={sucursal} style={{ marginBottom: "32px" }}>
            <h3 style={{ 
              color: activeTab === "bo" ? "#f59e0b" : "#60a5fa",
              borderBottom: "2px solid #334155",
              paddingBottom: "10px",
              marginBottom: "16px",
              fontSize: "18px"
            }}>
              📍 {sucursal}
              <span style={{ marginLeft: "12px", fontSize: "15px", color: "#9ca3af" }}>
                ({items.length} piezas)
              </span>
            </h3>

            <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                    {activeTab === "normal" ? (
                      <>
                        <th style={{ padding: "12px" }}>Referencia</th>
                        <th style={{ padding: "12px" }}>OT</th>
                        <th style={{ padding: "12px" }}>Ubicación</th>
                        <th style={{ padding: "12px" }}>Descripción</th>
                        <th style={{ padding: "12px" }}>Cant.</th>
                        <th style={{ padding: "12px" }}>Estatus</th>
                        <th style={{ padding: "12px" }}>Fecha Compra</th>
                        <th style={{ padding: "12px" }}>N° Pedido</th>
                        <th style={{ padding: "12px" }}>Acción</th>
                      </>
                    ) : (
                      <>
                        <th style={{ padding: "12px" }}>OT</th>
                        <th style={{ padding: "12px" }}>Parte</th>
                        <th style={{ padding: "12px" }}>Descripción</th>
                        <th style={{ padding: "12px" }}>Cant</th>
                        <th style={{ padding: "12px" }}>Estatus BO</th>
                        <th style={{ padding: "12px" }}>Proveedor</th>
                        <th style={{ padding: "12px" }}>Guía</th>
                        <th style={{ padding: "12px" }}>Prioridad</th>
                        <th style={{ padding: "12px" }}>Acciones</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => 
                    activeTab === "normal" ? (
                      <FilaCompra key={item.id} item={item} onActualizar={cargar} />
                    ) : (
                      <FilaBO 
                        key={item.id} 
                        item={item} 
                        onActualizar={cargar}
                        onMandarGeneral={async (id) => {
                          if (!confirm("¿Mover esta pieza a Compras Normales?")) return;
                          await supabase.from("items").update({ 
                            estatus: "Pendiente", 
                            es_bo: false, 
                            estatus_bo: null 
                          }).eq("id", id);
                          cargar();
                        }}
                      />
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}