/**
 * Location / Address — embedded JSON shared by District, Group and Event.
 * See docs/architecture/pocketbase-schema.md §11.
 */
export interface Location {
  linea1: string;
  colonia: string;
  referencias: string;
  ciudad: string;
  estado: string;
  mapQuery: string;
}

/**
 * Normalizes a possibly-partial/unknown location JSON value into a safe,
 * fully-shaped Location. Missing string fields default to "" and mapQuery is
 * derived from the rest of the address when absent (falls back gracefully
 * instead of leaking undefined to the UI).
 */
export function normalizeLocation(raw: unknown): Location {
  if (!raw || typeof raw !== "object") {
    return { linea1: "", colonia: "", referencias: "", ciudad: "", estado: "", mapQuery: "" };
  }
  const o = raw as Record<string, unknown>;
  const str = (k: string): string =>
    typeof o[k] === "string" ? (o[k] as string).trim() : "";
  const linea1 = str("linea1");
  const colonia = str("colonia");
  const referencias = str("referencias");
  const ciudad = str("ciudad");
  const estado = str("estado");
  const mapQuery = str("mapQuery");
  return {
    linea1,
    colonia,
    referencias,
    ciudad,
    estado,
    mapQuery,
  };
}