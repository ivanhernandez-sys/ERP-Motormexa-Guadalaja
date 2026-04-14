// src/pages/Chatbot.jsx — Actualizado: coordinador (antes "asesor"), nuevo asesor_op
import { useState, useRef, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { calcularETA, formatFecha, HORARIOS_CORTE } from "../utils/catalogos";

function detectarIntencion(texto) {
  const t = texto.toLowerCase().trim();

  const matchOT = t.match(/\bot\s*[:#]?\s*(\w+)/i) || t.match(/orden\s*[:#]?\s*(\w+)/i);
  if (matchOT) return { tipo: "consulta_ot", ot: matchOT[1].toUpperCase() };

  if (/pendiente/i.test(t)) return { tipo: "listar_estatus", estatus: "Pendiente" };
  if (/comprada/i.test(t)) return { tipo: "listar_estatus", estatus: "Comprada" };
  if (/recibida/i.test(t)) return { tipo: "listar_estatus", estatus: "Recibida" };
  if (/entregada/i.test(t)) return { tipo: "listar_estatus", estatus: "Entregada" };
  if (/incorrecta/i.test(t)) return { tipo: "listar_estatus", estatus: "Incorrecta" };
  if (/no.comprada/i.test(t)) return { tipo: "listar_estatus", estatus: "No comprada" };
  if (/vencida/i.test(t)) return { tipo: "listar_estatus", estatus: "Vencida" };

  if (/resumen|kpi|estad[ií]stica|cu[áa]nto|total|hoy|dashboard/i.test(t)) return { tipo: "resumen" };
  if (/stock|pedido|solicitud/i.test(t)) return { tipo: "stock" };
  if (/alerta|urgente|retrasad/i.test(t)) return { tipo: "alertas" };
  if (/eta|tiempo|llegada|cu[áa]ndo.llega/i.test(t)) return { tipo: "eta_info" };
  if (/corte|hora.corte|stellantis|mitsubishi|peugeot/i.test(t)) return { tipo: "horarios_corte" };
  if (/stellantis/i.test(t)) return { tipo: "por_fabricante", fabricante: "Stellantis" };
  if (/mitsubishi/i.test(t)) return { tipo: "por_fabricante", fabricante: "Mitsubishi" };
  if (/peugeot/i.test(t)) return { tipo: "por_fabricante", fabricante: "Peugeot" };

  const matchParte = t.match(/parte\s*[:#]?\s*(\w+)/i) || t.match(/numero\s*[:#]?\s*(\w+)/i);
  if (matchParte) return { tipo: "buscar_parte", numero_parte: matchParte[1].toUpperCase() };

  if (/ayuda|qu[eé].puedes|help|comandos/i.test(t)) return { tipo: "ayuda" };

  return { tipo: "desconocido" };
}

async function ejecutar(intencion, user) {
  // 🔐 Roles con restricción de alcance
  // coordinador (antes "asesor") y asesor_op → solo sus órdenes
  const esRestringidoPorAsesor =
    user?.rol === "coordinador" ||
    user?.rol === "ventas"      ||
    user?.rol === "asesor_op";
  const esRestringidoPorSucursal = user?.rol === "ventanilla" || user?.rol === "gerente_sucursal";

  switch (intencion.tipo) {

    case "consulta_ot": {
      let q = supabase.from("items").select("*")
        .or(`ot.eq.${intencion.ot},folio_cotizacion.eq.${intencion.ot}`)
        .order("created_at");

      // asesor_op y coordinador solo ven sus órdenes
      if (esRestringidoPorAsesor) q = q.eq("asesor_id", user.id);
      if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);

      const { data } = await q;
      if (!data || data.length === 0)
        return `❌ No encontré refacciones para **${intencion.ot}**.`;

      const entregadas = data.filter(r => r.estatus === "Entregada").length;
      const estatusOT = entregadas === data.length ? "✅ Completa" : entregadas > 0 ? "🔄 Parcial" : "🟡 Pendiente";

      return `📋 OT **${intencion.ot}** — ${estatusOT} (${entregadas}/${data.length})\n\n` +
        data.map(r =>
          `• ${r.descripcion || r.numero_parte} [${r.ubicacion}] → **${r.estatus}**` +
          (r.eta ? `\n  ETA: ${formatFecha(r.eta)}` : "")
        ).join("\n");
    }

    case "listar_estatus": {
      let q = supabase.from("items")
        .select("ot, descripcion, ubicacion, estatus, eta, created_at, fabricante")
        .eq("estatus", intencion.estatus)
        .order("created_at", { ascending: false })
        .limit(10);

      if (esRestringidoPorAsesor)   q = q.eq("asesor_id", user.id);
      if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);

      const { data } = await q;
      if (!data || data.length === 0)
        return `✅ No hay refacciones con estatus **${intencion.estatus}** en este momento.`;

      const emojis = { Pendiente: "🟡", Comprada: "🔵", Recibida: "🟢", Entregada: "✅", Incorrecta: "🔴", "No comprada": "⚫", Vencida: "🟣" };
      return `${emojis[intencion.estatus] || "📦"} **${intencion.estatus}** — ${data.length} más recientes\n\n` +
        data.map(r => `• OT ${r.ot} — ${r.descripcion?.substring(0, 40) || "sin desc."} [${r.ubicacion}]${r.eta ? ` · ETA ${formatFecha(r.eta)}` : ""}`).join("\n");
    }

    case "resumen": {
      let q = supabase.from("items").select("estatus, fabricante");
      if (esRestringidoPorAsesor)   q = q.eq("asesor_id", user.id);
      if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);

      const { data } = await q;
      if (!data) return "No pude obtener el resumen.";
      const c = (e) => data.filter(r => r.estatus === e).length;
      const total = data.length;
      const ent = c("Entregada");
      const pct = total ? ((ent / total) * 100).toFixed(1) : 0;

      const fabCount = { Stellantis: 0, Mitsubishi: 0, Peugeot: 0 };
      data.forEach(r => { if (fabCount[r.fabricante] !== undefined) fabCount[r.fabricante]++; });

      return `📊 **Resumen actual**

🟡 Pendientes: **${c("Pendiente")}**
🔵 Compradas: **${c("Comprada")}**
🟢 Recibidas: **${c("Recibida")}**
✅ Entregadas: **${ent}**
🔴 Incorrectas: **${c("Incorrecta")}**
⚫ No compradas: **${c("No comprada")}**

Total: **${total}** | Cumplimiento: **${pct}%**

**Por fabricante:**
• Stellantis: ${fabCount.Stellantis}
• Mitsubishi: ${fabCount.Mitsubishi}
• Peugeot: ${fabCount.Peugeot}`;
    }

    case "por_fabricante": {
      const { data } = await supabase.from("items").select("ot, estatus, descripcion, ubicacion")
        .eq("fabricante", intencion.fabricante)
        .in("estatus", ["Pendiente", "Comprada"])
        .limit(15);
      if (!data || data.length === 0)
        return `✅ No hay piezas pendientes de **${intencion.fabricante}**.`;
      return `🏭 **${intencion.fabricante}** — pendientes/compradas\n\n` +
        data.map(r => `• OT ${r.ot} — ${r.descripcion?.substring(0, 40)} [${r.ubicacion}] → ${r.estatus}`).join("\n");
    }

    case "horarios_corte": {
      const ahora = new Date();
      const horaActual = ahora.getHours() * 60 + ahora.getMinutes();
      const lineas = Object.entries(HORARIOS_CORTE).map(([fab, hora]) => {
        const [h, m] = hora.split(":").map(Number);
        const minCorte = h * 60 + m;
        const diff = minCorte - horaActual;
        const estado = diff > 0 ? `faltan ${diff} min` : "⚠️ PASADO";
        return `• **${fab}**: ${hora} (${estado})`;
      });
      return `⏰ **Horarios de corte hoy**\n\n${lineas.join("\n")}`;
    }

    case "eta_info": {
      return `📦 **ETAs por ubicación:**

• **MX** → 1 día hábil (llega mar/mié/vie/sáb)
• **EUA** → 14 días hábiles (solo Stellantis)
• **BO** → 45 días hábiles

Los días de llegada de mercancía son: martes, miércoles, viernes y sábado.

Ejemplo: Si compras hoy ${new Date().toLocaleDateString("es-MX")}, una pieza MX llegaría el **${formatFecha(calcularETA("MX", "Stellantis"))}**.`;
    }

    case "stock": {
      const { data } = await supabase.from("stock_pedidos").select("*").eq("estatus", "Pendiente").limit(10);
      if (!data || data.length === 0) return "📦 No hay pedidos de stock pendientes.";
      return `📦 **Stock pendiente** (${data.length})\n\n` +
        data.map(p => `• ${p.numero_parte} — cant: ${p.cantidad}`).join("\n");
    }

    case "alertas": {
      const hace3dias = new Date(Date.now() - 3 * 86400000).toISOString();
      let q = supabase.from("items").select("ot, descripcion, created_at, fabricante")
        .eq("estatus", "Pendiente").lt("created_at", hace3dias).order("created_at").limit(10);
      if (esRestringidoPorAsesor)   q = q.eq("asesor_id", user.id);
      if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);
      const { data } = await q;
      if (!data || data.length === 0) return "✅ Sin alertas de retraso activas.";
      return `🚨 **Pendientes con más de 3 días** (${data.length})\n\n` +
        data.map(r => {
          const dias = Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
          return `• OT ${r.ot} — ${r.descripcion?.substring(0, 35)} — **${dias} días** [${r.fabricante}]`;
        }).join("\n");
    }

    case "buscar_parte": {
      let q = supabase.from("items").select("ot, estatus, descripcion, ubicacion")
        .ilike("numero_parte", `%${intencion.numero_parte}%`).limit(10);
      if (esRestringidoPorAsesor)   q = q.eq("asesor_id", user.id);
      if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);
      const { data } = await q;
      if (!data || data.length === 0) return `❌ Sin resultados para **${intencion.numero_parte}**.`;
      return `🔍 **${intencion.numero_parte}**\n\n` +
        data.map(r => `• OT ${r.ot} — ${r.estatus} — ${r.descripcion || ""} [${r.ubicacion}]`).join("\n");
    }

    case "ayuda":
      return `🤖 **Comandos disponibles**

• **OT 12345** — ver refacciones de una OT
• **Pendientes / Compradas / Recibidas** — listar por estatus
• **Stellantis / Mitsubishi / Peugeot** — ver pendientes por fabricante
• **Resumen** — KPIs generales
• **Alertas** — piezas con retraso
• **Stock** — pedidos de stock
• **ETA** — tiempos de entrega por ubicación
• **Corte** — horarios de corte de pedidos
• **Parte ABC123** — buscar por número de parte`;

    default:
      return `No entendí. Escribe **ayuda** para ver los comandos disponibles.`;
  }
}

