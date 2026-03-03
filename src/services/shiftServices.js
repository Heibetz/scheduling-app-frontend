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
};