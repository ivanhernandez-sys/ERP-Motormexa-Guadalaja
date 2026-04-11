// src/pages/Usuarios.jsx

import { useState } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../contexts/AuthContext";

export default function Usuarios() {
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("asesor");
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

    // 🔥 Crear usuario en Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert("Error creando usuario: " + error.message);
      setCargando(false);
      return;
    }

    // 🔥 Insertar en tabla usuarios
    const { error: errorDB } = await supabase
      .from("usuarios")
      .insert([
        {
          id: data.user.id,
          email,
          rol,
          sucursal_id: sucursal,
        },
      ]);

    setCargando(false);

    if (errorDB) {
      alert("Usuario creado pero error en BD");
      return;
    }

    alert("✅ Usuario creado correctamente");

    setEmail("");
    setPassword("");
    setRol("asesor");
    setSucursal("");
  };

  return (
    <div style={{ padding: "20px", color: "#e5e7eb" }}>
      <h2>👥 Crear Usuario</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxWidth: "400px" }}>
        
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <select value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="asesor">Asesor</option>
          <option value="compras">Compras</option>
          <option value="ventanilla">Ventanilla</option>
          <option value="gerente_sucursal">Gerente Sucursal</option>
        </select>

        <select value={sucursal} onChange={(e) => setSucursal(e.target.value)}>
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
            background: "#2563eb",
            color: "white",
            padding: "10px",
            border: "none",
            borderRadius: "8px",
          }}
        >
          {cargando ? "Creando..." : "Crear Usuario"}
        </button>
      </div>
    </div>
  );
}