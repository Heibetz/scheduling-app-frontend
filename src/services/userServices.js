import apiClient from "./services.js";

export default {
  getUser(userId) {
    return apiClient.get(`users/${userId}`);
  },
  updateUser(userId, userData) {
    return apiClient.put(`users/${userId}`, userData);
  },
};