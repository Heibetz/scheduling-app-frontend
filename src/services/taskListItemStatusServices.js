import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("task-list-item-statuses", { params });
  },
  get(id) {
    return apiClient.get(`task-list-item-statuses/${id}`);
  },
  create(data) {
    return apiClient.post("task-list-item-statuses", data);
  },
  update(id, data) {
    return apiClient.put(`task-list-item-statuses/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`task-list-item-statuses/${id}`);
  },
};
