import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("availabilities");
  },
  getByUserId(userId) {
    return apiClient.get(`availabilities/user/${userId}`);
  },
  getOne(id) {
    return apiClient.get(`availabilities/${id}`);
  },
  create(data) {
    return apiClient.post("availabilities", data);
  },
  update(id, data) {
    return apiClient.put(`availabilities/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`availabilities/${id}`);
  },
};