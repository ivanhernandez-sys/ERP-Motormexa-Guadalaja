// src/pages/Usuarios.jsx

import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";
import { SUCURSALES } from "../components/Layout";

// ─────────────────────────────────────────────────────────────────────────────
// Descripción de cada rol (se muestra debajo del select)
// ─────────────────────────────────────────────────────────────────────────────
const DESCRIPCION_ROL = {
  coordinador: {
    color: "#93c5fd",
    bg: "#1e3a5f",
    border: "#2563eb",
    icono: "📦",
    texto: "Captura órdenes de taller, gestiona su panel y solicita stock. Exclusivo para talleres.",
  },
  ventas: {
    color: "#fcd34d",
    bg: "#2d2008",
    border: "#d97706",
    icono: "🏪",
    texto: "Captura cotizaciones y órdenes para Mayoreo/Menudeo. Exclusivo para esa sucursal.",
  },
  asesor_op: {
    color: "#86efac",
    bg: "#1e2f1e",
    border: "#166534",
    icono: "🔒",
    texto: "Solo consulta — Ve únicamente sus órdenes asignadas, sin poder modificar nada.",
  },
  comprador: {
    color: "#c4b5fd",
    bg: "#1e1b4b",
    border: "#7c3aed",
    icono: "🛒",
    texto: "Accede al módulo de Compras para gestionar pedidos pendientes.",
  },
  almacen: {
    color: "#6ee7b7",
    bg: "#0f2b21",
    border: "#059669",
    icono: "🏭",
    texto: "Gestiona recepción de piezas, stock y pedidos en almacén.",
  },
  ventanilla: {
    color: "#fbcfe8",
    bg: "#2d0f1e",
    border: "#db2777",
    icono: "🪟",
    texto: "Valida piezas entregadas al cliente final desde la ventanilla.",
  },
  gerente_sucursal: {
    color: "#fda4af",
    bg: "#2d0f14",
    border: "#e11d48",
    icono: "📊",
    texto: "Visión completa de su sucursal: panel, almacén, ventanilla y cotizaciones.",
  },
  gerente: {
    color: "#f9a8d4",
    bg: "#3b0764",
    border: "#9333ea",
    icono: "📈",
    texto: "Acceso a todos los módulos operativos. No puede administrar usuarios.",
  },
  admin: {
    color: "#fef08a",
    bg: "#1c1400",
    border: "#ca8a04",
    icono: "⚙️",
    texto: "Acceso total al sistema, incluyendo creación y administración de usuarios.",
  },
};

