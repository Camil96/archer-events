import { listEvents, createEvent, updateEvent, deleteEvent } from "../store.js";

export const eventsApi = {
  list(filters = {}) {
    return listEvents(filters);
  },
  create(payload) {
    return createEvent(payload);
  },
  update(id, payload) {
    return updateEvent(id, payload);
  },
  remove(id) {
    return deleteEvent(id);
  },
};
