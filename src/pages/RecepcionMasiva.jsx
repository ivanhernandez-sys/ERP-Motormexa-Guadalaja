import { useState } from "react";
import { supabase } from "../services/supabase";

export default function RecepcionMasiva() {
  const [parte, setParte] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [lista, setLista] = useState([]);

  // 🔍 Buscar OTs pendientes por parte
  const buscarOTs = async (numero_parte) => {
    const { data } = await supabase
      .from("items")
      .select("*")
      .eq("numero_parte", numero_parte)
      .in("estatus", ["Pendiente", "Comprada"]);

    return data || [];
  };

  // ➕ agregar a lista
  const agregar = async () => {
    if (!parte) return;

    // 🔁 duplicado
    const existente = lista.find(l => l.parte === parte);

    if (existente) {
      const extra = prompt("Ya escaneado. ¿Cuántas piezas más?");
      if (!extra) return;

      existente.cantidad += parseInt(extra);
      setLista([...lista]);
      return;
    }

    // 🔀 buscar OTs
    const ots = await buscarOTs(parte);

    let otSeleccionada = null;

    if (ots.length > 1) {
      const opciones = ots.map(o => o.ot).join(", ");
      otSeleccionada = prompt(
        `Varias OT para esta pieza: ${opciones}\nEscribe la OT`
      );
    } else if (ots.length === 1) {
      otSeleccionada = ots[0].ot;
    }

    setLista([
      ...lista,
      {
        parte,
        cantidad,
        ot: otSeleccionada,
      },
    ]);

    setParte("");
    setCantidad(1);
  };

  // ✅ confirmar recepción
  const confirmar = async () => {
    const ok = window.confirm("¿Confirmar recepción?");
    if (!ok) return;

    for (let item of lista) {
      const { data } = await supabase
        .from("items")
        .select("*")
        .eq("numero_parte", item.parte)
        .eq("ot", item.ot)
        .in("estatus", ["Pendiente", "Comprada"]);

      let restantes = item.cantidad;

      for (let r of data) {
        if (restantes <= 0) break;

        await supabase
          .from("items")
          .update({ estatus: "Recibida" })
          .eq("id", r.id);

        restantes--;
      }

      // 📦 sobrante → stock
      if (restantes > 0) {
        await supabase.from("stock").insert([
          {
            numero_parte: item.parte,
            cantidad: restantes,
          },
        ]);
      }
    }

    alert("Recepción completada");
    setLista([]);
  };

  return (
    <div>
      <h2>Recepción Masiva</h2>

      {/* INPUT */}
      <input
        placeholder="Número de parte"
        value={parte}
        onChange={(e) => setParte(e.target.value)}
      />

      <input
        type="number"
        value={cantidad}
        onChange={(e) => setCantidad(parseInt(e.target.value))}
      />

      <button onClick={agregar}>Agregar</button>

      <hr />

      {/* TABLA */}
      <table border="1">
        <thead>
          <tr>
            <th>Parte</th>
            <th>Cantidad</th>
            <th>OT</th>
          </tr>
        </thead>

        <tbody>
          {lista.map((l, i) => (
            <tr key={i}>
              <td>{l.parte}</td>
              <td>{l.cantidad}</td>
              <td>{l.ot}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={confirmar}>Confirmar recepción</button>
    </div>
  );
}