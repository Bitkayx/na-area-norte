#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MONTHS = new Map([
  ["ene", 1],
  ["enero", 1],
  ["feb", 2],
  ["febrero", 2],
  ["mar", 3],
  ["marzo", 3],
  ["abr", 4],
  ["abril", 4],
  ["may", 5],
  ["mayo", 5],
  ["jun", 6],
  ["junio", 6],
  ["jul", 7],
  ["julio", 7],
  ["ago", 8],
  ["agosto", 8],
  ["sep", 9],
  ["sept", 9],
  ["septiembre", 9],
  ["oct", 10],
  ["octubre", 10],
  ["nov", 11],
  ["noviembre", 11],
  ["dic", 12],
  ["diciembre", 12],
]);
const VALID_DISTRICTS = new Set([1, 2, 4, 5]);

function normalized(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[.,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseOwner(raw) {
  const value = normalized(raw);
  if (/^area norte$/.test(value)) {
    return {
      ownerIsAreaNorte: true,
      districtNumber: null,
      ownerLabel: "Área Norte",
    };
  }
  const match =
    value.match(/^(\d+)(?:er|ro|do|to)?\s+(?:dto|distrito)$/) ??
    value.match(/^distrito\s+(\d+)$/);
  if (!match) throw new Error(`responsable no reconocido: "${raw.trim()}"`);
  const districtNumber = Number(match[1]);
  if (!VALID_DISTRICTS.has(districtNumber)) {
    throw new Error(`distrito inexistente o no permitido: ${districtNumber}`);
  }
  return {
    ownerIsAreaNorte: false,
    districtNumber,
    ownerLabel: `Distrito ${districtNumber}`,
  };
}

function dateValue(year, month, day) {
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`fecha inválida: ${day}/${month}/${year}`);
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseRadioSchedule(text, year) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("el año es obligatorio y debe estar entre 2000 y 2100");
  }
  const entries = [];
  const errors = [];
  for (const [index, original] of String(text).split(/\r?\n/).entries()) {
    const line = original.trim();
    if (!line || !/^\d/.test(line)) continue;
    const match = line.match(
      /^(\d{1,2})\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ.]+)\s+(.+)$/u,
    );
    if (!match) {
      errors.push(`línea ${index + 1}: formato no reconocido`);
      continue;
    }
    try {
      const monthName = normalized(match[2]);
      const month = MONTHS.get(monthName);
      if (!month) throw new Error(`mes no reconocido: "${match[2]}"`);
      const owner = parseOwner(match[3]);
      entries.push({
        broadcastDate: dateValue(year, month, Number(match[1])),
        ...owner,
        time: null,
        link: null,
        note: null,
        sourceText: line,
      });
    } catch (error) {
      errors.push(`línea ${index + 1}: ${error.message}`);
    }
  }
  if (entries.length === 0 && errors.length === 0)
    errors.push("no se encontraron participaciones");
  const dates = entries.map((entry) => entry.broadcastDate);
  for (const date of new Set(
    dates.filter((value, i) => dates.indexOf(value) !== i),
  )) {
    errors.push(`fecha duplicada: ${date}`);
  }
  return { entries, errors };
}

function getArg(flag, argv) {
  const index = argv.indexOf(flag);
  return index >= 0 ? argv[index + 1] : null;
}

function main(argv = process.argv) {
  const input = getArg("--input", argv);
  const year = Number(getArg("--year", argv));
  if (!input) throw new Error("falta --input <archivo>");
  const result = parseRadioSchedule(
    fs.readFileSync(path.resolve(input), "utf8"),
    year,
  );
  if (result.errors.length) {
    for (const error of result.errors) console.error(`[VALIDATION] ${error}`);
    throw new Error("el calendario contiene errores; no se generó un plan");
  }
  console.log(JSON.stringify(result.entries, null, 2));
  console.log(
    `[DRY-RUN] ${result.entries.length} participaciones preparadas. No se contactó PocketBase.`,
  );
  return result;
}

export {
  MONTHS,
  VALID_DISTRICTS,
  normalized,
  parseOwner,
  dateValue,
  parseRadioSchedule,
  main,
};

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    main();
  } catch (error) {
    console.error(`[ERROR] ${error.message}`);
    process.exitCode = 1;
  }
}
