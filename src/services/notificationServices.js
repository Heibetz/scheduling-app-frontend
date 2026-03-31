import apiClient from "./services.js";

export default {
  // Get notifications for a user
  getForUser(userId) {
    return apiClient.get(`notifications/user/${userId}`);
  },
  // Mark notification as read
  markAsRead(notificationId) {
    return apiClient.put(`notifications/${notificationId}/read`);
  },
  // Delete all read notifications for a user
  clearRead(userId) {
    return apiClient.delete(`notifications/user/${userId}/read`);
  },
};
