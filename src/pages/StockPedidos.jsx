import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

export default function StockPedidos() {
  const [data, setData] = useState([]);

  const cargar = async () => {
    const { data } = await supabase
      .from("stock_pedidos")
      .select("*")
      .eq("estatus", "Pendiente")
      .order("created_at", { ascending: false });

    setData(data || []);
  };

  useEffect(() => {
    cargar();
  }, []);

  const surtir = async (id) => {
    const ok = window.confirm("¿Marcar como surtido?");
    if (!ok) return;

    await supabase
      .from("stock_pedidos")
      .update({ estatus: "Surtido" })
      .eq("id", id);

    cargar();
  };

  return (
    <div>
      <h2>Pedidos de Stock</h2>

      {data.map((p) => (
        <div key={p.id}>
          {p.numero_parte} | {p.cantidad}
          <button onClick={() => surtir(p.id)}>Surtir</button>
        </div>
      ))}
    </div>
  );
}