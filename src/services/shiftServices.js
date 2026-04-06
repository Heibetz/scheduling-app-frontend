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
    create(data) {
        return apiClient.post("shifts", data);
    },
    update(id, data) {
        return apiClient.put(`shifts/${id}`, data);
    },
    delete(id) {
        return apiClient.delete(`shifts/${id}`);
    },
};