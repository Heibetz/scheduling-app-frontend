import apiClient from "./services.js";

export default {
  create(data) {
    return apiClient.post("shift-claims", data);
  },
  getByUser(userId) {
    return apiClient.get(`shift-claims/user/${userId}`);
  },
  cancel(shiftClaimId) {
    return apiClient.post(`shift-claims/cancel/${shiftClaimId}`);
  },
};