export default function Usuarios() {
  const { user } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre]     = useState("");
  const [rol, setRol]           = useState("coordinador");
  const [sucursal, setSucursal] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje]   = useState(null); // { tipo: "ok" | "error", texto }

  const esAdmin = user?.rol === "admin";

  // Guard de acceso
  if (!esAdmin) {
    return (
      <div style={{ padding: "40px", color: "#f87171", fontSize: "16px" }}>
        ❌ No tienes acceso a esta sección.
      </div>
    );
  }

  const crearUsuario = async () => {
    setMensaje(null);

    if (!email || !password || !sucursal || !nombre) {
      setMensaje({ tipo: "error", texto: "Completa todos los campos obligatorios." });
      return;
    }

    // Advertencia si rol y sucursal no coinciden lógicamente
    const esMayoreo  = sucursal === "mayoreo_menudeo";
    const esTaller   = !esMayoreo;

    if (rol === "ventas" && esTaller) {
      setMensaje({ tipo: "error", texto: 'El rol "Ventas" es exclusivo de Mayoreo/Menudeo.' });
      return;
    }
    if (rol === "coordinador" && esMayoreo) {
      setMensaje({ tipo: "error", texto: 'Para Mayoreo/Menudeo usa el rol "Ventas", no "Coordinador".' });
      return;
    }

    setCargando(true);

    // 1 — Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setMensaje({ tipo: "error", texto: "Error al crear en Auth: " + error.message });
      setCargando(false);
      return;
    }

    // 2 — Insertar registro en tabla usuarios
    const { error: errorDB } = await supabase
      .from("usuarios")
      .insert([{
        id:          data.user.id,
        auth_id:     data.user.id,
        email,
        nombre,
        rol,
        sucursal_id: sucursal,
      }]);

    setCargando(false);

    if (errorDB) {
      setMensaje({
        tipo: "error",
        texto: "Usuario creado en Auth pero error en BD: " + errorDB.message,
      });
      return;
    }

    setMensaje({ tipo: "ok", texto: `✅ Usuario "${nombre}" creado correctamente.` });
    setEmail("");
    setPassword("");
    setNombre("");
    setRol("coordinador");
    setSucursal("");
  };

  const desc = DESCRIPCION_ROL[rol];

  return (
    <div style={{ padding: "28px 24px", color: "#e5e7eb", maxWidth: "480px" }}>
      <h2 style={{ marginBottom: "24px", fontSize: "20px", fontWeight: 700 }}>
        👥 Crear Usuario
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

        {/* Nombre */}
        <div>
          <label style={labelStyle}>Nombre completo *</label>
          <input
            placeholder="Ej: María López"
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Email */}
        <div>
          <label style={labelStyle}>Correo electrónico *</label>
          <input
            type="email"
            placeholder="usuario@motormexa.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Contraseña */}
        <div>
          <label style={labelStyle}>Contraseña inicial *</label>
          <input
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={inputStyle}
          />
        </div>

        {/* Sucursal — se muestra antes del rol para guiar la selección */}
        <div>
          <label style={labelStyle}>Sucursal *</label>
          <select
            value={sucursal}
            onChange={e => {
              setSucursal(e.target.value);
              // Auto-sugerir rol según sucursal
              if (e.target.value === "mayoreo_menudeo" && rol === "coordinador") setRol("ventas");
              if (e.target.value !== "mayoreo_menudeo" && rol === "ventas") setRol("coordinador");
            }}
            style={inputStyle}
          >
            <option value="">— Selecciona sucursal —</option>
            {SUCURSALES.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        {/* Rol */}
        <div>
          <label style={labelStyle}>Rol *</label>
          <select
            value={rol}
            onChange={e => setRol(e.target.value)}
            style={inputStyle}
          >
            {/* ── Captura / Operativos ── */}
            <optgroup label="Captura">
              <option value="coordinador">Coordinador  (talleres)</option>
              <option value="ventas">Ventas  (Mayoreo/Menudeo)</option>
              <option value="asesor_op">Asesor Op.  (solo lectura)</option>
            </optgroup>

            {/* ── Operaciones ── */}
            <optgroup label="Operaciones">
              <option value="comprador">Comprador</option>
              <option value="almacen">Almacén</option>
              <option value="ventanilla">Ventanilla</option>
            </optgroup>

            {/* ── Dirección ── */}
            <optgroup label="Dirección">
              <option value="gerente_sucursal">Gerente Sucursal</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Admin</option>
            </optgroup>
          </select>
        </div>

        {/* Descripción del rol seleccionado */}
        {desc && (
          <div style={{
            background: desc.bg,
            border: `1px solid ${desc.border}`,
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "12px",
            color: desc.color,
            lineHeight: "1.5",
          }}>
            {desc.icono} <strong>{rol === "asesor_op" ? "Asesor Op." : rol.charAt(0).toUpperCase() + rol.slice(1)}</strong>
            {" — "}{desc.texto}
          </div>
        )}

        {/* Feedback */}
        {mensaje && (
          <div style={{
            padding: "10px 14px",
            borderRadius: "8px",
            fontSize: "13px",
            background: mensaje.tipo === "ok" ? "#052e16" : "#3b0000",
            border: `1px solid ${mensaje.tipo === "ok" ? "#166534" : "#991b1b"}`,
            color: mensaje.tipo === "ok" ? "#86efac" : "#fca5a5",
          }}>
            {mensaje.texto}
          </div>
        )}

        <button
          onClick={crearUsuario}
          disabled={cargando}
          style={{
            background: cargando ? "#1e3a5f" : "#2563eb",
            color: "white",
            padding: "11px",
            border: "none",
            borderRadius: "8px",
            cursor: cargando ? "not-allowed" : "pointer",
            fontWeight: 600,
            fontSize: "14px",
            marginTop: "4px",
            transition: "background 0.2s",
          }}
        >
          {cargando ? "Creando usuario..." : "Crear Usuario"}
        </button>

      </div>
    </div>
  );
}

// ─── Estilos locales ───────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  marginBottom: "5px",
  fontSize: "12px",
  color: "#9ca3af",
  fontWeight: 500,
};

const inputStyle = {
  width: "100%",
  background: "#111827",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "14px",
  boxSizing: "border-box",
};
