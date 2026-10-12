/**
 * Normalizes a possibly-partial/unknown location JSON value into a safe,
 * fully-shaped Location. Missing string fields default to "" and mapQuery is
 * derived from the rest of the address when absent (falls back gracefully
 * instead of leaking undefined to the UI).
 */
export function normalizeLocation(raw) {
    if (!raw || typeof raw !== "object") {
        return { linea1: "", colonia: "", referencias: "", ciudad: "", estado: "", mapQuery: "" };
    }
    const o = raw;
    const str = (k) => typeof o[k] === "string" ? o[k].trim() : "";
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
