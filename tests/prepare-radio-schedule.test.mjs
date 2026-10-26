import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  parseOwner,
  parseRadioSchedule,
} from "../scripts/prepare-radio-schedule.mjs";

const example = `Y el Rol para la participación en la Raradiodifusora es:
5   Oct 1er Dto
12 Oct  4to Dto
19 Oct. 5to Dto
26 Oct. Área Norte`;

describe("radio monthly message parser", () => {
  test("transforms the supplied example using an explicit year", () => {
    const result = parseRadioSchedule(example, 2026);
    assert.deepEqual(result.errors, []);
    assert.deepEqual(
      result.entries.map(({ broadcastDate, ownerLabel }) => ({
        broadcastDate,
        ownerLabel,
      })),
      [
        { broadcastDate: "2026-10-05", ownerLabel: "Distrito 1" },
        { broadcastDate: "2026-10-12", ownerLabel: "Distrito 4" },
        { broadcastDate: "2026-10-19", ownerLabel: "Distrito 5" },
        { broadcastDate: "2026-10-26", ownerLabel: "Área Norte" },
      ],
    );
    assert.ok(
      result.entries.every(
        ({ time, link, note }) =>
          time === null && link === null && note === null,
      ),
    );
  });

  test("accepts only current districts and Área Norte", () => {
    assert.equal(parseOwner("2do Distrito").districtNumber, 2);
    assert.equal(parseOwner("Área Norte").ownerIsAreaNorte, true);
    assert.throws(() => parseOwner("Distrito 3"), /no permitido/);
    assert.throws(() => parseOwner("6to Dto"), /no permitido/);
    assert.throws(() => parseOwner("Comité de Área Norte"), /no reconocido/);
  });

  test("requires the year and rejects invalid or duplicate dates", () => {
    assert.throws(() => parseRadioSchedule(example), /año es obligatorio/);
    assert.match(
      parseRadioSchedule("31 Feb 1er Dto", 2026).errors[0],
      /fecha inválida/,
    );
    assert.match(
      parseRadioSchedule("5 Oct 1er Dto\n5 Oct 4to Dto", 2026).errors.at(-1),
      /fecha duplicada/,
    );
  });

  test("reports unknown months and owners instead of inventing values", () => {
    const result = parseRadioSchedule("5 Foo 1er Dto\n12 Oct Grupo X", 2026);
    assert.equal(result.entries.length, 0);
    assert.match(result.errors.join(" "), /mes no reconocido/);
    assert.match(result.errors.join(" "), /responsable no reconocido/);
  });
});
