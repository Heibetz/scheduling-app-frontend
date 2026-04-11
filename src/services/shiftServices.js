import apiClient from "./services.js";
export default {
    getAll(params) {
        return apiClient.get("shifts", {params});
    }, 
    getBySchedule(scheduleId) {
        return apiClient.get(`shifts/schedule/${scheduleId}`);
    },
    getByUser(userId) {
        return apiClient.get(`shifts/user/${userId}`);    
    },
    /** @param {number|string} userId */
    getOpenForUser(userId) {
        return apiClient.get(`shifts/open/${userId}`);
    },
    /** Combined counts for worker nav badge (open shifts + pending trade requests). */
    getAttentionSummary(userId) {
        return apiClient.get(`shifts/attention-summary/${userId}`);
    },
    getOpenForManager(userId) {
        return apiClient.get(`shifts/open-manager/${userId}`);
    },
    /** Claim an open shift instantly (no approval). */
    claim(shiftId) {
        return apiClient.post(`shifts/${shiftId}/claim`);
    },
    create(data) {
        return apiClient.post("shifts", data);
    },
    update(id, data) {
        return apiClient.put(`shifts/${id}`, data);
    },
    patch(id, data) {
        return apiClient.patch(`shifts/${id}`, data);
    },
    delete(id) {
        return apiClient.delete(`shifts/${id}`);
    },
};