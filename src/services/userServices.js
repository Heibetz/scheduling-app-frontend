import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("users");
  },
  getUser(userId) {
    return apiClient.get(`users/${userId}`);
  },
  create(data) {
    return apiClient.post("users", data);
  },
  updateUser(userId, userData) {
    return apiClient.put(`users/${userId}`, userData);
  },
  delete(userId) {
    return apiClient.delete(`users/${userId}`);
  },
};