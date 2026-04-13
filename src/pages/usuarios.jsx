// src/pages/Usuarios.jsx

import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function Usuarios() {
  const { user } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol]           = useState("coordinador");
  const [sucursal, setSucursal] = useState("");
  const [cargando, setCargando] = useState(false);

  const esAdmin = user?.rol === "admin";

  if (!esAdmin) {
    return <div style={{ padding: "40px" }}>❌ No tienes acceso</div>;
  }

  const crearUsuario = async () => {
    if (!email || !password || !sucursal) {
      alert("Completa todos los campos");
      return;
    }

    setCargando(true);

    // Crear usuario en Auth
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert("Error creando usuario: " + error.message);
      setCargando(false);
      return;
    }

    // Insertar en tabla usuarios
    const { error: errorDB } = await supabase
      .from("usuarios")
      .insert([{
        id: data.user.id,
        email,
        rol,
        sucursal_id: sucursal,
      }]);

    setCargando(false);

    if (errorDB) {
      alert("Usuario creado en Auth pero error en BD: " + errorDB.message);
      return;
    }

    alert("✅ Usuario creado correctamente");
    setEmail("");
    setPassword("");
    setRol("coordinador");
    setSucursal("");
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2>👥 Crear Usuario</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>

        <input
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={inputStyle}
        />

        <select
          value={rol}
          onChange={e => setRol(e.target.value)}
          style={inputStyle}
        >
          {/* ── Rol "coordinador" reemplaza al antiguo "asesor" ── */}
          <option value="coordinador">Coordinador</option>

          {/* ── Nuevo rol de solo consulta ── */}
          <option value="asesor_op">Asesor Op. (Solo lectura)</option>

          <option value="comprador">Compras</option>
          <option value="almacen">Almacén</option>
          <option value="ventanilla">Ventanilla</option>
          <option value="gerente_sucursal">Gerente Sucursal</option>
          <option value="gerente">Gerente</option>
          <option value="admin">Admin</option>
        </select>

        {/* Descripción del rol seleccionado */}
        {rol === "asesor_op" && (
          <div style={{
            background: "#1e2f1e", border: "1px solid #166534", borderRadius: "6px",
            padding: "8px 12px", fontSize: "12px", color: "#86efac"
          }}>
            🔒 Solo consulta — Verá únicamente sus órdenes asignadas, sin poder modificar nada.
          </div>
        )}
        {rol === "coordinador" && (
          <div style={{
            background: "#1e3a5f", border: "1px solid #2563eb", borderRadius: "6px",
            padding: "8px 12px", fontSize: "12px", color: "#93c5fd"
          }}>
            📦 Puede capturar órdenes, ver su panel y solicitar stock.
          </div>
        )}

        <select
          value={sucursal}
          onChange={e => setSucursal(e.target.value)}
          style={inputStyle}
        >
          <option value="">Selecciona sucursal</option>
          <option value="taller_vallarta">Vallarta</option>
          <option value="acueducto">Acueducto</option>
          <option value="camino_real">Camino Real</option>
          <option value="mayoreo_menudeo">Mayoreo</option>
        </select>

        <button
          onClick={crearUsuario}
          disabled={cargando}
          style={{
            background: "#2563eb", color: "white", padding: "10px",
            border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600
          }}
        >
          {cargando ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}

const inputStyle = {
  background: "#111827",
  border: "1px solid #1f2937",
  color: "#e5e7eb",
  padding: "8px 12px",
  borderRadius: "8px",
  fontSize: "14px",
};
