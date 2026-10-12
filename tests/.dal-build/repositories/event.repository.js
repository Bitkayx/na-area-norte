import { listRecords, getOneRecord } from "../client.js";
import { mapEvent } from "../mappers/event.mapper.js";
function isAfterTodayOrOngoing(e) {
    if (e.startDate == null)
        return false;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    return e.startDate.getTime() >= startOfToday.getTime();
}
export function createEventRepository() {
    return {
        async getActive() {
            const all = await listRecords("events", mapEvent, {
                filter: "status='active'",
                sort: "startDate",
            });
            return all;
        },
        async getNext() {
            const all = await listRecords("events", mapEvent, {
                filter: "status='active'",
                sort: "startDate",
            });
            return all.filter(isAfterTodayOrOngoing)[0];
        },
        async getBySlug(slug) {
            return getOneRecord("events", slug, mapEvent);
        },
    };
}
