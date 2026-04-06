import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import TablaERP from "../components/TablaERP";
import Filtros from "../components/Filtros";
import * as XLSX from "xlsx";

export default function Almacen() {
  const [data, setData] = useState([]);
  const [seleccionados, setSeleccionados] = useState([]);
  const [filtros, setFiltros] = useState({});
  const [pagina, setPagina] = useState(0);
  const limite = 20;

  const cargar = async () => {
    let query = supabase.from("items").select("*");

    if (filtros.estatus)
      query = query.eq("estatus", filtros.estatus);

    if (filtros.ot)
      query = query.ilike("ot", `%${filtros.ot}%`);

    if (filtros.numero_parte)
      query = query.ilike("numero_parte", `%${filtros.numero_parte}%`);

    const { data } = await query
      .range(pagina * limite, (pagina + 1) * limite - 1)
      .order("created_at", { ascending: false });

    setData(data || []);
  };

  useEffect(() => {
    cargar();
  }, [filtros, pagina]);

  const toggle = (id) => {
    setSeleccionados((prev) =>
      prev.includes(id)
        ? prev.filter((i) => i !== id)
        : [...prev, id]
    );
  };

  const recibirMasivo = async () => {
    if (!window.confirm("¿Recibir seleccionados?")) return;

    await supabase
      .from("items")
      .update({ estatus: "Recibida" })
      .in("id", seleccionados);

    setSeleccionados([]);
    cargar();
  };

  // 📊 EXPORTAR EXCEL
  const exportar = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Almacen");
    XLSX.writeFile(wb, "almacen.xlsx");
  };

  return (
    <div>
      <h2>Almacén</h2>

      <Filtros onFiltrar={setFiltros} />

      <button onClick={recibirMasivo}>Recibir seleccionados</button>
      <button onClick={exportar}>Exportar Excel</button>

      <TablaERP
        data={data}
        seleccionados={seleccionados}
        toggle={toggle}
      />

      <div style={{ marginTop: "10px" }}>
        <button onClick={() => setPagina(pagina - 1)}>⬅</button>
        <span> Página {pagina + 1} </span>
        <button onClick={() => setPagina(pagina + 1)}>➡</button>
      </div>
    </div>
  );
}