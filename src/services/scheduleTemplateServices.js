import apiClient from "./services.js";

export default {
  // Template CRUD
  getAll(areaId) {
    return apiClient.get(`schedule-templates${areaId ? `?area_id=${areaId}` : ''}`);
  },
  get(id) {
    return apiClient.get(`schedule-templates/${id}`);
  },
  create(data) {
    return apiClient.post("schedule-templates", data);
  },
  update(id, data) {
    return apiClient.put(`schedule-templates/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`schedule-templates/${id}`);
  },

  // Template Shift CRUD
  createShift(templateId, data) {
    return apiClient.post(`schedule-templates/${templateId}/shifts`, data);
  },
  updateShift(templateId, shiftId, data) {
    return apiClient.put(`schedule-templates/${templateId}/shifts/${shiftId}`, data);
  },
  deleteShift(templateId, shiftId) {
    return apiClient.delete(`schedule-templates/${templateId}/shifts/${shiftId}`);
  },

  // Template Shift Task CRUD
  createShiftTask(templateId, shiftId, data) {
    return apiClient.post(`schedule-templates/${templateId}/shifts/${shiftId}/tasks`, data);
  },
  deleteShiftTask(templateId, shiftId, taskId) {
    return apiClient.delete(`schedule-templates/${templateId}/shifts/${shiftId}/tasks/${taskId}`);
  },

  // Apply template to create a schedule
  apply(templateId, data) {
    return apiClient.post(`schedule-templates/${templateId}/apply`, data);
  },
};
