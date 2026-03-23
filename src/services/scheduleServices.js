import apiClient from "./services.js";
export default {
    getAll() {
        return apiClient.get("schedules");
    },
    get(id) {
        return apiClient.get(`schedules/${id}`);
    },
    getByArea(areaId) {
        return apiClient.get(`schedules/area/${areaId}`);
    },
    create(data) {
        return apiClient.post("schedules", data);
    },
    update(id, data) {
        return apiClient.put(`schedules/${id}`, data);
    },
    delete(id) {
        return apiClient.delete(`schedules/${id}`);
    },
};