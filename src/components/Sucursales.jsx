import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function Sucursales() {
  const [data, setData] = useState([]);

  const cargar = async () => {
    const { data } = await supabase.rpc("dashboard_sucursales");
    setData(data || []);
  };

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={{
      background: "#111827",
      padding: "20px",
      borderRadius: "12px",
      border: "1px solid #1f2937",
      color: "#e5e7eb",
    }}>
      <h3>🏢 Sucursales</h3>

      {data.map((s, i) => {
        const total = s.pendientes + s.entregadas;
        const porcentaje = total
          ? ((s.entregadas / total) * 100).toFixed(0)
          : 0;

        return (
          <div key={i} style={{ marginTop: "10px" }}>
            <div>{s.sucursal_id}</div>

            <div style={{
              height: "6px",
              background: "#1f2937",
              borderRadius: "4px",
            }}>
              <div style={{
                width: `${porcentaje}%`,
                background: "#3b82f6",
                height: "100%",
              }} />
            </div>

            <small style={{ color: "#9ca3af" }}>
              {porcentaje}% entregado
            </small>
          </div>
        );
      })}
    </div>
  );
}