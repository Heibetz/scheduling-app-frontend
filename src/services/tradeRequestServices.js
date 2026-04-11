import apiClient from "./services.js";

export default {
  /**
   * @param {{ to_user_id: number, offered_shift_id: number, message?: string }} payload
   */
  create(payload) {
    return apiClient.post("trade-requests", payload);
  },
  /**
   * Pending trade requests sent directly to this worker.
   * @param {number|string} userId
   */
  getIncomingForUser(userId) {
    return apiClient.get(`trade-requests/incoming/${userId}`);
  },
  /**
   * @param {number|string} tradeRequestId
   */
  decline(tradeRequestId) {
    return apiClient.patch(`trade-requests/${tradeRequestId}/decline`, {});
  },
  /**
   * @param {number|string} tradeRequestId
   */
  accept(tradeRequestId) {
    return apiClient.patch(`trade-requests/${tradeRequestId}/accept`, {});
  },
};
