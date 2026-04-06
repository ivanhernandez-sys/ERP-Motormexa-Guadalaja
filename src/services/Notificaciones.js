import { supabase } from "./supabase";

export const escucharCambios = (userId, callback) => {
  supabase
    .channel("items-cambios")
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "items",
      },
      (payload) => {
        if (payload.new.asesor_id === userId) {
          callback(payload.new);
        }
      }
    )
    .subscribe();
};