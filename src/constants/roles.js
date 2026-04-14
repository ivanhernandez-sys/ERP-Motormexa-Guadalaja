// src/constants/roles.js
// ─────────────────────────────────────────────────────────────────────────────
// Fuente única de verdad para roles y sucursales en toda la aplicación.
// Importar desde aquí en vez de redefinir en cada archivo.
// ─────────────────────────────────────────────────────────────────────────────

// ── SUCURSALES ────────────────────────────────────────────────────────────────
export const SUCURSALES = [
  { id: "acueducto",       nombre: "Acueducto" },
  { id: "vallarta",        nombre: "Vallarta" },
  { id: "country",         nombre: "Country" },
  { id: "camino_real",     nombre: "Camino Real" },
  { id: "bodyshop",        nombre: "BodyShop" },
  { id: "mayoreo_menudeo", nombre: "Mayoreo / Menudeo" },
];

/** Mapa rápido id → nombre */
export const NOMBRES_SUCURSAL = Object.fromEntries(
  SUCURSALES.map(s => [s.id, s.nombre])
);

// ── ROLES ─────────────────────────────────────────────────────────────────────

/**
 * Todos los roles válidos del sistema.
 * - coordinador   : captura en talleres (ex "asesor")
 * - ventas        : captura en Mayoreo/Menudeo
 * - asesor_op     : solo lectura, ve únicamente sus órdenes
 * - comprador     : módulo de compras
 * - almacen       : módulo de almacén y recepción
 * - ventanilla    : entrega al cliente final
 * - gerente_sucursal : visión de su sucursal
 * - gerente       : todos los módulos operativos (sin admin de usuarios)
 * - admin         : acceso total
 */
export const ROLES = [
  "coordinador",
  "ventas",
  "asesor_op",
  "comprador",
  "almacen",
  "ventanilla",
  "gerente_sucursal",
  "gerente",
  "admin",
];

/** Etiqueta legible por rol */
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

/** Ruta de inicio por rol */
export const ROL_DEFAULT = {
  coordinador:      "/captura",
  ventas:           "/captura",
  asesor_op:        "/mi-consulta",
  comprador:        "/compras",
  almacen:          "/almacen",
  ventanilla:       "/ventanilla",
  gerente:          "/gerencial",
  gerente_sucursal: "/gerencial",
  admin:            "/gerencial",
};

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Roles que solo ven sus propias órdenes (filtro por asesor_id) */
export const ROLES_RESTRINGIDOS_ASESOR = ["coordinador", "ventas", "asesor_op"];

/** Roles que solo ven su sucursal (filtro por sucursal_id) */
export const ROLES_RESTRINGIDOS_SUCURSAL = ["ventanilla", "gerente_sucursal"];

/** Roles con acceso al módulo de compras */
export const ROLES_COMPRAS = ["comprador", "gerente", "admin"];

/** Roles con acceso al módulo de almacén */
export const ROLES_ALMACEN = ["almacen", "gerente", "gerente_sucursal", "admin"];

/** Roles con acceso al panel gerencial */
export const ROLES_GERENCIAL = ["gerente", "gerente_sucursal", "admin"];

/** Roles con acceso a captura de órdenes */
export const ROLES_CAPTURA = ["coordinador", "ventas", "gerente", "gerente_sucursal", "admin"];
