<template>
  <v-container fluid class="pa-4">
    <!-- Header -->
    <v-row class="mb-4" align="center">
      <v-col cols="12" md="8">
        <h1 class="text-h4 font-weight-bold mb-1">{{ area.area_name ? area.area_name + ' Dashboard' : 'Manager Dashboard' }}</h1>
        <p class="text-subtitle-1 text-grey-darken-1 mb-0">Manage your area's workers and schedules</p>
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center justify-end ga-3">
        <v-chip color="primary" variant="tonal" size="large">
          <v-icon start>mdi-account-group</v-icon>
          {{ workers.length }} Workers
        </v-chip>
        <v-btn color="secondary">
          <v-icon class="mr-2">mdi-checkbox-marked-outline</v-icon>
          Area Tasks
        </v-btn>
      </v-col>
    </v-row>

    <!-- Workers & Positions side by side -->
    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card class="pa-2" elevation="2" style="max-height: 250px; overflow-y: auto;">
          <div class="d-flex align-center pa-2">
            <span class="text-h6 font-weight-bold">Area Workers</span>
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="workers.length === 0">
                <td colspan="4" class="text-center text-grey">No workers assigned to this area</td>
              </tr>
              <tr v-for="worker in workers" :key="worker.user_id">
                <td>{{ worker.fName }}</td>
                <td>{{ worker.lName }}</td>
                <td>{{ worker.email }}</td>
                <td>{{ worker.is_active ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-2" elevation="2" style="max-height: 250px; overflow-y: auto;">
          <div class="d-flex align-center pa-2">
            <span class="text-h6 font-weight-bold">Area Positions</span>
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>Position Name</th>
                <th>Manager Position</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="areaPositions.length === 0">
                <td colspan="2" class="text-center text-grey">No positions found for this area</td>
              </tr>
              <tr v-for="pos in areaPositions" :key="pos.position_id">
                <td>{{ pos.position_name }}</td>
                <td>{{ pos.is_manager ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12">
        <v-card class="pa-4" outlined>
          <div class="d-flex justify-space-between align-center mb-2">
            <span class="text-h6">2-Week Schedule</span>
            <v-btn color="primary" @click="showShiftDialog = true">
              <v-icon class="mr-2">mdi-plus</v-icon>
              Add Shift
            </v-btn>
          </div>
          <!-- Schedule Table -->
          <v-table dense>
            <thead>
              <tr>
                <th>Date</th>
                <th>Shift Name</th>
                <th>Start</th>
                <th>End</th>
                <th>Assigned Worker</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="shift in schedule" :key="shift.id">
                <td>{{ shift.date }}</td>
                <td>{{ shift.name }}</td>
                <td>{{ shift.start }}</td>
                <td>{{ shift.end }}</td>
                <td>{{ getWorkerName(shift.worker_id) }}</td>
                <td>
                  <v-btn icon @click="editShift(shift)"><v-icon>mdi-pencil</v-icon></v-btn>
                  <v-btn icon @click="deleteShift(shift)"><v-icon>mdi-delete</v-icon></v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <!-- Shift Create/Edit Dialog -->
    <v-dialog v-model="showShiftDialog" max-width="500px">
      <v-card>
        <v-card-title>{{ shiftDialogTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="shiftForm" @submit.prevent="saveShift">
            <v-text-field v-model="shiftFormData.date" label="Date (YYYY-MM-DD)" required></v-text-field>
            <v-text-field v-model="shiftFormData.name" label="Shift Name" required></v-text-field>
            <v-text-field v-model="shiftFormData.start" label="Start Time" required></v-text-field>
            <v-text-field v-model="shiftFormData.end" label="End Time" required></v-text-field>
            <v-select v-model="shiftFormData.worker_id" :items="workers" item-text="name" item-value="id" label="Assign Worker" required></v-select>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="saveShift">Save</v-btn>
          <v-btn text @click="showShiftDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { ref, onMounted } from "vue";
import PositionUserServices from "../services/positionUserServices";
import PositionServices from "../services/positionServices";
import AreaServices from "../services/areaServices";
import UserServices from "../services/userServices";
import Utils from "../config/utils";

export default {
  name: "ManagerDashboard",
  setup() {
    const area = ref({ area_id: null, area_name: "" });
    const workers = ref([]);
    const areaPositions = ref([]);
    const schedule = ref([]);

    const showShiftDialog = ref(false);
    const shiftDialogTitle = ref("Add Shift");
    const shiftFormData = ref({ id: null, date: '', name: '', start: '', end: '', worker_id: null });
    let editingShiftIndex = null;

    const getWorkerName = (id) => {
      const w = workers.value.find(w => Number(w.user_id) === Number(id));
      return w ? w.fName + ' ' + w.lName : '';
    };

    const editShift = (shift) => {
      shiftDialogTitle.value = "Edit Shift";
      shiftFormData.value = { ...shift };
      editingShiftIndex = schedule.value.findIndex(s => s.id === shift.id);
      showShiftDialog.value = true;
    };
    const saveShift = () => {
      if (!shiftFormData.value.date || !shiftFormData.value.name || !shiftFormData.value.start || !shiftFormData.value.end || !shiftFormData.value.worker_id) return;
      if (shiftFormData.value.id) {
        // Edit existing
        if (editingShiftIndex !== null) {
          schedule.value[editingShiftIndex] = { ...shiftFormData.value };
        }
      } else {
        // Add new
        const newId = schedule.value.length ? Math.max(...schedule.value.map(s => s.id)) + 1 : 1;
        schedule.value.push({ ...shiftFormData.value, id: newId });
      }
      showShiftDialog.value = false;
      shiftFormData.value = { id: null, date: '', name: '', start: '', end: '', worker_id: null };
      editingShiftIndex = null;
      shiftDialogTitle.value = "Add Shift";
    };
    const deleteShift = (shift) => {
      schedule.value = schedule.value.filter(s => s.id !== shift.id);
    };

    // Fetch manager's area assignment
    const user = ref(Utils.getStore("user"));
    const fetchManagerArea = async () => {
      if (!user.value) return;
      try {
        const puRes = await PositionUserServices.getAll();
        const posRes = await PositionServices.getAll();
        const areaRes = await AreaServices.getAll();
        const userId = user.value.userId || user.value.user_id;
        // Find all position-user assignments for this user
        const userPositions = puRes.data.filter(pu => Number(pu.user_id) === Number(userId));
        // Find the first manager position
        const managerPosition = userPositions
          .map(up => posRes.data.find(p => Number(p.position_id) === Number(up.position_id) && p.is_manager))
          .find(Boolean);
        if (managerPosition && managerPosition.area_id) {
          const foundArea = areaRes.data.find(a => Number(a.area_id) === Number(managerPosition.area_id));
          if (foundArea) {
            area.value = foundArea;
            await fetchAreaWorkers(foundArea.area_id, posRes.data, puRes.data);
          }
        }
      } catch (e) {
        console.error("Error fetching manager area:", e);
      }
    };

    const fetchAreaWorkers = async (areaId, positions, positionUsers) => {
      try {
        // Get all positions for this area
        const areaPosFiltered = positions.filter(p => Number(p.area_id) === Number(areaId));
        areaPositions.value = areaPosFiltered;
        const areaPositionIds = areaPosFiltered.map(p => Number(p.position_id));
        // Get all user_ids assigned to those positions
        const userIds = [...new Set(
          positionUsers
            .filter(pu => areaPositionIds.includes(Number(pu.position_id)) && pu.is_active)
            .map(pu => Number(pu.user_id))
        )];
        // Fetch all users and filter to area workers
        const userRes = await UserServices.getAll();
        workers.value = userRes.data.filter(u => userIds.includes(Number(u.user_id)));
      } catch (e) {
        console.error("Error fetching area workers:", e);
      }
    };

    onMounted(() => {
      fetchManagerArea();
    });

    return {
      area,
      workers,
      areaPositions,
      schedule,
      getWorkerName,
      showShiftDialog,
      shiftDialogTitle,
      shiftFormData,
      editShift,
      saveShift,
      deleteShift,
      fetchAreaWorkers
    };
  }
};
</script>
