import apiClient from "./services.js";

export default {
  getAll(params) {
    return apiClient.get("tasklists", { params });
  },
  get(id) {
    return apiClient.get(`tasklists/${id}`);
  },
  create(data) {
    return apiClient.post("tasklists", data);
  },
  update(id, data) {
    return apiClient.put(`tasklists/${id}`, data);
  },
  delete(id) {
    return apiClient.delete(`tasklists/${id}`);
  },
  // ShiftTask endpoints
  getShiftTasks(params) {
    return apiClient.get("shift-tasks", { params });
  },
  attachTaskToShift(shift_id, task_id) {
    return apiClient.post("shift-tasks", { shift_id, task_id });
  },
  removeTaskFromShift(shift_task_id) {
    return apiClient.delete(`shift-tasks/${shift_task_id}`);
  },
};
