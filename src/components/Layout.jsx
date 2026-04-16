// src/components/Layout.jsx
import { Link, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import BusquedaGlobal from "./BusquedaGlobal";
import logo from "../assets/logo.png";

// ─────────────────────────────────────────────
// SUCURSALES — IDs canónicos y nombres de display
// ─────────────────────────────────────────────
export const SUCURSALES = [
  { id: "acueducto",      nombre: "Acueducto" },
  { id: "vallarta",       nombre: "Vallarta" },
  { id: "country",        nombre: "Country" },
  { id: "camino_real",    nombre: "Camino Real" },
  { id: "bodyshop",       nombre: "BodyShop" },
  { id: "mayoreo_menudeo", nombre: "Mayoreo / Menudeo" },
];

export const NOMBRES_SUCURSAL = Object.fromEntries(
  SUCURSALES.map(s => [s.id, s.nombre])
);

// ─────────────────────────────────────────────
// LABEL ROLES
// ─────────────────────────────────────────────
export const LABEL_ROL = {
  coordinador:      "Coordinador",
  ventas:           "Ventas",
  asesor_op:        "Asesor Op.",
  comprador:        "Comprador",
  almacen:          "Almacén",
  ventanilla:       "Ventanilla",
  gerente:          "Gerente",
  gerente_sucursal: "Gerente Sucursal",
  admin:            "Admin",
};

// ─────────────────────────────────────────────
// MENÚS POR ROL
// ─────────────────────────────────────────────
const MENU_POR_ROL = {
  coordinador: [
    { path: "/captura",          label: "📦 Captura" },
    { path: "/mi-panel",         label: "👤 Mi Panel" },
    { path: "/mis-cotizaciones", label: "📋 Mis Cotizaciones" },
    { path: "/consulta-ot",      label: "🔍 Consulta OT" },
    { path: "/chat",             label: "🤖 Asistente" },
  ],

  // Ventas - Mayoreo / Menudeo
  ventas: [
    { path: "/captura",          label: "📋 Nueva Cotización" },
    { path: "/mis-cotizaciones", label: "📊 Mis Cotizaciones" },
    { path: "/mi-panel",         label: "👤 Mis Órdenes" },
    { path: "/consulta-ot",      label: "🔍 Consulta" },
    { path: "/chat",             label: "🤖 Asistente" },
  ],

  asesor_op: [
    { path: "/mi-consulta", label: "👁️ Mis Órdenes" },
    { path: "/consulta-ot", label: "🔍 Consulta OT" },
    { path: "/chat",        label: "🤖 Asistente" },
  ],

  comprador: [
    { path: "/compras",     label: "🛒 Compras" },
    { path: "/consulta-ot", label: "🔍 Consulta OT" },
    { path: "/chat",        label: "🤖 Asistente" },
  ],

  almacen: [
    { path: "/almacen",       label: "🏭 Almacén / Recepción" },
    { path: "/stock-pedidos", label: "📋 Stock Pedidos" },
    { path: "/consulta-ot",   label: "🔍 Consulta OT" },
    { path: "/chat",          label: "🤖 Asistente" },
  ],

  ventanilla: [
    { path: "/ventanilla",  label: "🪟 Ventanilla" },
    { path: "/consulta-ot", label: "🔍 Consulta OT" },
    { path: "/chat",        label: "🤖 Asistente" },
  ],

  gerente: [
    { path: "/gerencial",        label: "📊 Panel Gerencial" },
    { path: "/captura",          label: "📦 Captura" },
    { path: "/compras",          label: "🛒 Compras" },
    { path: "/ventanilla",       label: "🪟 Ventanilla" },
    { path: "/almacen",          label: "🏭 Almacén / Recepción" },
    { path: "/stock-pedidos",    label: "📋 Stock Pedidos" },
    { path: "/mis-cotizaciones", label: "📋 Mis Cotizaciones" },
    { path: "/consulta-ot",      label: "🔍 Consulta OT" },
    { path: "/chat",             label: "🤖 Asistente" },
  ],

  gerente_sucursal: [
    { path: "/gerencial",        label: "📊 Mi Sucursal" },
    { path: "/captura",          label: "📦 Captura" },
    { path: "/ventanilla",       label: "🪟 Ventanilla" },
    { path: "/almacen",          label: "🏭 Almacén / Recepción" },
    { path: "/stock-pedidos",    label: "📋 Stock Pedidos" },
    { path: "/mis-cotizaciones", label: "📋 Mis Cotizaciones" },
    { path: "/consulta-ot",      label: "🔍 Consulta OT" },
    { path: "/chat",             label: "🤖 Asistente" },
  ],

  admin: [
    { path: "/gerencial",        label: "📊 Panel Gerencial" },
    { path: "/captura",          label: "📦 Captura" },
    { path: "/compras",          label: "🛒 Compras" },
    { path: "/ventanilla",       label: "🪟 Ventanilla" },
    { path: "/almacen",          label: "🏭 Almacén / Recepción" },
    { path: "/stock-pedidos",    label: "📋 Stock Pedidos" },
    { path: "/mis-cotizaciones", label: "📋 Mis Cotizaciones" },
    { path: "/usuarios",         label: "👥 Usuarios" },
    { path: "/consulta-ot",      label: "🔍 Consulta OT" },
    { path: "/chat",             label: "🤖 Asistente" },
  ],
};

// Fallback
const MENU_DEFAULT = [
  { path: "/captura",     label: "📦 Captura" },
  { path: "/consulta-ot", label: "🔍 Consulta OT" },
  { path: "/chat",        label: "🤖 Asistente" },
];

export default function Layout({ children }) {
  const location = useLocation();
  const { user, logout } = useAuth();

  const esMayoreo  = user?.sucursal_id === "mayoreo_menudeo";
  const esAsesorOp = user?.rol === "asesor_op";
  const esVentas   = user?.rol === "ventas";

  const menu = MENU_POR_ROL[user?.rol] || MENU_DEFAULT;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0f172a" }}>

      {/* Sidebar */}
      <aside style={{
        width: "215px", 
        background: "#020617",
        padding: "16px 10px", 
        borderRight: "1px solid #1f2937",
        display: "flex", 
        flexDirection: "column",
      }}>

        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <img src={logo} alt="logo" style={{ width: "110px", marginBottom: "8px" }} />
          <div style={{ color: "#4b5563", fontSize: "16px" }}>Sistema de Refacciones</div>
        </div>

        {/* Badge Sucursal */}
        {user?.sucursal_id && (
          <div style={{
            background: "#0f172a", 
            border: "1px solid #1f2937",
            borderRadius: "6px", 
            padding: "6px 10px",
            marginBottom: "14px", 
            textAlign: "center"
          }}>
            <div style={{ color: "#60a5fa", fontSize: "11px", fontWeight: 600 }}>
              {user.sucursal_nombre || NOMBRES_SUCURSAL[user.sucursal_id] || user.sucursal_id}
            </div>
          </div>
        )}

        {/* Badge Solo Lectura */}
        {esAsesorOp && (
          <div style={{
            background: "#1e2f1e", 
            border: "1px solid #166534",
            borderRadius: "6px", 
            padding: "5px 10px", 
            marginBottom: "12px",
            textAlign: "center", 
            color: "#86efac", 
            fontSize: "11px", 
            fontWeight: 600,
          }}>
            🔒 Modo Solo Lectura
          </div>
        )}

        {/* Badge Mayoreo / Menudeo */}
        {esMayoreo && (esVentas || user?.rol === "coordinador") && (
          <div style={{
            background: "#1e3a5f", 
            border: "1px solid #2563eb",
            borderRadius: "6px", 
            padding: "5px 10px", 
            marginBottom: "12px",
            textAlign: "center", 
            color: "#93c5fd", 
            fontSize: "11px", 
            fontWeight: 600,
          }}>
            🏪 Mayoreo / Menudeo
          </div>
        )}

        {/* Menú */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "3px", flex: 1 }}>
          {menu.map(m => {
            const activo = location.pathname === m.path || 
                          location.pathname.startsWith(m.path + "/");
            return (
              <Link 
                key={m.path} 
                to={m.path} 
                style={{
                  padding: "9px 10px", 
                  borderRadius: "8px", 
                  textDecoration: "none",
                  fontSize: "13px",
                  color: activo ? "#fff" : "#9ca3af",
                  background: activo ? "#1d4ed8" : "transparent",
                  fontWeight: activo ? 600 : 400,
                }}
              >
                {m.label}
              </Link>
            );
          })}
        </nav>

        {/* Usuario y Logout */}
        {user && (
          <div style={{ borderTop: "1px solid #1f2937", paddingTop: "12px" }}>
            <div style={{ color: "#e5e7eb", fontSize: "12px", fontWeight: 600 }}>
              {user.nombre || user.email}
            </div>
            <div style={{ color: "#4b5563", fontSize: "10px" }}>
              {LABEL_ROL[user.rol] || user.rol}
            </div>
            <button 
              onClick={logout} 
              style={{
                width: "100%", 
                marginTop: "8px", 
                background: "transparent",
                border: "1px solid #1f2937", 
                color: "#6b7280",
                padding: "6px", 
                borderRadius: "6px", 
                cursor: "pointer", 
                fontSize: "11px"
              }}
            >
              Cerrar sesión
            </button>
          </div>
        )}

      </aside>

      {/* Contenido Principal */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <header style={{
          height: "52px", 
          background: "#020617", 
          borderBottom: "1px solid #1f2937",
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between", 
          padding: "0 20px"
        }}>
          <span style={{ color: "#4b5563", fontSize: "12px" }}>
            {menu.find(m => location.pathname.startsWith(m.path))?.label || ""}
          </span>
          <BusquedaGlobal />
        </header>

        {/* Aquí se renderiza el contenido de las páginas */}
        <main style={{ flex: 1, overflowY: "auto" }}>
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
}