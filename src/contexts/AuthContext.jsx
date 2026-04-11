import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../services/supabase";

const AuthContext = createContext(null);

// 🔥 MAPEO REAL TEMPORAL
const SUCURSALES = {
  "001f2a80-af33-4d6b-898f-e411da049efb": "Taller Vallarta",
  "acueducto": "Acueducto",
  "camino_real": "Camino Real",
  "mayoreo_menudeo": "Mayoreo"
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);

  const cargarUsuario = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      setUser(null);
      setCargando(false);
      return;
    }

    const { data } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    if (!data) {
      setUser(null);
      setCargando(false);
      return;
    }

    // 🔥 FIX REAL
    const userFinal = {
      ...data,
      nombre: data.nombre || data.email,
      sucursal_nombre:
        SUCURSALES[data.sucursal_id] ||
        "Sucursal asignada"
    };

    setUser(userFinal);
    setCargando(false);
  };

  useEffect(() => {
    cargarUsuario();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      cargarUsuario();
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, cargando, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}