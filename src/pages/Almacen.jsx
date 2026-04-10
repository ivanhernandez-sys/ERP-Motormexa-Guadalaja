import { useEffect, useState, useCallback } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import * as XLSX from "xlsx";

export default function Almacen() {
  const { user } = useAuth();
  const [tabActivo, setTabActivo] = useState("recepcion"); // "recepcion" | "inventario" | "pedidos"
  const [data, setData] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [cargando, setCargando] = useState(false);

  const esAdmin = user?.rol?.toLowerCase() === "admin";

  const cargarItems = useCallback(async () => {
    setCargando(true);
    let query = supabase
      .from("items")
      .select("*")
      .order("created_at", { ascending: false });

    if (!esAdmin && user?.sucursal_id) {
      query = query.eq("sucursal_id", user.sucursal_id);
    }

    const { data } = await query;
    setData(data || []);
    setCargando(false);
  }, [user, esAdmin]);

  useEffect(() => {
    cargarItems();
  }, [cargarItems]);

  // ==================== RECEPCIÓN MASIVA ====================
  const toggleSeleccion = (id) => {
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const recibirMasivo = async () => {
    if (seleccionados.length === 0) return alert("Selecciona al menos una pieza");
    if (!confirm(`¿Marcar ${seleccionados.length} piezas como Recibidas?`)) return;

    const { error } = await supabase
      .from("items")
      .update({ 
        estatus: "Recibida", 
        fecha_recepcion: new Date().toISOString() 
      })
      .in("id", seleccionados);

    if (!error) {
      alert("✅ Recepción confirmada");
      setSeleccionados([]);
      cargarItems();
    }
  };

  // ==================== CARGA CSV INVENTARIO ====================
  const subirInventarioCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'array' });
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

        let procesados = 0;

        for (const row of jsonData) {
          if (!row.numero_parte) continue;

          await supabase
            .from("items")
            .update({
              stock_fisico: parseInt(row.cantidad_stock) || 0,
              clasificacion: row.clasificacion,
              tiene_stock_almacen: (parseInt(row.cantidad_stock) || 0) > 0,
              comentario_almacen: (parseInt(row.cantidad_stock) || 0) > 0 ? "Verificar disponibilidad en almacén" : null
            })
            .eq("numero_parte", row.numero_parte?.toString().trim().toUpperCase());

          procesados++;
        }

        alert(`✅ ${procesados} piezas actualizadas desde inventario`);
        cargarItems();
      } catch (err) {
        alert("Error al procesar CSV: " + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2>🏭 Almacén</h2>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #334155", paddingBottom: "10px" }}>
        <button onClick={() => setTabActivo("recepcion")} 
          style={{ padding: "12px 20px", background: tabActivo === "recepcion" ? "#16a34a" : "#1f2937", color: "white", borderRadius: "8px" }}>
          📦 Recepción Masiva
        </button>
        <button onClick={() => setTabActivo("inventario")} 
          style={{ padding: "12px 20px", background: tabActivo === "inventario" ? "#2563eb" : "#1f2937", color: "white", borderRadius: "8px" }}>
          📤 Cargar Inventario (CSV)
        </button>
        <button onClick={() => setTabActivo("pedidos")} 
          style={{ padding: "12px 20px", background: tabActivo === "pedidos" ? "#eab308" : "#1f2937", color: "white", borderRadius: "8px" }}>
          📋 Pedidos de Stock
        </button>
      </div>

      {/* ====================== RECEPCIÓN MASIVA ====================== */}
      {tabActivo === "recepcion" && (
        <div>
          <button onClick={recibirMasivo} style={{ marginBottom: "15px", padding: "12px 24px", background: "#16a34a", color: "white", border: "none", borderRadius: "8px" }}>
            ✅ Recibir Seleccionados ({seleccionados.length})
          </button>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0f172a" }}>
                  <th style={{ padding: "12px" }}>✓</th>
                  <th style={{ padding: "12px" }}>OT</th>
                  <th style={{ padding: "12px" }}>Número de Parte</th>
                  <th style={{ padding: "12px" }}>Descripción</th>
                  <th style={{ padding: "12px" }}>Cantidad</th>
                  <th style={{ padding: "12px" }}>Estatus</th>
                  <th style={{ padding: "12px" }}>Fecha Recepción</th>
                </tr>
              </thead>
              <tbody>
                {data.map(item => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={{ padding: "12px" }}>
                      <input type="checkbox" checked={seleccionados.includes(item.id)} onChange={() => toggleSeleccion(item.id)} />
                    </td>
                    <td><strong>{item.ot}</strong></td>
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
        </div>
      )}

      {/* ====================== CARGA INVENTARIO CSV ====================== */}
      {tabActivo === "inventario" && (
        <div style={{ padding: "40px", textAlign: "center", background: "#111827", borderRadius: "12px" }}>
          <h3>📤 Cargar Inventario Actual</h3>
          <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
            Columnas recomendadas: numero_parte, cantidad_stock, clasificacion
          </p>
          <label style={{ 
            padding: "20px 40px", 
            background: "#166534", 
            color: "white", 
            borderRadius: "12px", 
            cursor: "pointer",
            display: "inline-block"
          }}>
            Seleccionar Archivo CSV
            <input type="file" accept=".csv" onChange={subirInventarioCSV} style={{ display: "none" }} />
          </label>
        </div>
      )}

      {/* ====================== PEDIDOS DE STOCK ====================== */}
      {tabActivo === "pedidos" && (
        <div>
          <p style={{ color: "#9ca3af" }}>Aquí se mostrarán los pedidos de stock (pendiente de integrar StockPedidos.jsx)</p>
          {/* Puedes importar y mostrar <StockPedidos /> aquí si quieres */}
        </div>
      )}
    </div>
  );
}