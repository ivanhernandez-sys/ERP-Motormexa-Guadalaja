import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { useParams } from "react-router-dom";

export default function VentanillaDetalle() {
  const { ot } = useParams();
  const [data, setData] = useState([]);
  const [seleccion, setSeleccion] = useState([]);
  const [cargando, setCargando] = useState(false);

  const cargar = async () => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("ot", ot);

    setData(data || []);
    setSeleccion([]);
  };

  useEffect(() => {
    cargar();
  }, [ot]); // ✅ dependencia correcta

  const toggle = (id) => {
    setSeleccion((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const entregar = async () => {
    if (seleccion.length === 0) {
      alert("Selecciona al menos un ítem");
      return;
    }

    const ok = window.confirm(`¿Confirmar entrega de ${seleccion.length} ítem(s)?`);
    if (!ok) return;

    setCargando(true);

    // ✅ Una sola query en vez de un loop
    const { error } = await supabase
      .from("items")
      .update({ estatus: "Entregada" })
      .in("id", seleccion);

    if (error) {
      alert("Error al actualizar. Intenta de nuevo.");
      console.error(error);
    } else {
      await cargar();
    }

    setCargando(false);
  };

  const pendientes = data.filter((r) => r.estatus === "Recibida");
  const entregadas = data.filter((r) => r.estatus === "Entregada");

  const colorEstatus = (estatus) => {
    const colores = {
      Pendiente: "#facc15",
      Comprada: "#3b82f6",
      Recibida: "#22c55e",
      Entregada: "#16a34a",
      Incorrecta: "#ef4444",
    };
    return colores[estatus] || "#9ca3af";
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2 style={{ marginBottom: "4px" }}>OT {ot}</h2>
      <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
        {entregadas.length}/{data.length} ítems entregados
      </p>

      {data.map((r) => (
        <div
          key={r.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px",
            marginBottom: "8px",
            background: "#111827",
            borderRadius: "8px",
            border: seleccion.includes(r.id) ? "1px solid #2563eb" : "1px solid #1f2937",
          }}
        >
          {r.estatus === "Recibida" && (
            <input
              type="checkbox"
              checked={seleccion.includes(r.id)}
              onChange={() => toggle(r.id)}
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
            />
          )}

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{r.descripcion || r.numero_parte}</div>
            {r.numero_parte && r.descripcion && (
              <div style={{ color: "#9ca3af", fontSize: "13px" }}>{r.numero_parte}</div>
            )}
          </div>

          <span
            style={{
              background: colorEstatus(r.estatus),
              color: "#000",
              padding: "4px 10px",
              borderRadius: "20px",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            {r.estatus}
          </span>
        </div>
      ))}

      {pendientes.length > 0 && (
        <button
          onClick={entregar}
          disabled={cargando || seleccion.length === 0}
          style={{
            marginTop: "16px",
            padding: "12px 24px",
            background: seleccion.length > 0 ? "#2563eb" : "#1f2937",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            cursor: seleccion.length > 0 ? "pointer" : "not-allowed",
            fontWeight: 600,
          }}
        >
          {cargando ? "Procesando..." : `Confirmar entrega (${seleccion.length})`}
        </button>
      )}
    </div>
  );
}
