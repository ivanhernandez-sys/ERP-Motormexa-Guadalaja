// ─────────────────────────────────────────────────────────────
// CATÁLOGOS MAESTROS DEL SISTEMA MOTORMEXA
// ─────────────────────────────────────────────────────────────

export const SUCURSALES = {
  taller_vallarta:   { nombre: "Taller Vallarta",    fabricantes: ["Stellantis", "Mitsubishi", "Peugeot"], permitEUA: true  },
  taller_acueducto:  { nombre: "Taller Acueducto",   fabricantes: ["Stellantis", "Mitsubishi", "Peugeot"], permitEUA: true  },
  taller_country:    { nombre: "Taller Country",     fabricantes: ["Stellantis", "Mitsubishi", "Peugeot"], permitEUA: true  },
  taller_camino_real:{ nombre: "Taller Camino Real", fabricantes: ["Mitsubishi"],                          permitEUA: false },
  bodyshop:          { nombre: "BodyShop",           fabricantes: ["Stellantis", "Mitsubishi", "Peugeot"], permitEUA: true  },
  mayoreo_menudeo:   { nombre: "Mayoreo/Menudeo",    fabricantes: ["Stellantis", "Mitsubishi", "Peugeot"], permitEUA: true  },
};

export const FABRICANTE_POR_MARCA = {
  Ram:        "Stellantis",
  Jeep:       "Stellantis",
  Chrysler:   "Stellantis",
  Dodge:      "Stellantis",
  Fiat:       "Stellantis",
  Mitsubishi: "Mitsubishi",
  Peugeot:    "Peugeot",
};

export const MARCAS_POR_FABRICANTE = {
  Stellantis: ["Ram", "Jeep", "Chrysler", "Dodge", "Fiat"],
  Mitsubishi: ["Mitsubishi"],
  Peugeot:    ["Peugeot"],
};

export const MODELOS_POR_MARCA = {
  Ram: ["700", "1200", "1500 Mild-Hybrid", "1500 TRX/RHO", "2500", "4000", "Promaster/Rapid", "Otro"],
  Jeep: ["Renegade", "Compass", "Cherokee", "Grand Cherokee", "Wrangler JL", "Wrangler JT", "Wagoneer/Grand Wagoneer", "Patriot", "Liberty", "Otro"],
  Fiat: ["Mobi", "Uno", "Argo", "Pulse", "Fastback", "500/500L/500x", "Ducato", "Abarth", "Otro"],
  Dodge: ["Attitude", "New Attitude", "Neon", "Journey", "New Journey", "Durango", "Charger", "Challenger", "Otro"],
  Chrysler: ["Pacifica", "300/300C", "200", "Town & Country", "Otro"],
  Peugeot: ["208", "301", "2008", "3008", "5008", "Landtrek", "Partner", "Rifter", "Manager", "Otro"],
  Mitsubishi: ["Mirage", "Xpander/Xpander Cross", "Outlander PHEV", "Outlander Sport", "Outlander", "Montero Sport", "L200 Gasolina", "L200 Diesel", "ASX/Eclipse Cross", "Otro"],
};

export const ESTATUSES_ITEM = ["Pendiente", "Comprada", "No comprada", "Recibida", "Entregada", "Incorrecta", "Vencida"];

export const ESTATUSES_OT = ["Completa", "Parcial", "Facturada", "Cancelada"];

export const TIPOS_ORDEN = ["Público", "Garantía", "Interna"];

export const TIPOS_COTIZACION = ["Aseguradora", "Mayoreo", "Menudeo"];

export const UBICACIONES = ["MX", "EUA", "BO"];

export const HORARIOS_CORTE = {
  Stellantis: "12:00",
  Mitsubishi:  "11:00",
  Peugeot:     "12:00",
};

// Días hábiles en que llega mercancía (0=dom, 1=lun, ... 6=sab)
const DIAS_LLEGADA = [2, 3, 5, 6]; // martes, miércoles, viernes, sábado

function esDiaLlegada(fecha) {
  return DIAS_LLEGADA.includes(fecha.getDay());
}

function siguienteDiaLlegada(desde) {
  const d = new Date(desde);
  d.setDate(d.getDate() + 1);
  while (!esDiaLlegada(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function addDiasHabiles(desde, dias) {
  let d = new Date(desde);
  let conteo = 0;
  while (conteo < dias) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 1) conteo++; // lunes y domingo no cuentan
  }
  return d;
}

export function calcularETA(ubicacion, fabricante, fechaCompra = new Date()) {
  const base = new Date(fechaCompra);

  if (ubicacion === "MX") {
    // 1 día hábil → siguiente día de llegada
    const unDia = addDiasHabiles(base, 1);
    // si ese día no es de llegada, al siguiente que sí lo sea
    return esDiaLlegada(unDia) ? unDia : siguienteDiaLlegada(unDia);
  }

  if (ubicacion === "EUA") {
    const catorce = addDiasHabiles(base, 14);
    return esDiaLlegada(catorce) ? catorce : siguienteDiaLlegada(catorce);
  }

  if (ubicacion === "BO") {
    const cuarentayCinco = addDiasHabiles(base, 45);
    return esDiaLlegada(cuarentayCinco) ? cuarentayCinco : siguienteDiaLlegada(cuarentayCinco);
  }

  return null;
}

export function formatFecha(fecha) {
  if (!fecha) return "—";
  return new Date(fecha).toLocaleDateString("es-MX", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  });
}

export function diasTranscurridos(fecha) {
  if (!fecha) return 0;
  return Math.floor((Date.now() - new Date(fecha)) / 86400000);
}

export function generarReferencia(sucursalId, ot, asesorNombre) {
  if (sucursalId === "bodyshop") return `BO-${ot}`;
  if (sucursalId === "mayoreo_menudeo") {
    const nombre = (asesorNombre || "").replace(/\s+/g, "").substring(0, 8).toUpperCase();
    return nombre;
  }
  return `TA-${ot}`;
}

export const COLOR_ESTATUS = {
  Pendiente:     { bg: "#854d0e", text: "#fef9c3" },
  Comprada:      { bg: "#1e40af", text: "#dbeafe" },
  "No comprada": { bg: "#374151", text: "#d1d5db" },
  Recibida:      { bg: "#166534", text: "#dcfce7" },
  Entregada:     { bg: "#14532d", text: "#bbf7d0" },
  Incorrecta:    { bg: "#7f1d1d", text: "#fee2e2" },
  Vencida:       { bg: "#581c87", text: "#f3e8ff" },
};
