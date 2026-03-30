import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("task-list-items", { params });
  },
  get(id) {
    return apiClient.get(`task-list-items/${id}`);
  },
  create(data) {
    return apiClient.post("task-list-items", data);
  },
  update(id, data) {
    return apiClient.put(`task-list-items/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`task-list-items/${id}`);
  },
};
