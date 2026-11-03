import {
  escapeFilterValue,
  listAllRecords,
  listRecords,
  listRecordsPaginated,
  MAX_LIST_PAGES,
} from "../client.ts";
import type { EventRecord } from "../types/event.ts";
import { mapEvent } from "../mappers/event.mapper.ts";
import type { Event } from "../types/event.ts";

const NEXT_PAGE_SIZE = 200;

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
      return listAllRecords<Event, EventRecord>("events", mapEvent, {
        filter: "status='active'",
        // `id` as tiebreaker: page walk requires a deterministic total order
        sort: "startDate,id",
      });
    },
    async getNext() {
      // Events are sorted by startDate ascending, so the first "upcoming" hit on
      // any page is the global next event; earlier pages may be entirely past
      // events when more than one page of active events exists.
      for (let page = 1; page <= MAX_LIST_PAGES; page++) {
        const data = await listRecordsPaginated<Event, EventRecord>(
          "events",
          mapEvent,
          {
            filter: "status='active'",
            sort: "startDate,id",
            expand: "postRef",
            page,
            perPage: NEXT_PAGE_SIZE,
          },
        );
        const next = data.items.find(isAfterTodayOrOngoing);
        if (next) return next;
        if (page >= data.totalPages || data.items.length === 0) break;
      }
      return undefined;
    },
    async getBySlug(slug) {
      const items = await listRecords<Event, EventRecord>(
        "events",
        mapEvent,
        {
          filter: `status='active'&&slug=${escapeFilterValue(slug)}`,
          perPage: 1,
        },
      );
      return items[0];
    },
  };
}
