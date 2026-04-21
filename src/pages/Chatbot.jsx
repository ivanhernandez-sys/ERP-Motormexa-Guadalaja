// src/pages/Chatbot.jsx
import { useState, useRef, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { calcularETA, formatFecha, HORARIOS_CORTE } from "../utils/catalogos";
import { LABEL_ROL, NOMBRES_SUCURSAL } from "../components/Layout";

// ─────────────────────────────────────────────────────────────────────────────
// DETECCIÓN DE INTENCIÓN
// ─────────────────────────────────────────────────────────────────────────────
function detectarIntencion(texto) {
  const t = texto.toLowerCase().trim();

  // Acciones directas — ventanilla
  const matchEntregar = t.match(/entregar?\s+(?:ot\s*[:#]?\s*)?(\w+)/i);
  if (matchEntregar) return { tipo: "entregar_ot", ot: matchEntregar[1].toUpperCase() };

  // Consultas de OT
  const matchOT = t.match(/\bot\s*[:#]?\s*(\w+)/i) || t.match(/orden\s*[:#]?\s*(\w+)/i);
  if (matchOT) return { tipo: "consulta_ot", ot: matchOT[1].toUpperCase() };

  // Buscar por número de parte
  const matchParte = t.match(/parte\s*[:#]?\s*(\w+)/i) || t.match(/numero\s*[:#]?\s*(\w+)/i);
  if (matchParte) return { tipo: "buscar_parte", numero_parte: matchParte[1].toUpperCase() };

  // Consultas inteligentes
  if (/más.*antigua|antiguas.*sin.completar|sin completar/i.test(t)) return { tipo: "ot_mas_antigua" };
  if (/(\d+)\s*días?\s*sin\s*mover|sin\s*mover.*(\d+)\s*días?/i.test(t)) {
    const dias = parseInt(t.match(/(\d+)/)?.[1] || 5);
    return { tipo: "sin_movimiento", dias };
  }
  if (/retraso|retrasad|demorad/i.test(t)) return { tipo: "sin_movimiento", dias: 3 };
  if (/semana|esta semana|últimos.7/i.test(t) && /compra|compr/i.test(t)) return { tipo: "compras_semana" };
  if (/semana|esta semana|últimos.7/i.test(t)) return { tipo: "resumen_semana" };
  if (/pendientes.*aprobaci|cotizaci.*pendiente|folios.*pendiente/i.test(t)) return { tipo: "cotizaciones_pendientes" };
  if (/cuánto|cuanto|cómo voy|como voy|mi.avance|mis.números/i.test(t)) return { tipo: "mi_avance" };
  if (/falta.*ot|ot.*falta|qué falta|que falta/i.test(t)) {
    const matchF = t.match(/ot\s*[:#]?\s*(\w+)/i);
    if (matchF) return { tipo: "falta_ot", ot: matchF[1].toUpperCase() };
  }

  // Por estatus
  if (/pendiente/i.test(t)) return { tipo: "listar_estatus", estatus: "Pendiente" };
  if (/comprada/i.test(t)) return { tipo: "listar_estatus", estatus: "Comprada" };
  if (/recibida/i.test(t)) return { tipo: "listar_estatus", estatus: "Recibida" };
  if (/entregada/i.test(t)) return { tipo: "listar_estatus", estatus: "Entregada" };
  if (/incorrecta/i.test(t)) return { tipo: "listar_estatus", estatus: "Incorrecta" };
  if (/no.comprada/i.test(t)) return { tipo: "listar_estatus", estatus: "No comprada" };
  if (/vencida/i.test(t)) return { tipo: "listar_estatus", estatus: "Vencida" };

  // Resúmenes y dashboards
  if (/resumen|kpi|estad[ií]stica|cu[áa]nto|total|hoy|dashboard/i.test(t)) return { tipo: "resumen" };
  if (/stock|pedido|solicitud/i.test(t)) return { tipo: "stock" };
  if (/alerta|urgente/i.test(t)) return { tipo: "alertas" };
  if (/eta|tiempo|llegada|cu[áa]ndo.llega/i.test(t)) return { tipo: "eta_info" };
  if (/corte|hora.corte/i.test(t)) return { tipo: "horarios_corte" };
  if (/stellantis/i.test(t)) return { tipo: "por_fabricante", fabricante: "Stellantis" };
  if (/mitsubishi/i.test(t)) return { tipo: "por_fabricante", fabricante: "Mitsubishi" };
  if (/peugeot/i.test(t)) return { tipo: "por_fabricante", fabricante: "Peugeot" };
  if (/ayuda|qu[eé].puedes|help|comandos/i.test(t)) return { tipo: "ayuda" };

  return { tipo: "desconocido" };
}

// ─────────────────────────────────────────────────────────────────────────────
// EJECUTOR DE INTENCIONES
// ─────────────────────────────────────────────────────────────────────────────
async function ejecutar(intencion, user) {
  const esRestringidoPorAsesor =
    user?.rol === "coordinador" || user?.rol === "ventas" || user?.rol === "asesor_op";
  const esRestringidoPorSucursal =
    user?.rol === "ventanilla" || user?.rol === "gerente_sucursal";
  const esVentanilla = user?.rol === "ventanilla";

  const aplicarFiltros = (q) => {
    if (esRestringidoPorAsesor) q = q.eq("asesor_id", user.id);
    if (esRestringidoPorSucursal) q = q.eq("sucursal_id", user.sucursal_id);
    return q;
  };

  switch (intencion.tipo) {

    // ── CONSULTA OT ──────────────────────────────────────────────────────────
    case "consulta_ot": {
      let q = supabase.from("items").select("*")
        .or(`ot.eq.${intencion.ot},folio_cotizacion.eq.${intencion.ot}`)
        .order("created_at");
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0)
        return `❌ No encontré refacciones para **${intencion.ot}**.`;
      const entregadas = data.filter(r => r.estatus === "Entregada").length;
      const estatusOT = entregadas === data.length ? "✅ Completa"
        : entregadas > 0 ? "🔄 Parcial" : "🟡 Pendiente";
      return `📋 OT **${intencion.ot}** — ${estatusOT} (${entregadas}/${data.length})\n\n` +
        data.map(r =>
          `• ${r.descripcion || r.numero_parte} [${r.ubicacion}] → **${r.estatus}**` +
          (r.eta ? `\n  ETA: ${formatFecha(r.eta)}` : "")
        ).join("\n");
    }

    // ── QUÉ FALTA EN UNA OT ──────────────────────────────────────────────────
    case "falta_ot": {
      let q = supabase.from("items").select("*")
        .or(`ot.eq.${intencion.ot},folio_cotizacion.eq.${intencion.ot}`);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0)
        return `❌ No encontré la OT **${intencion.ot}**.`;
      const pendientes = data.filter(r => r.estatus !== "Entregada");
      if (pendientes.length === 0)
        return `✅ La OT **${intencion.ot}** está completamente entregada.`;
      return `🔍 OT **${intencion.ot}** — faltan **${pendientes.length}** piezas:\n\n` +
        pendientes.map(r =>
          `• ${r.descripcion || r.numero_parte} [${r.ubicacion}] → **${r.estatus}**` +
          (r.eta ? ` · ETA ${formatFecha(r.eta)}` : "")
        ).join("\n");
    }

    // ── ACCIÓN DIRECTA: ENTREGAR OT (solo ventanilla) ─────────────────────────
    case "entregar_ot": {
      if (!esVentanilla && user?.rol !== "admin") {
        return `⛔ Solo usuarios de **Ventanilla** pueden marcar entregas desde el chat.`;
      }
      const { data } = await supabase.from("items").select("id, descripcion, estatus, numero_parte")
        .eq("ot", intencion.ot)
        .eq("sucursal_id", user.sucursal_id)
        .eq("estatus", "Recibida");
      if (!data || data.length === 0)
        return `❌ No hay piezas en estatus **Recibida** para OT **${intencion.ot}**.\n\nSolo se pueden entregar piezas que ya fueron recibidas en almacén.`;
      const ids = data.map(r => r.id);
      const { error } = await supabase.from("items")
        .update({ estatus: "Entregada" })
        .in("id", ids);
      if (error) return `❌ Error al actualizar: ${error.message}`;
      return `✅ **${ids.length} pieza(s)** de OT **${intencion.ot}** marcadas como **Entregadas**:\n\n` +
        data.map(r => `• ${r.descripcion || r.numero_parte}`).join("\n");
    }

    // ── OT MÁS ANTIGUA SIN COMPLETAR ─────────────────────────────────────────
    case "ot_mas_antigua": {
      let q = supabase.from("items").select("ot, created_at, estatus")
        .neq("estatus", "Entregada")
        .order("created_at", { ascending: true })
        .limit(50);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0) return "✅ No tienes OTs pendientes.";
      const otMasAntigua = data[0];
      const dias = Math.floor((Date.now() - new Date(otMasAntigua.created_at)) / 86400000);
      return `⏳ Tu OT más antigua sin completar es **${otMasAntigua.ot}**, con **${dias} días** desde su creación.`;
    }

    // ── OTS SIN MOVIMIENTO ────────────────────────────────────────────────────
    case "sin_movimiento": {
      const fechaLimite = new Date(Date.now() - intencion.dias * 86400000).toISOString();
      let q = supabase.from("items").select("ot, descripcion, created_at, fabricante, estatus")
        .eq("estatus", "Pendiente")
        .lt("created_at", fechaLimite)
        .order("created_at")
        .limit(15);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0)
        return `✅ No hay piezas sin moverse por más de **${intencion.dias} días**.`;
      return `🚨 **Piezas sin movimiento > ${intencion.dias} días** (${data.length})\n\n` +
        data.map(r => {
          const dias = Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
          return `• OT ${r.ot} — ${r.descripcion?.substring(0, 35) || "sin desc."} — **${dias}d** [${r.fabricante}]`;
        }).join("\n");
    }

    // ── COMPRAS ESTA SEMANA ───────────────────────────────────────────────────
    case "compras_semana": {
      const hace7 = new Date(Date.now() - 7 * 86400000).toISOString();
      let q = supabase.from("items").select("ot, descripcion, estatus, created_at")
        .eq("estatus", "Comprada")
        .gte("created_at", hace7);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0) return "📦 No hay piezas compradas esta semana.";
      return `🛒 **Piezas compradas esta semana: ${data.length}**\n\n` +
        data.slice(0, 10).map(r => `• OT ${r.ot} — ${r.descripcion?.substring(0, 40) || "sin desc."}`).join("\n") +
        (data.length > 10 ? `\n...y ${data.length - 10} más.` : "");
    }

    // ── RESUMEN SEMANA ────────────────────────────────────────────────────────
    case "resumen_semana": {
      const hace7 = new Date(Date.now() - 7 * 86400000).toISOString();
      let q = supabase.from("items").select("estatus").gte("created_at", hace7);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data) return "No pude obtener el resumen semanal.";
      const c = (e) => data.filter(r => r.estatus === e).length;
      return `📊 **Resumen últimos 7 días**\n\n🟡 Pendientes: **${c("Pendiente")}**\n🔵 Compradas: **${c("Comprada")}**\n🟢 Recibidas: **${c("Recibida")}**\n✅ Entregadas: **${c("Entregada")}**\n\nTotal: **${data.length}** ítems`;
    }

    // ── COTIZACIONES PENDIENTES ───────────────────────────────────────────────
    case "cotizaciones_pendientes": {
      let q = supabase.from("items").select("folio_cotizacion, cliente_aseguradora, created_at, marca, modelo")
        .eq("es_cotizacion", true)
        .eq("estatus", "Cotizada");
      if (esRestringidoPorAsesor) q = q.eq("asesor_id", user.id);
      const { data } = await q;
      if (!data || data.length === 0) return "✅ No tienes cotizaciones pendientes de aprobación.";
      const folios = {};
      data.forEach(r => {
        const f = r.folio_cotizacion || "SIN-FOLIO";
        if (!folios[f]) folios[f] = r;
      });
      const lista = Object.entries(folios);
      return `📋 **Cotizaciones pendientes de aprobación: ${lista.length}**\n\n` +
        lista.map(([folio, r]) => {
          const dias = Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
          return `• **${folio}** — ${r.cliente_aseguradora || "sin cliente"} · ${r.marca} ${r.modelo} · ${dias}d`;
        }).join("\n");
    }

    // ── MI AVANCE PERSONAL ────────────────────────────────────────────────────
    case "mi_avance": {
      const { data } = await supabase.from("items").select("estatus")
        .eq("asesor_id", user.id);
      if (!data) return "No pude obtener tu información.";
      const total = data.length;
      const ent = data.filter(r => r.estatus === "Entregada").length;
      const pct = total ? ((ent / total) * 100).toFixed(1) : 0;
      const pend = data.filter(r => r.estatus === "Pendiente").length;
      const comp = data.filter(r => r.estatus === "Comprada").length;
      const rec = data.filter(r => r.estatus === "Recibida").length;
      return `👤 **Tu avance, ${user.nombre}**\n\n✅ Entregadas: **${ent}** (${pct}%)\n🟢 Recibidas: **${rec}**\n🔵 Compradas: **${comp}**\n🟡 Pendientes: **${pend}**\n\nTotal histórico: **${total}** ítems`;
    }

    // ── LISTAR POR ESTATUS ────────────────────────────────────────────────────
    case "listar_estatus": {
      let q = supabase.from("items")
        .select("ot, descripcion, ubicacion, estatus, eta, created_at, fabricante")
        .eq("estatus", intencion.estatus)
        .order("created_at", { ascending: false })
        .limit(10);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0)
        return `✅ No hay refacciones con estatus **${intencion.estatus}** en este momento.`;
      const emojis = { Pendiente: "🟡", Comprada: "🔵", Recibida: "🟢", Entregada: "✅", Incorrecta: "🔴", "No comprada": "⚫", Vencida: "🟣" };
      return `${emojis[intencion.estatus] || "📦"} **${intencion.estatus}** — ${data.length} más recientes\n\n` +
        data.map(r => `• OT ${r.ot} — ${r.descripcion?.substring(0, 40) || "sin desc."} [${r.ubicacion}]${r.eta ? ` · ETA ${formatFecha(r.eta)}` : ""}`).join("\n");
    }

    // ── RESUMEN GENERAL ───────────────────────────────────────────────────────
    case "resumen": {
      let q = supabase.from("items").select("estatus, fabricante");
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data) return "No pude obtener el resumen.";
      const c = (e) => data.filter(r => r.estatus === e).length;
      const total = data.length;
      const ent = c("Entregada");
      const pct = total ? ((ent / total) * 100).toFixed(1) : 0;
      const fabCount = { Stellantis: 0, Mitsubishi: 0, Peugeot: 0 };
      data.forEach(r => { if (fabCount[r.fabricante] !== undefined) fabCount[r.fabricante]++; });
      return `📊 **Resumen actual**\n\n🟡 Pendientes: **${c("Pendiente")}**\n🔵 Compradas: **${c("Comprada")}**\n🟢 Recibidas: **${c("Recibida")}**\n✅ Entregadas: **${ent}**\n🔴 Incorrectas: **${c("Incorrecta")}**\n⚫ No compradas: **${c("No comprada")}**\n\nTotal: **${total}** | Cumplimiento: **${pct}%**\n\n**Por fabricante:**\n• Stellantis: ${fabCount.Stellantis}\n• Mitsubishi: ${fabCount.Mitsubishi}\n• Peugeot: ${fabCount.Peugeot}`;
    }

    // ── POR FABRICANTE ────────────────────────────────────────────────────────
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

    // ── HORARIOS DE CORTE ─────────────────────────────────────────────────────
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

    // ── ETA INFO ──────────────────────────────────────────────────────────────
    case "eta_info": {
      return `📦 **ETAs por ubicación:**\n\n• **MX** → 1 día hábil (llega mar/mié/vie/sáb)\n• **EUA** → 14 días hábiles (solo Stellantis)\n• **BO** → 45 días hábiles\n\nLos días de llegada de mercancía son: martes, miércoles, viernes y sábado.\n\nEjemplo: Si compras hoy ${new Date().toLocaleDateString("es-MX")}, una pieza MX llegaría el **${formatFecha(calcularETA("MX", "Stellantis"))}**.`;
    }

    // ── STOCK ─────────────────────────────────────────────────────────────────
    case "stock": {
      const { data } = await supabase.from("stock_pedidos").select("*").eq("estatus", "Pendiente").limit(10);
      if (!data || data.length === 0) return "📦 No hay pedidos de stock pendientes.";
      return `📦 **Stock pendiente** (${data.length})\n\n` +
        data.map(p => `• ${p.numero_parte} — cant: ${p.cantidad}`).join("\n");
    }

    // ── ALERTAS ───────────────────────────────────────────────────────────────
    case "alertas": {
      const hace3dias = new Date(Date.now() - 3 * 86400000).toISOString();
      let q = supabase.from("items").select("ot, descripcion, created_at, fabricante")
        .eq("estatus", "Pendiente").lt("created_at", hace3dias).order("created_at").limit(10);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0) return "✅ Sin alertas de retraso activas.";
      return `🚨 **Pendientes con más de 3 días** (${data.length})\n\n` +
        data.map(r => {
          const dias = Math.floor((Date.now() - new Date(r.created_at)) / 86400000);
          return `• OT ${r.ot} — ${r.descripcion?.substring(0, 35)} — **${dias} días** [${r.fabricante}]`;
        }).join("\n");
    }

    // ── BUSCAR PARTE ──────────────────────────────────────────────────────────
    case "buscar_parte": {
      let q = supabase.from("items").select("ot, estatus, descripcion, ubicacion")
        .ilike("numero_parte", `%${intencion.numero_parte}%`).limit(10);
      q = aplicarFiltros(q);
      const { data } = await q;
      if (!data || data.length === 0) return `❌ Sin resultados para **${intencion.numero_parte}**.`;
      return `🔍 **${intencion.numero_parte}**\n\n` +
        data.map(r => `• OT ${r.ot} — ${r.estatus} — ${r.descripcion || ""} [${r.ubicacion}]`).join("\n");
    }

    // ── AYUDA ─────────────────────────────────────────────────────────────────
    case "ayuda":
      return `🤖 **Comandos disponibles**\n\n**Consultas:**\n• **OT 12345** — ver refacciones de una OT\n• **¿Qué falta en OT 12345?** — piezas pendientes\n• **Pendientes / Compradas / Recibidas** — listar por estatus\n• **Stellantis / Mitsubishi / Peugeot** — pendientes por fabricante\n• **Resumen** — KPIs generales\n• **Resumen semana** — actividad últimos 7 días\n• **Alertas** — piezas con retraso\n• **OTs sin mover 5 días** — inactividad por días\n• **Mi OT más antigua** — la más rezagada\n• **Cotizaciones pendientes** — folios por aprobar\n• **Cómo voy** — tu avance personal\n• **Stock** — pedidos de stock\n• **ETA** — tiempos de entrega\n• **Corte** — horarios de corte\n• **Parte ABC123** — buscar por número de parte\n\n**Acciones (Ventanilla):**\n• **Entregar OT 12345** — marcar piezas recibidas como entregadas`;

    default:
      return `No entendí. Escribe **ayuda** para ver los comandos disponibles.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE MENSAJE BOT/USUARIO
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE MENSAJE CHAT INTERNO
// ─────────────────────────────────────────────────────────────────────────────
function MensajeChat({ msg, esPropio }) {
  return (
    <div style={{ display: "flex", justifyContent: esPropio ? "flex-end" : "flex-start", marginBottom: "10px" }}>
      <div style={{ maxWidth: "75%" }}>
        {!esPropio && (
          <div style={{ fontSize: "10px", color: "#6b7280", marginBottom: "3px", paddingLeft: "4px" }}>
            {msg.nombre_remitente} · {LABEL_ROL[msg.rol_remitente] || msg.rol_remitente} · {NOMBRES_SUCURSAL[msg.sucursal_remitente] || msg.sucursal_remitente}
          </div>
        )}
        <div style={{
          padding: "9px 13px",
          borderRadius: esPropio ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
          background: esPropio ? "#1d4ed8" : "#111827",
          color: "#e5e7eb",
          border: esPropio ? "none" : "1px solid #1f2937",
          fontSize: "13px", lineHeight: "1.6",
        }}>
          {msg.contenido}
        </div>
        <div style={{ fontSize: "10px", color: "#4b5563", marginTop: "3px", textAlign: esPropio ? "right" : "left", paddingLeft: "4px", paddingRight: "4px" }}>
          {new Date(msg.created_at).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAT INTERNO — SALA GENERAL
// ─────────────────────────────────────────────────────────────────────────────
function ChatInterno({ user }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const bottomRef = useRef(null);

  const cargar = async () => {
    const { data } = await supabase
      .from("mensajes_internos")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100);
    setMensajes(data || []);
    setCargando(false);
  };

  useEffect(() => {
    cargar();
    const channel = supabase.channel("chat-interno-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "mensajes_internos",
      }, (payload) => {
        setMensajes(prev => [...prev, payload.new]);
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const enviar = async () => {
    const contenido = texto.trim();
    if (!contenido || enviando) return;
    setEnviando(true);
    await supabase.from("mensajes_internos").insert([{
      usuario_id: user.id,
      nombre_remitente: user.nombre || user.email,
      rol_remitente: user.rol,
      sucursal_remitente: user.sucursal_id,
      contenido,
    }]);
    setTexto("");
    setEnviando(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", background: "#111827", borderBottom: "1px solid #1f2937" }}>
        <div style={{ color: "#e5e7eb", fontWeight: 600, fontSize: "13px" }}>💬 Chat General Motormexa</div>
        <div style={{ color: "#22c55e", fontSize: "10px" }}>● En vivo · Todos los usuarios</div>
      </div>

      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px", background: "#0f172a" }}>
        {cargando ? (
          <p style={{ color: "#9ca3af", textAlign: "center", padding: "40px" }}>Cargando mensajes...</p>
        ) : mensajes.length === 0 ? (
          <p style={{ color: "#4b5563", textAlign: "center", padding: "40px", fontSize: "13px" }}>
            Aún no hay mensajes. ¡Sé el primero en escribir!
          </p>
        ) : (
          mensajes.map(m => (
            <MensajeChat key={m.id} msg={m} esPropio={m.usuario_id === user.id} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: "flex", gap: "8px", padding: "10px 14px", background: "#111827", borderTop: "1px solid #1f2937" }}>
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); } }}
          placeholder="Escribe un mensaje... (Enter para enviar)"
          disabled={enviando}
          style={{ flex: 1, background: "#0f172a", border: "1px solid #1f2937", color: "#e5e7eb", padding: "9px 12px", borderRadius: "8px", fontSize: "13px", outline: "none" }}
        />
        <button
          onClick={enviar}
          disabled={enviando || !texto.trim()}
          style={{
            background: enviando || !texto.trim() ? "#1f2937" : "#2563eb",
            color: "#fff", border: "none", padding: "9px 16px", borderRadius: "8px",
            cursor: enviando || !texto.trim() ? "not-allowed" : "pointer", fontWeight: 700, fontSize: "13px",
          }}
        >
          {enviando ? "..." : "Enviar"}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function Chatbot() {
  const { user } = useAuth();
  const [tab, setTab] = useState("asistente"); // "asistente" | "chat"

  // ── Resumen de contexto al iniciar ──
  const [resumenInicio, setResumenInicio] = useState("");
  useEffect(() => {
    const generarResumen = async () => {
      if (!user) return;
      const esRestringido = user.rol === "coordinador" || user.rol === "ventas" || user.rol === "asesor_op";
      let q = supabase.from("items").select("estatus, created_at");
      if (esRestringido) q = q.eq("asesor_id", user.id);
      else if (user.rol === "ventanilla" || user.rol === "gerente_sucursal") q = q.eq("sucursal_id", user.sucursal_id);
      const { data } = await q;
      if (!data) return;
      const pend = data.filter(r => r.estatus === "Pendiente").length;
      const hace3 = new Date(Date.now() - 3 * 86400000).toISOString();
      const retrasadas = data.filter(r => r.estatus === "Pendiente" && r.created_at < hace3).length;

      let resumen = "";
      if (pend > 0) resumen += `Tienes **${pend}** pieza(s) pendiente(s)`;
      if (retrasadas > 0) resumen += ` — ⚠️ **${retrasadas}** con más de 3 días de retraso`;
      if (user.rol === "ventas") {
        const { data: cots } = await supabase.from("items").select("folio_cotizacion")
          .eq("asesor_id", user.id).eq("estatus", "Cotizada").eq("es_cotizacion", true);
        const folios = new Set((cots || []).map(r => r.folio_cotizacion)).size;
        if (folios > 0) resumen += `\n📋 **${folios}** cotización(es) esperando aprobación del cliente`;
      }
      setResumenInicio(resumen);
    };
    generarResumen();
  }, [user]);

  // ── Estado del asistente ──
  const saludoInicial = `¡Hola${user?.nombre ? `, ${user.nombre}` : ""}! 👋\n\n`;
  const contexto = `**${LABEL_ROL[user?.rol] || user?.rol}** · ${NOMBRES_SUCURSAL[user?.sucursal_id] || user?.sucursal_id || ""}`;

  const [mensajes, setMensajes] = useState([{
    id: 0, rol: "bot",
    texto: saludoInicial + contexto,
  }]);
  const [input, setInput] = useState("");
  const [procesando, setProcesando] = useState(false);
  const bottomRef = useRef(null);

  // Agregar resumen de contexto cuando esté listo
  useEffect(() => {
    if (!resumenInicio) return;
    setMensajes(prev => {
      if (prev.some(m => m.id === 999)) return prev;
      return [...prev, { id: 999, rol: "bot", texto: resumenInicio + "\n\nEscribe **ayuda** para ver todo lo que puedo hacer." }];
    });
  }, [resumenInicio]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

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

  const sugerencias = ["Resumen", "Pendientes", "Corte", "Alertas", "Cómo voy", "Ayuda"];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)", maxWidth: "700px", margin: "0 auto" }}>

      {/* ── Tabs ── */}
      <div style={{ display: "flex", background: "#020617", borderBottom: "1px solid #1f2937" }}>
        {[
          { id: "asistente", label: "🤖 Asistente" },
          { id: "chat",      label: "💬 Chat interno" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "12px", border: "none", cursor: "pointer",
            background: tab === t.id ? "#111827" : "transparent",
            color: tab === t.id ? "#e5e7eb" : "#6b7280",
            fontWeight: tab === t.id ? 700 : 400,
            fontSize: "13px",
            borderBottom: tab === t.id ? "2px solid #2563eb" : "2px solid transparent",
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PANEL ASISTENTE ── */}
      {tab === "asistente" && (
        <>
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

          <div style={{ display: "flex", gap: "10px", padding: "10px 14px", background: "#111827", borderTop: "1px solid #1f2937" }}>
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
        </>
      )}

      {/* ── PANEL CHAT INTERNO ── */}
      {tab === "chat" && (
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <ChatInterno user={user} />
        </div>
      )}
    </div>
  );
}
