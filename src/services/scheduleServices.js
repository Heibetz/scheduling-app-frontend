import apiClient from "./services.js";
export default {
    getAll() {
        return apiClient.get("schedules");
    },
    get(id) {
        return apiClient.get(`schedules/${id}`);
    },
};