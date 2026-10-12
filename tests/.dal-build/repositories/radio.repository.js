import { listRecords } from "../client.js";
import { mapRadioBroadcast } from "../mappers/entity.mapper.js";
export function createRadioRepository() {
    return {
        async getByWeek(week) {
            const all = await listRecords("radio_broadcasts", mapRadioBroadcast, { filter: `week=${week}`, expand: "district" });
            return all[0];
        },
        getByWeeks(weeks) {
            const params = weeks.length
                ? { filter: `week>=${weeks[0]} && week<=${weeks[weeks.length - 1]}`, expand: "district", perPage: 60 }
                : { expand: "district", perPage: 60 };
            return listRecords("radio_broadcasts", mapRadioBroadcast, params);
        },
    };
}
