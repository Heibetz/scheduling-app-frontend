import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("position-users");
  },
  get(id) {
    return apiClient.get(`position-users/${id}`);
  },
  create(data) {
    return apiClient.post("position-users", data);
  },
  update(id, data) {
    return apiClient.put(`position-users/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`position-users/${id}`);
  },
};
