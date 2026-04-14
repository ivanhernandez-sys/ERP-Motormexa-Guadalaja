// src/pages/Almacen.jsx - Versión Final Operativa (Sucursales reales)

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import Filtros from "../components/Filtros";
import * as XLSX from "xlsx";
  import { NOMBRES_SUCURSAL } from "../constants/roles";

  export default function Almacen() {
  const { user } = useAuth();
  const [tabActivo, setTabActivo] = useState("lista");
  const [data, setData] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [cargando, setCargando] = useState(false);
  const [pagina, setPagina] = useState(0);
  const limite = 50;

  const [sucursalFiltro, setSucursalFiltro] = useState("");

  const [subiendoInventario, setSubiendoInventario] = useState(false);
  const [subiendoVentas, setSubiendoVentas] = useState(false);

  // 🔥 ROLES
  const rol = user?.rol?.toLowerCase();
  const esAdmin = rol === "admin";

  const cargar = useCallback(async () => {
    setCargando(true);

    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    // 🔐 Restricción por sucursal
    if (!esAdmin && user?.sucursal_id) {
      query = query.eq("sucursal_id", user.sucursal_id);
    }

    // 👑 Admin puede filtrar
    if (esAdmin && sucursalFiltro) {
      query = query.eq("sucursal_id", sucursalFiltro);
    }

    if (filtros.estatus) query = query.eq("estatus", filtros.estatus);
    if (filtros.ot) query = query.ilike("ot", `%${filtros.ot}%`);
    if (filtros.numero_parte) query = query.ilike("numero_parte", `%${filtros.numero_parte}%`);

    const { data: rows } = await query.range(
      pagina * limite,
      (pagina + 1) * limite - 1
    );

    setData(rows || []);
    setCargando(false);

  }, [filtros, pagina, user, esAdmin, sucursalFiltro]);

  useEffect(() => { cargar(); }, [cargar]);

  // ==================== RECEPCIÓN ====================

  const toggleSeleccion = (id) => {
    setSeleccionados(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const recibirMasivo = async () => {
    if (seleccionados.length === 0) return alert("Selecciona al menos un ítem");
    if (!window.confirm(`¿Marcar ${seleccionados.length} ítems como Recibidos?`)) return;

    const fechaRecepcion = new Date().toISOString();

    const { error } = await supabase
      .from("items")
      .update({ estatus: "Recibida", fecha_recepcion: fechaRecepcion })
      .in("id", seleccionados);

    if (!error) {
      alert("✅ Recibidos correctamente");
      setSeleccionados([]);
      cargar();
    }
  };

  // ==================== EXPORTAR ====================

  const exportarExcel = () => {
    const datos = data.map(item => ({
      OT: item.ot,
      Sucursal: NOMBRES_SUCURSAL[item.sucursal_id] || item.sucursal_id,
      Parte: item.numero_parte,
      Descripción: item.descripcion,
      Cantidad: item.cantidad,
      Estatus: item.estatus,
      "Fecha Recepción": item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleDateString("es-MX") : "",
      Ubicación: item.ubicacion,
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(datos), "Almacen");
    XLSX.writeFile(wb, `Almacen_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // ==================== CSV ====================

  const subirInventarioCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoInventario(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const csvData = event.target.result;
        const workbook = XLSX.read(csvData, { type: 'string' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const datos = rows.map(row => ({
          numero_parte: String(row.numero_parte || "").trim().toUpperCase(),
          descripcion: String(row.descripcion || "").trim(),
          cantidad: parseInt(row.cantidad) || 0,
          clasificacion: String(row.clasificacion || "").trim(),
          sucursal_id: row.sucursal_id || user?.sucursal_id
        })).filter(row => row.numero_parte);

        const { error } = await supabase
          .from("inventario")
          .upsert(datos, { onConflict: 'numero_parte' });

        if (error) throw error;

        alert(`✅ ${datos.length} registros de inventario actualizados correctamente`);
      } catch (err) {
        alert("Error al cargar inventario: " + err.message);
      } finally {
        setSubiendoInventario(false);
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  const subirVentasCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSubiendoVentas(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const csvData = event.target.result;
        const workbook = XLSX.read(csvData, { type: 'string' });
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        const datos = rows.map(row => ({
          numero_parte: String(row.numero_parte || "").trim().toUpperCase(),
          fecha_venta: row.fecha_venta,
          cantidad_vendida: parseInt(row.cantidad_vendida) || 0,
          sucursal_id: row.sucursal_id || user?.sucursal_id,
          precio_venta: row.precio_venta ? parseFloat(row.precio_venta) : null
        })).filter(row => row.numero_parte && row.fecha_venta);

        const { error } = await supabase.from("ventas_mensuales").insert(datos);

        if (error) throw error;

        alert(`✅ ${datos.length} registros de ventas cargados correctamente`);
      } catch (err) {
        alert("Error al cargar ventas: " + err.message);
      } finally {
        setSubiendoVentas(false);
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
        <h2>🏭 Almacén / Recepción</h2>
        <button onClick={exportarExcel} style={{ padding: "10px 20px", background: "#2563eb", color: "white", border: "none", borderRadius: "8px" }}>
          📥 Exportar Excel
        </button>
      </div>

      {/* 🔽 FILTRO REAL */}
      {esAdmin && (
        <div style={{ marginBottom: "15px" }}>
          <select
            value={sucursalFiltro}
            onChange={(e) => {
              setSucursalFiltro(e.target.value);
              setPagina(0);
            }}
            style={{
              padding: "10px",
              borderRadius: "8px",
              background: "#1f2937",
              color: "white",
              border: "1px solid #374151"
            }}
          >
            <option value="">🏢 Todas</option>
            <option value="taller_vallarta">Vallarta</option>
            <option value="acueducto">Acueducto</option>
            <option value="camino_real">Camino Real</option>
            <option value="mayoreo_menudeo">Mayoreo</option>
          </select>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button onClick={() => setTabActivo("lista")} style={{ padding: "10px 24px", borderRadius: "8px", background: tabActivo === "lista" ? "#2563eb" : "#1f2937", color: "white" }}>
          📋 Lista General
        </button>
        <button onClick={() => setTabActivo("recepcion")} style={{ padding: "10px 24px", borderRadius: "8px", background: tabActivo === "recepcion" ? "#16a34a" : "#1f2937", color: "white" }}>
          📦 Recepción Masiva
        </button>
      </div>

      {/* CSV */}
      <div style={{ marginBottom: "20px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
        <label style={{ padding: "10px 18px", background: "#166534", color: "white", borderRadius: "8px", cursor: "pointer" }}>
          📤 Cargar Inventario Actual (CSV)
          <input type="file" accept=".csv" onChange={subirInventarioCSV} style={{ display: "none" }} disabled={subiendoInventario} />
        </label>

        <label style={{ padding: "10px 18px", background: "#2563eb", color: "white", borderRadius: "8px", cursor: "pointer" }}>
          📤 Cargar Ventas (CSV)
          <input type="file" accept=".csv" onChange={subirVentasCSV} style={{ display: "none" }} disabled={subiendoVentas} />
        </label>
      </div>

      <Filtros onFiltrar={setFiltros} />

      {tabActivo === "recepcion" && (
        <div style={{ marginBottom: "15px" }}>
          <button onClick={recibirMasivo} style={{ background: "#16a34a", color: "white", padding: "10px 20px", border: "none", borderRadius: "8px" }}>
            ✅ Marcar seleccionados como Recibidos
          </button>
          <span style={{ marginLeft: "12px", color: "#9ca3af" }}>{seleccionados.length} seleccionados</span>
        </div>
      )}

      {cargando ? (
        <div style={{ textAlign: "center", padding: "80px" }}>Cargando...</div>
      ) : (
        <div style={{ overflowX: "auto", background: "#111827", borderRadius: "12px", border: "1px solid #1f2937" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#0f172a", color: "#9ca3af" }}>
                <th>{tabActivo === "recepcion" && "✓"}</th>
                <th>OT</th>
                <th>Sucursal</th>
                <th>Parte</th>
                <th>Descripción</th>
                <th>Cant.</th>
                <th>Estatus</th>
                <th>Fecha Recepción</th>
              </tr>
            </thead>
            <tbody>
              {data.map(item => (
                <tr key={item.id} style={{ borderBottom: "1px solid #1f2937" }}>
                  {tabActivo === "recepcion" && (
                    <td>
                      <input type="checkbox" checked={seleccionados.includes(item.id)} onChange={() => toggleSeleccion(item.id)} />
                    </td>
                  )}
                  <td><strong>{item.ot}</strong></td>
                  <td>{NOMBRES_SUCURSAL[item.sucursal_id] || item.sucursal_id}</td>
                  <td>{item.numero_parte}</td>
                  <td>{item.descripcion}</td>
                  <td>{item.cantidad}</td>
                  <td>{item.estatus}</td>
                  <td>{item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleDateString("es-MX") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <button onClick={() => setPagina(p => Math.max(0, p-1))} disabled={pagina === 0}>⬅ Anterior</button>
        <span style={{ margin: "0 20px" }}>Página {pagina + 1}</span>
        <button onClick={() => setPagina(p => p + 1)}>Siguiente ➡</button>
      </div>

    </div>
  );
}