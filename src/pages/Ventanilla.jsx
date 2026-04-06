import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { Link } from "react-router-dom";
import Filtros from "../components/Filtros";

export default function Ventanilla() {
  const [data, setData] = useState([]);
  const [filtros, setFiltros] = useState({});

  const cargar = async () => {
    let query = supabase.from("items").select("*");

    if (filtros.estatus)
      query = query.eq("estatus", filtros.estatus);

    if (filtros.ot)
      query = query.ilike("ot", `%${filtros.ot}%`);

    const { data } = await query;

    setData(data || []);
  };

  useEffect(() => {
    cargar();
  }, [filtros]);

  const agrupar = () => {
    const map = {};

    data.forEach((r) => {
      if (!map[r.ot]) map[r.ot] = [];
      map[r.ot].push(r.estatus);
    });

    return Object.entries(map).map(([ot, estatuses]) => ({
      ot,
      total: estatuses.length,
      entregadas: estatuses.filter(e => e === "Entregada").length
    }));
  };

  const ots = agrupar();

  return (
    <div>
      <h2>Ventanilla</h2>

      <Filtros onFiltrar={setFiltros} />

      {ots.map(o => (
        <div key={o.ot}>
          <b>{o.ot}</b> → {o.entregadas}/{o.total}
          <Link to={`/ventanilla/${o.ot}`}> Abrir</Link>
        </div>
      ))}
    </div>
  );
}