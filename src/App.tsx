// src/App.tsx

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext.jsx";
import Layout from "./components/Layout.jsx";

// Pages
import Login from "./pages/Login";
import Captura from "./pages/Captura";
import Compras from "./pages/Compras";
import PanelAsesor from "./pages/PanelAsesor";        // coordinador y ventas
import PanelAsesorOp from "./pages/PanelAsesorOp";    // asesor_op (solo lectura)
import PanelGerencial from "./pages/PanelGerencial";
import Ventanilla from "./pages/Ventanilla";
import VentanillaDetalle from "./pages/VentanillaDetalle";
import ConsultaOT from "./pages/ConsultaOT";
import StockPedidos from "./pages/StockPedidos";
import Almacen from "./pages/Almacen";
import Chatbot from "./pages/Chatbot";
import MisCotizaciones from "./pages/MisCotizaciones";
import Usuarios from "./pages/usuarios";

// ─────────────────────────────────────────────────────────────────────────────
// Ruta de inicio por rol
// ─────────────────────────────────────────────────────────────────────────────
const ROL_DEFAULT: Record<string, string> = {
  coordinador:      "/captura",
  ventas:           "/captura",         // Mayoreo — misma página, distinto menú
  asesor_op:        "/mi-consulta",
  comprador:        "/compras",
  almacen:          "/almacen",
  ventanilla:       "/ventanilla",
  gerente:          "/gerencial",
  gerente_sucursal: "/gerencial",
  admin:            "/gerencial",
};

// ─────────────────────────────────────────────────────────────────────────────
// Guard de ruta por rol
// Uso: <RutaProtegida roles={["admin"]}> ... </RutaProtegida>
// Si el usuario no tiene el rol necesario, redirige a su ruta por defecto.
// ─────────────────────────────────────────────────────────────────────────────
function RutaProtegida({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  const destino = ROL_DEFAULT[user?.rol ?? ""] ?? "/captura";

  if (!user || !roles.includes(user.rol)) {
    return <Navigate to={destino} replace />;
  }
  return children;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rutas protegidas (usuario autenticado)
// ─────────────────────────────────────────────────────────────────────────────
function RutasProtegidas() {
  const { user, cargando } = useAuth();

  if (cargando) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: "100vh", background: "#0f172a", color: "#9ca3af", fontSize: "17px"
      }}>
        Cargando sistema...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rolDefault = ROL_DEFAULT[user.rol] ?? "/captura";

  return (
    <Layout>
      <Routes>
        {/* Redirect raíz → ruta de inicio del rol */}
        <Route path="/" element={<Navigate to={rolDefault} replace />} />

        {/* ── Coordinador (talleres) ─────────────────────────────────── */}
        {/* ── Ventas (Mayoreo/Menudeo) ──────────────────────────────── */}
        <Route
          path="/captura"
          element={
            <RutaProtegida roles={["coordinador", "ventas", "gerente", "gerente_sucursal", "admin"]}>
              <Captura />
            </RutaProtegida>
          }
        />
        <Route
          path="/mi-panel"
          element={
            <RutaProtegida roles={["coordinador", "ventas", "gerente", "admin"]}>
              <PanelAsesor />
            </RutaProtegida>
          }
        />
        <Route
          path="/mis-cotizaciones"
          element={
            <RutaProtegida roles={["coordinador", "ventas", "gerente", "gerente_sucursal", "admin"]}>
              <MisCotizaciones />
            </RutaProtegida>
          }
        />

        {/* ── Asesor Op. (solo lectura) ──────────────────────────────── */}
        <Route
          path="/mi-consulta"
          element={
            <RutaProtegida roles={["asesor_op"]}>
              <PanelAsesorOp />
            </RutaProtegida>
          }
        />

        {/* ── Compartidas (todos los roles autenticados) ──────────────── */}
        <Route path="/consulta-ot" element={<ConsultaOT />} />
        <Route path="/chat"        element={<Chatbot />} />

        {/* ── Compras ────────────────────────────────────────────────── */}
        <Route
          path="/compras"
          element={
            <RutaProtegida roles={["comprador", "gerente", "admin"]}>
              <Compras />
            </RutaProtegida>
          }
        />

        {/* ── Almacén ────────────────────────────────────────────────── */}
        <Route
          path="/almacen"
          element={
            <RutaProtegida roles={["almacen", "gerente", "gerente_sucursal", "admin"]}>
              <Almacen />
            </RutaProtegida>
          }
        />
        <Route
          path="/recepcion-masiva"
          element={
            <RutaProtegida roles={["almacen", "gerente", "gerente_sucursal", "admin"]}>
              <Almacen />
            </RutaProtegida>
          }
        />
        <Route
          path="/stock-pedidos"
          element={
            <RutaProtegida roles={["almacen", "gerente", "gerente_sucursal", "admin"]}>
              <StockPedidos />
            </RutaProtegida>
          }
        />

        {/* ── Ventanilla ─────────────────────────────────────────────── */}
        <Route
          path="/ventanilla"
          element={
            <RutaProtegida roles={["ventanilla", "gerente", "gerente_sucursal", "admin"]}>
              <Ventanilla />
            </RutaProtegida>
          }
        />
        <Route
          path="/ventanilla/:ot"
          element={
            <RutaProtegida roles={["ventanilla", "gerente", "gerente_sucursal", "admin"]}>
              <VentanillaDetalle />
            </RutaProtegida>
          }
        />

        {/* ── Gerencial ──────────────────────────────────────────────── */}
        <Route
          path="/gerencial"
          element={
            <RutaProtegida roles={["gerente", "gerente_sucursal", "admin"]}>
              <PanelGerencial />
            </RutaProtegida>
          }
        />

        {/* ── Administración de usuarios (solo admin) ─────────────────── */}
        <Route
          path="/usuarios"
          element={
            <RutaProtegida roles={["admin"]}>
              <Usuarios />
            </RutaProtegida>
          }
        />

        {/* Catch-all → ruta por defecto del rol */}
        <Route path="*" element={<Navigate to={rolDefault} replace />} />
      </Routes>
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Guard del Login (redirige a inicio si ya hay sesión)
// ─────────────────────────────────────────────────────────────────────────────
function LoginGuard() {
  const { user, cargando } = useAuth();
  if (cargando) return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#0f172a", color: "#9ca3af"
    }}>
      Cargando sistema...
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}

// ─────────────────────────────────────────────────────────────────────────────
// App root
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*"     element={<RutasProtegidas />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
