import apiClient from "./services.js";

export default {
  getAll() {
    return apiClient.get("areas");
  },
  get(id) {
    return apiClient.get(`areas/${id}`);
  },
  getByCode(code) {
    return apiClient.get(`areas/code/${code}`);
  },
  create(data) {
    return apiClient.post("areas", data);
  },
  update(id, data) {
    return apiClient.put(`areas/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`areas/${id}`);
  },
};
