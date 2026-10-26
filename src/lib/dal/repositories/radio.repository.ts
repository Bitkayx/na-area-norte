import { escapeFilterValue, listRecords } from "../client.ts";
import type { RadioBroadcast, RadioBroadcastRecord } from "../types/radio.ts";
import { mapRadioBroadcast } from "../mappers/entity.mapper.ts";

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function mexicoCityDate(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function pocketBaseDate(value: string): string {
  return `${value} 00:00:00.000Z`;
}

export interface RadioRepository {
  getByDate(date: string): Promise<RadioBroadcast | undefined>;
  getNext(fromDate?: string): Promise<RadioBroadcast | undefined>;
}

export function createRadioRepository(): RadioRepository {
  return {
    async getByDate(date) {
      if (!isDateOnly(date)) return undefined;
      const records = await listRecords<RadioBroadcast, RadioBroadcastRecord>(
        "radio_broadcasts",
        mapRadioBroadcast,
        {
          filter: `broadcastDate=${escapeFilterValue(pocketBaseDate(date))}`,
          expand: "district",
          perPage: 1,
        },
      );
      return records[0];
    },
    async getNext(fromDate = mexicoCityDate()) {
      if (!isDateOnly(fromDate)) return undefined;
      const records = await listRecords<RadioBroadcast, RadioBroadcastRecord>(
        "radio_broadcasts",
        mapRadioBroadcast,
        {
          filter: `broadcastDate>=${escapeFilterValue(pocketBaseDate(fromDate))}`,
          expand: "district",
          perPage: 1,
          sort: "broadcastDate,id",
        },
      );
      return records[0];
    },
  };
}

export { isDateOnly, mexicoCityDate, pocketBaseDate };
