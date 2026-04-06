import { supabase } from "./supabase";

export const getUserData = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("auth_id", user.id)
    .single();

  return data;
};