function Mensaje({ msg }) {
  const esBot = msg.rol === "bot";
  const renderTexto = (texto) =>
    texto.split("\n").map((linea, i) => {
      const partes = linea.split(/\*\*(.+?)\*\*/g);
      return (
        <div key={i} style={{ minHeight: "4px" }}>
          {partes.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
        </div>
      );
    });

  return (
    <div style={{ display: "flex", justifyContent: esBot ? "flex-start" : "flex-end", marginBottom: "12px" }}>
      {esBot && (
        <div style={{
          width: "30px", height: "30px", borderRadius: "50%", background: "#2563eb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "15px", marginRight: "8px", flexShrink: 0,
        }}>🤖</div>
      )}
      <div style={{
        maxWidth: "78%", padding: "10px 14px",
        borderRadius: esBot ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
        background: esBot ? "#111827" : "#1d4ed8",
        color: "#e5e7eb", border: esBot ? "1px solid #1f2937" : "none",
        fontSize: "13px", lineHeight: "1.7",
      }}>
        {msg.cargando ? <span style={{ color: "#9ca3af" }}>Consultando...</span> : renderTexto(msg.texto)}
      </div>
    </div>
  );
}

export default function Chatbot() {
  const { user } = useAuth();
  const [mensajes, setMensajes] = useState([{
    id: 0, rol: "bot",
    texto: `¡Hola${user?.nombre ? `, ${user.nombre}` : ""}! 👋\n\nSoy el asistente de Motormexa. Escribe **ayuda** o prueba:\n• "OT 1234"\n• "Pendientes"\n• "Stellantis"\n• "Corte"`,
  }]);
  const [input, setInput] = useState("");
  const [procesando, setProcesando] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensajes]);

  const enviar = async () => {
    const texto = input.trim();
    if (!texto || procesando) return;
    const idU = Date.now(), idB = idU + 1;
    setMensajes(prev => [...prev,
      { id: idU, rol: "usuario", texto },
      { id: idB, rol: "bot", texto: "", cargando: true },
    ]);
    setInput(""); setProcesando(true);
    const respuesta = await ejecutar(detectarIntencion(texto), user);
    setMensajes(prev => prev.map(m => m.id === idB ? { ...m, texto: respuesta, cargando: false } : m));
    setProcesando(false);
  };

  const sugerencias = ["Resumen", "Pendientes", "Corte", "Alertas", "ETA", "Ayuda"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ padding: "14px 20px", background: "#111827", borderRadius: "12px 12px 0 0", borderBottom: "1px solid #1f2937", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ fontSize: "22px" }}>🤖</div>
        <div>
          <div style={{ color: "#e5e7eb", fontWeight: 600 }}>Asistente Motormexa</div>
          <div style={{ color: "#22c55e", fontSize: "11px" }}>● En línea · Supabase conectado</div>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px", background: "#0f172a", display: "flex", flexDirection: "column" }}>
        {mensajes.map(m => <Mensaje key={m.id} msg={m} />)}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "6px", padding: "6px 14px", background: "#0f172a", flexWrap: "wrap" }}>
        {sugerencias.map(s => (
          <button key={s} onClick={() => setInput(s)} style={{
            background: "#111827", border: "1px solid #1f2937", color: "#9ca3af",
            padding: "3px 10px", borderRadius: "20px", fontSize: "11px", cursor: "pointer",
          }}>{s}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", padding: "10px 14px", background: "#111827", borderRadius: "0 0 12px 12px", borderTop: "1px solid #1f2937" }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escribe tu consulta... (Enter para enviar)"
          disabled={procesando}
          style={{ flex: 1, background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", padding: "9px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}
        />
        <button onClick={enviar} disabled={procesando || !input.trim()} style={{
          background: procesando || !input.trim() ? "#1f2937" : "#2563eb",
          color: "#fff", border: "none", padding: "9px 18px", borderRadius: "8px",
          cursor: procesando || !input.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px",
        }}>
          {procesando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}
