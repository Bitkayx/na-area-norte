import { listRecords, getOneRecord } from "../client.ts";
import type { EventRecord } from "../types/event.ts";
import { mapEvent } from "../mappers/event.mapper.ts";
import type { Event } from "../types/event.ts";

export interface EventRepository {
  /** All active events, sorted by start date ascending. */
  getActive(): Promise<Event[]>;
  /** The next upcoming active event (earliest startDate on/after today). */
  getNext(): Promise<Event | undefined>;
  /** A single active event by slug. */
  getBySlug(slug: string): Promise<Event | undefined>;
}

function isAfterTodayOrOngoing(e: Event): boolean {
  if (e.startDate == null) return false;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  return e.startDate.getTime() >= startOfToday.getTime();
}

export function createEventRepository(): EventRepository {
  return {
    async getActive() {
      const all = await listRecords<Event, EventRecord>("events", mapEvent, {
        filter: "status='active'",
        sort: "startDate",
      });
      return all;
    },
    async getNext() {
      const all = await listRecords<Event, EventRecord>("events", mapEvent, {
        filter: "status='active'",
        sort: "startDate",
      });
      return all.filter(isAfterTodayOrOngoing)[0];
    },
    async getBySlug(slug) {
      return getOneRecord<Event, EventRecord>("events", slug, mapEvent);
    },
  };
}