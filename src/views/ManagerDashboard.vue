<template>
  <v-container fluid class="pa-4">
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

    <v-row class="mb-4">
      <v-col cols="12">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
            <div class="d-flex align-center ga-3">
              <span class="text-h6 font-weight-bold">Schedule</span>
              <v-chip v-if="activeSchedule" :color="activeSchedule.status === 'live' ? 'primary' : 'brown'" variant="tonal">
                {{ activeSchedule.status === 'live' ? 'Live' : 'Created' }}
              </v-chip>
            </div>
            <div class="d-flex align-center ga-2">
              <v-btn color="primary" @click="openCreateScheduleDialog">
                <v-icon start>mdi-calendar-plus</v-icon>
                Create Schedule
              </v-btn>
              <v-btn
                v-if="activeSchedule && activeSchedule.status !== 'live'"
                color="info"
                variant="tonal"
                @click="setScheduleLive"
              >
                <v-icon start>mdi-broadcast</v-icon>
                Set Live
              </v-btn>
              <v-btn
                v-if="activeSchedule"
                color="error"
                variant="tonal"
                @click="showDeleteScheduleDialog = true"
              >
                <v-icon start>mdi-delete</v-icon>
                Delete Schedule
              </v-btn>
            </div>
          </div>

          <template v-if="areaSchedules.length > 0">
            <div class="d-flex flex-wrap align-center ga-3 mb-3">
              <v-select
                v-model="activeScheduleId"
                :items="areaSchedules"
                item-title="schedule_name"
                item-value="schedule_id"
                label="Active Schedule"
                density="comfortable"
                hide-details
                style="max-width: 360px"
              />

              <v-btn-toggle :model-value="calendarView" @update:model-value="calendarView = $event" mandatory color="primary" variant="outlined" density="comfortable">
                <v-btn value="week">Weekly</v-btn>
                <v-btn value="biweek">Bi-Weekly</v-btn>
                <v-btn value="month">Monthly</v-btn>
              </v-btn-toggle>

              <v-text-field
                v-model.number="defaultShiftHours"
                label="Default Shift (hrs)"
                type="number"
                :min="1"
                :max="18"
                density="comfortable"
                hide-details
                style="max-width: 140px"
              />
            </div>

            <div v-if="calendarView === 'biweek'" class="d-flex flex-column ga-4">
              <div>
                <p class="text-subtitle-2 mb-2">Week 1</p>
                <vue-cal
                  class="manager-calendar"
                  :events="calendarEvents"
                  :selected-date="calendarSelectedDate"
                  active-view="week"
                  :disable-views="['years', 'year', 'day']"
                  :drag-to-create-event="internalVuecalView !== 'month'"
                  :editable-events="internalVuecalView === 'month' ? calendarMonthEditConfig : calendarEditConfig"
                  :on-event-create="handleEventCreate"
                  :on-event-click="handleEventClick"
                  @event-drag-create="handleEventDragCreate"
                  @cell-click="handleCellClick"
                  @view-change="handleInternalViewChange"
                  :time-from="360"
                  :time-to="1380"
                  :time-step="30"
                  :snap-to-time="30"
                  events-on-month-view="short"
                />
              </div>

              <div>
                <p class="text-subtitle-2 mb-2">Week 2</p>
                <vue-cal
                  class="manager-calendar"
                  :events="calendarEvents"
                  :selected-date="biWeekSecondDate"
                  active-view="week"
                  :disable-views="['years', 'year', 'day']"
                  :drag-to-create-event="internalVuecalView !== 'month'"
                  :editable-events="internalVuecalView === 'month' ? calendarMonthEditConfig : calendarEditConfig"
                  :on-event-create="handleEventCreate"
                  :on-event-click="handleEventClick"
                  @event-drag-create="handleEventDragCreate"
                  @cell-click="handleCellClick"
                  @view-change="handleInternalViewChange"
                  :time-from="360"
                  :time-to="1380"
                  :time-step="30"
                  :snap-to-time="30"
                  events-on-month-view="short"
                />
              </div>
            </div>

            <div
              v-else-if="calendarView === 'month'"
            >
              <vue-cal
                class="manager-calendar month-only"
                :events="calendarEvents"
                :selected-date="calendarSelectedDate"
                active-view="month"
                :disable-views="['years', 'year', 'day', 'week']"
                :editable-events="calendarMonthEditConfig"
                :drag-to-create-event="false"
                :click-to-navigate="false"
                :dblclick-to-navigate="false"
                :on-event-click="handleEventClick"
                @cell-click="handleMonthCellClick"
                events-on-month-view="short"
              />
            </div>

            <vue-cal
              v-else
              class="manager-calendar"
              :events="calendarEvents"
              :selected-date="calendarSelectedDate"
              active-view="week"
              :disable-views="['years', 'year', 'day']"
              :drag-to-create-event="internalVuecalView !== 'month'"
              :editable-events="internalVuecalView === 'month' ? calendarMonthEditConfig : calendarEditConfig"
              :on-event-create="handleEventCreate"
              :on-event-click="handleEventClick"
              @event-drag-create="handleEventDragCreate"
              @cell-click="handleCellClick"
              @view-change="handleInternalViewChange"
              :time-from="360"
              :time-to="1380"
              :time-step="30"
              :snap-to-time="30"
              events-on-month-view="short"
            />
          </template>

          <template v-else>
            <div class="calendar-lock-wrapper">
              <div class="calendar-lock-blur">
                <vue-cal
                  class="manager-calendar"
                  :events="[]"
                  :selected-date="new Date()"
                  active-view="week"
                  :disable-views="['years', 'year', 'day']"
                  :time-from="360"
                  :time-to="1380"
                  :time-step="30"
                  :snap-to-time="30"
                  events-on-month-view="short"
                />
              </div>
              <div class="calendar-lock-overlay">
                <v-btn size="x-large" color="primary" @click="openCreateScheduleDialog">
                  <v-icon start>mdi-lock-open-variant</v-icon>
                  Create Schedule
                </v-btn>
              </div>
            </div>
          </template>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12" md="6">
        <v-card class="pa-2" elevation="2" style="max-height: 250px; overflow-y: auto;">
          <div class="d-flex align-center justify-space-between pa-2">
            <span class="text-h6 font-weight-bold">Workers</span>
            <v-btn color="primary" size="small" @click="openAddWorkerDialog">
              <v-icon start>mdi-plus</v-icon>
              Add Worker
            </v-btn>
          </div>
          <v-table density="compact">
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th class="text-center">Actions</th>
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
                <td class="text-center">
                  <v-btn icon size="small" variant="text" color="blue" @click="openEditWorkerDialog(worker)">
                    <v-icon size="20">mdi-pencil</v-icon>
                  </v-btn>
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>

      <v-col cols="12" md="6">
        <v-card class="pa-2" elevation="2" style="max-height: 250px; overflow-y: auto;">
          <div class="d-flex align-center justify-space-between pa-2">
            <span class="text-h6 font-weight-bold">Positions</span>
            <v-btn color="primary" size="small" @click="openPositionDialog">
              <v-icon start>mdi-plus</v-icon>
              Create Position
            </v-btn>
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

    <v-dialog v-model="showEditWorkerDialog" max-width="560px">
      <v-card v-if="editingWorker">
        <v-card-title class="pa-4" style="background-color: #80162B; color: white">
          <v-icon color="white" class="mr-2">mdi-account-edit</v-icon>
          Edit Worker: {{ editingWorker.fName }} {{ editingWorker.lName }}
        </v-card-title>
        <v-card-text class="pa-4">
          <p class="text-subtitle-2 mb-2">Current Positions</p>
          <div v-if="editingWorkerPositions.length === 0" class="text-grey text-body-2 mb-3">No positions assigned</div>
          <v-chip
            v-for="wp in editingWorkerPositions"
            :key="wp.position_user_id"
            class="mr-2 mb-2"
            closable
            color="primary"
            variant="tonal"
            @click:close="removeWorkerPosition(wp.position_user_id)"
          >
            {{ wp.position_name }}
          </v-chip>

          <v-divider class="my-4"></v-divider>

          <p class="text-subtitle-2 mb-2">Add Position</p>
          <div class="d-flex align-center ga-2">
            <v-select
              v-model="addPositionForWorkerId"
              :items="availablePositionsForWorker"
              item-title="position_name"
              item-value="position_id"
              label="Select Position"
              density="compact"
              hide-details
              :disabled="availablePositionsForWorker.length === 0"
              class="flex-grow-1"
            />
            <v-btn
              color="primary"
              size="small"
              :disabled="!addPositionForWorkerId"
              :loading="savingWorkerEdit"
              @click="addWorkerPosition"
            >
              <v-icon start>mdi-plus</v-icon>
              Add
            </v-btn>
          </div>
          <div v-if="availablePositionsForWorker.length === 0" class="text-caption text-grey mt-1">
            This worker is assigned to all positions in this area.
          </div>

          <v-alert v-if="editWorkerError" type="error" density="compact" class="mt-3">{{ editWorkerError }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-btn color="error" variant="tonal" @click="confirmRemoveWorker" :loading="savingWorkerEdit">
            <v-icon start>mdi-account-remove</v-icon>
            Remove from Area
          </v-btn>
          <v-spacer />
          <v-btn variant="text" @click="showEditWorkerDialog = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showRemoveWorkerConfirm" max-width="400px">
      <v-card>
        <v-card-title class="pa-4" style="background-color: #EE5044; color: white">
          <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>
          Remove Worker
        </v-card-title>
        <v-card-text class="pa-6 text-center" v-if="editingWorker">
          <p class="text-body-1">
            Remove <strong>{{ editingWorker.fName }} {{ editingWorker.lName }}</strong> from all positions in this area?
          </p>
          <p class="text-caption text-grey mt-2">This will unassign them from every position in this area.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showRemoveWorkerConfirm = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" :loading="savingWorkerEdit" @click="removeWorkerFromArea">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showCreateScheduleDialog" max-width="560px">
      <v-card>
        <v-card-title class="pa-4">Create Schedule</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="scheduleForm.schedule_name"
            label="Schedule Name"
            placeholder="e.g. Week 1 Draft"
            required
          />

          <v-select
            v-model="scheduleForm.schedule_type"
            :items="scheduleTypeOptions"
            item-title="label"
            item-value="value"
            label="Schedule Type"
            required
          />

          <v-text-field
            v-model="scheduleForm.start_date"
            label="Start Date"
            type="date"
            required
          />

          <v-text-field
            v-if="scheduleForm.schedule_type === 'custom'"
            v-model="scheduleForm.end_date"
            label="End Date"
            type="date"
            required
          />

          <v-alert v-if="scheduleError" type="error" density="compact" class="mt-2">{{ scheduleError }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showCreateScheduleDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingSchedule" @click="saveSchedule">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showShiftDialog" max-width="560px">
      <v-card>
        <v-card-title class="pa-4">{{ editingShiftId ? 'Edit Shift' : 'Create Shift' }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="shiftForm.shift_date"
            label="Shift Date"
            type="date"
            readonly
          />

          <div class="d-flex ga-3">
            <v-text-field
              v-model="shiftForm.start_time"
              label="Start Time"
              type="time"
              class="flex-grow-1"
              required
            />
            <v-text-field
              v-model="shiftForm.end_time"
              label="End Time"
              type="time"
              class="flex-grow-1"
              required
            />
          </div>

          <v-select
            v-model="shiftForm.position_id"
            :items="areaPositions"
            item-title="position_name"
            item-value="position_id"
            label="Position"
            required
          />

          <v-select
            v-model="shiftForm.user_id"
            :items="workerOptions"
            item-title="title"
            item-value="value"
            label="Assign Worker (optional)"
            clearable
          />

          <v-alert v-if="shiftError" type="error" density="compact" class="mt-2">{{ shiftError }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn
            v-if="editingShiftId"
            color="error"
            variant="tonal"
            :loading="savingShift"
            @click="removeShift"
          >
            Delete
          </v-btn>
          <v-btn variant="text" @click="showShiftDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingShift" @click="saveShift">
            {{ editingShiftId ? 'Save Changes' : 'Create Shift' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showPositionDialog" max-width="520px">
      <v-card>
        <v-card-title class="pa-4">
          <span class="text-h6">Create New Position</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="positionFormData.position_name"
            label="Position Name"
            placeholder="e.g. Cashier, Floor Supervisor"
            :rules="[v => !!v || 'Position name is required']"
            required
            autofocus
          />
          <v-select
            v-model="positionFormData.worker_ids"
            :items="allUsers"
            :item-title="u => `${u.fName} ${u.lName} (${u.email})`"
            item-value="user_id"
            label="Assign Workers (optional)"
            multiple
            chips
            closable-chips
            clearable
          />
          <v-alert v-if="positionError" type="error" class="mt-2" density="compact">{{ positionError }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn text @click="showPositionDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingPosition" @click="savePosition">Create</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showAddWorkerDialog" max-width="520px">
      <v-card>
        <v-card-title class="pa-4">
          <span class="text-h6">Add Worker by Email</span>
        </v-card-title>
        <v-card-text>
          <v-text-field
            v-model="addWorkerEmail"
            label="User Email"
            placeholder="Enter worker's email address"
            :rules="[v => !!v || 'Email is required']"
            required
            autofocus
          />
          <v-select
            v-model="addWorkerPositionId"
            :items="areaPositions"
            item-title="position_name"
            item-value="position_id"
            label="Assign to Position"
            required
          />
          <v-alert v-if="addWorkerError" type="error" class="mt-2" density="compact">{{ addWorkerError }}</v-alert>
          <v-alert v-if="addWorkerSuccess" type="success" class="mt-2" density="compact">{{ addWorkerSuccess }}</v-alert>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn text @click="showAddWorkerDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="savingWorker" @click="saveWorker">Add</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="showDeleteScheduleDialog" max-width="440px">
      <v-card>
        <v-card-title>Delete Schedule</v-card-title>
        <v-card-text>
          Are you sure you want to delete
          <strong>{{ activeSchedule?.schedule_name }}</strong>?
          This will also remove all shifts in this schedule. This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn text @click="showDeleteScheduleDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingSchedule" @click="deleteSchedule">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import VueCal from "vue-cal";
import "vue-cal/dist/vuecal.css";
import PositionUserServices from "../services/positionUserServices";
import PositionServices from "../services/positionServices";
import AreaServices from "../services/areaServices";
import UserServices from "../services/userServices";
import ScheduleServices from "../services/scheduleServices";
import ShiftServices from "../services/shiftServices";
import Utils from "../config/utils";

const SCHEDULE_TYPE_OPTIONS = [
  { label: "Custom Date Range", value: "custom" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-Weekly", value: "bi-weekly" },
];

export default {
  name: "ManagerDashboard",
  components: { VueCal },
  setup() {
    const user = ref(Utils.getStore("user"));
    const area = ref({ area_id: null, area_name: "" });
    const workers = ref([]);
    const areaPositions = ref([]);
    const allUsers = ref([]);

    const areaSchedules = ref([]);
    const activeScheduleId = ref(null);
    const shifts = ref([]);

    const calendarView = ref("week");
    const calendarSelectedDate = ref(new Date());

    const showCreateScheduleDialog = ref(false);
    const scheduleForm = ref({
      schedule_name: "",
      schedule_type: "weekly",
      start_date: "",
      end_date: "",
    });
    const savingSchedule = ref(false);
    const scheduleError = ref("");

    const showShiftDialog = ref(false);
    const shiftForm = ref({
      shift_date: "",
      start_time: "",
      end_time: "",
      position_id: null,
      user_id: null,
    });
    const editingShiftId = ref(null);
    const savingShift = ref(false);
    const shiftError = ref("");

    const showPositionDialog = ref(false);
    const positionFormData = ref({ position_name: "", worker_ids: [] });
    const savingPosition = ref(false);
    const positionError = ref("");

    const showAddWorkerDialog = ref(false);
    const addWorkerEmail = ref("");
    const addWorkerPositionId = ref(null);
    const addWorkerError = ref("");
    const addWorkerSuccess = ref("");
    const savingWorker = ref(false);

    const allPositionUsers = ref([]);
    const showEditWorkerDialog = ref(false);
    const showRemoveWorkerConfirm = ref(false);
    const editingWorker = ref(null);
    const editWorkerError = ref("");
    const savingWorkerEdit = ref(false);
    const addPositionForWorkerId = ref(null);

    const editingWorkerPositions = computed(() => {
      if (!editingWorker.value) return [];
      const areaPositionIds = areaPositions.value.map((p) => Number(p.position_id));
      return allPositionUsers.value
        .filter(
          (pu) =>
            Number(pu.user_id) === Number(editingWorker.value.user_id) &&
            areaPositionIds.includes(Number(pu.position_id))
        )
        .map((pu) => {
          const pos = areaPositions.value.find((p) => Number(p.position_id) === Number(pu.position_id));
          return {
            position_user_id: pu.position_user_id,
            position_id: pu.position_id,
            position_name: pos ? pos.position_name : "Unknown",
          };
        });
    });

    const availablePositionsForWorker = computed(() => {
      const assignedIds = editingWorkerPositions.value.map((wp) => Number(wp.position_id));
      return areaPositions.value.filter((p) => !assignedIds.includes(Number(p.position_id)));
    });

    const calendarEditConfig = {
      create: true,
      drag: false,
      resize: false,
      delete: false,
      title: false,
    };

    const calendarMonthEditConfig = {
      create: false,
      drag: false,
      resize: false,
      delete: false,
      title: false,
    };

    const pendingDeleteFn = ref(null);
    const defaultShiftHours = ref(8);
    const skipCellClick = ref(false);
    const cellClickBlockedUntil = ref(0);
    const internalVuecalView = ref('week');

    const activeSchedule = computed(() =>
      areaSchedules.value.find((s) => Number(s.schedule_id) === Number(activeScheduleId.value)) || null
    );

    const scheduleTypeOptions = computed(() => SCHEDULE_TYPE_OPTIONS);

    const biWeekSecondDate = computed(() => {
      const date = new Date(calendarSelectedDate.value || new Date());
      date.setDate(date.getDate() + 7);
      return date;
    });

    const toDateOnly = (value) => {
      if (!value) return "";
      if (typeof value === "string" && value.length >= 10) return value.slice(0, 10);
      const date = new Date(value);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    const toTimeOnly = (value) => {
      if (!value) return "";
      if (typeof value === "string" && value.length >= 5) return value.slice(0, 5);
      const date = new Date(value);
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${hours}:${minutes}`;
    };

    const toTimeWithSeconds = (value) => {
      if (!value) return "00:00:00";
      return value.length === 5 ? `${value}:00` : value.slice(0, 8);
    };

    const combineDateTime = (date, time) => new Date(`${date}T${toTimeWithSeconds(time)}`);

    const getWorkerLabel = (userId) => {
      if (!userId) return "Open";
      const worker = workers.value.find((w) => Number(w.user_id) === Number(userId));
      return worker ? `${worker.fName} ${worker.lName}` : "Assigned";
    };

    const getPositionLabel = (positionId) => {
      const position = areaPositions.value.find((p) => Number(p.position_id) === Number(positionId));
      return position ? position.position_name : "Shift";
    };

    const workerOptions = computed(() =>
      workers.value.map((w) => ({ title: `${w.fName} ${w.lName}`, value: w.user_id }))
    );

    const calendarEvents = computed(() => {
      if (!activeSchedule.value) return [];

      return shifts.value.map((shift) => {
        const date = toDateOnly(shift.shift_date);
        const start = toTimeOnly(shift.start_time);
        const end = toTimeOnly(shift.end_time);

        const eventClass =
          activeSchedule.value.status !== "live"
            ? "shift-draft"
            : shift.user_id
              ? "shift-live-covered"
              : "shift-live-open";

        return {
          start: combineDateTime(date, start),
          end: combineDateTime(date, end),
          title: `${getWorkerLabel(shift.user_id)}`,
          content: "",
          class: eventClass,
          shift_id: shift.shift_id,
        };
      });
    });

    const openCreateScheduleDialog = () => {
      const today = new Date();
      const start = toDateOnly(today);
      scheduleForm.value = {
        schedule_name: area.value.area_name ? `${area.value.area_name} Schedule` : "New Schedule",
        schedule_type: "weekly",
        start_date: start,
        end_date: "",
      };
      scheduleError.value = "";
      showCreateScheduleDialog.value = true;
    };

    const saveSchedule = async () => {
      if (!area.value.area_id) {
        scheduleError.value = "No area found for this manager.";
        return;
      }

      if (!scheduleForm.value.start_date) {
        scheduleError.value = "Start date is required.";
        return;
      }

      let endDate = scheduleForm.value.end_date;
      const startDateObj = new Date(scheduleForm.value.start_date);

      if (scheduleForm.value.schedule_type === "weekly") {
        const weeklyEnd = new Date(startDateObj);
        weeklyEnd.setDate(weeklyEnd.getDate() + 6);
        endDate = toDateOnly(weeklyEnd);
      }

      if (scheduleForm.value.schedule_type === "bi-weekly") {
        const biWeeklyEnd = new Date(startDateObj);
        biWeeklyEnd.setDate(biWeeklyEnd.getDate() + 13);
        endDate = toDateOnly(biWeeklyEnd);
      }

      if (!endDate) {
        scheduleError.value = "End date is required for custom schedules.";
        return;
      }

      if (new Date(scheduleForm.value.start_date) > new Date(endDate)) {
        scheduleError.value = "End date must be after start date.";
        return;
      }

      scheduleError.value = "";
      savingSchedule.value = true;

      try {
        const payload = {
          area_id: area.value.area_id,
          schedule_name: scheduleForm.value.schedule_name?.trim() || "Untitled Schedule",
          schedule_type: scheduleForm.value.schedule_type,
          start_date: scheduleForm.value.start_date,
          end_date: endDate,
          status: "draft",
        };

        const response = await ScheduleServices.create(payload);
        showCreateScheduleDialog.value = false;
        await fetchAreaSchedules(area.value.area_id);
        activeScheduleId.value = response?.data?.schedule_id || activeScheduleId.value;
      } catch (error) {
        scheduleError.value = error?.response?.data?.message || "Failed to create schedule.";
      } finally {
        savingSchedule.value = false;
      }
    };

    const setScheduleLive = async () => {
      if (!activeSchedule.value) return;

      try {
        await ScheduleServices.update(activeSchedule.value.schedule_id, { status: "live" });
        await fetchAreaSchedules(area.value.area_id);
      } catch (error) {
        console.error("Error setting schedule live:", error);
      }
    };

    const showDeleteScheduleDialog = ref(false);
    const deletingSchedule = ref(false);

    const deleteSchedule = async () => {
      if (!activeSchedule.value) return;
      deletingSchedule.value = true;
      try {
        await ScheduleServices.delete(activeSchedule.value.schedule_id);
        showDeleteScheduleDialog.value = false;
        activeScheduleId.value = null;
        await fetchAreaSchedules(area.value.area_id);
        if (areaSchedules.value.length > 0) {
          activeScheduleId.value = areaSchedules.value[0].schedule_id;
        }
      } catch (error) {
        console.error("Error deleting schedule:", error);
      } finally {
        deletingSchedule.value = false;
      }
    };

    const openShiftDialog = ({ shift = null, start = null, end = null } = {}) => {
      shiftError.value = "";

      if (shift) {
        editingShiftId.value = shift.shift_id;
        shiftForm.value = {
          shift_date: toDateOnly(shift.shift_date),
          start_time: toTimeOnly(shift.start_time),
          end_time: toTimeOnly(shift.end_time),
          position_id: shift.position_id,
          user_id: shift.user_id,
        };
      } else {
        editingShiftId.value = null;
        shiftForm.value = {
          shift_date: toDateOnly(start),
          start_time: toTimeOnly(start),
          end_time: toTimeOnly(end),
          position_id: areaPositions.value[0]?.position_id || null,
          user_id: null,
        };
      }

      showShiftDialog.value = true;
    };

    const handleEventCreate = (event, deleteEventFunction) => {
      if (!activeSchedule.value) return false;
      // Store the delete function — we'll use it after the drag finishes
      pendingDeleteFn.value = deleteEventFunction || null;
      // Return the event so the blue highlight stays visible during the drag
      return event;
    };

    const handleEventDragCreate = (event) => {
      if (!activeSchedule.value) return;
      // Flag so the cell-click that fires right after doesn't also open a dialog
      skipCellClick.value = true;
      setTimeout(() => { skipCellClick.value = false; }, 300);
      // Clean up the transient event vue-cal added
      if (pendingDeleteFn.value) {
        pendingDeleteFn.value();
        pendingDeleteFn.value = null;
      }
      // Open dialog with the final dragged start/end times
      openShiftDialog({ start: event.start, end: event.end });
    };

    const handleCellClick = (cellDate) => {
      // If the vue-cal instance is showing its internal month view, navigate instead of creating a shift
      if (internalVuecalView.value === 'month') {
        calendarSelectedDate.value = new Date(cellDate);
        return;
      }
      // Skip if we just handled a drag-create (both fire)
      if (skipCellClick.value) return;
      // Skip if blocked by a recent month→week navigation
      if (Date.now() < cellClickBlockedUntil.value) return;
      if (!activeSchedule.value) return;

      const start = new Date(cellDate);
      const end = new Date(start);
      end.setHours(end.getHours() + (defaultShiftHours.value || 8));
      // Clamp to 23:00 same day
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 0, 0, 0);
      if (end > endOfDay) end.setTime(endOfDay.getTime());

      openShiftDialog({ start, end });
    };

    const handleMonthCellClick = (cellDate) => {
      calendarSelectedDate.value = new Date(cellDate);
      cellClickBlockedUntil.value = Date.now() + 600;
      nextTick(() => { calendarView.value = 'week'; });
    };

    const handleInternalViewChange = (viewInfo) => {
      internalVuecalView.value = viewInfo.view || 'week';
    };

    const handleEventClick = (eventData) => {
      const clickedEvent = eventData?.event || eventData;
      const shiftId = clickedEvent?.shift_id;
      if (!shiftId) return;

      const shift = shifts.value.find((item) => Number(item.shift_id) === Number(shiftId));
      if (shift) openShiftDialog({ shift });
    };

    const saveShift = async () => {
      if (!activeSchedule.value) {
        shiftError.value = "Create a schedule before adding shifts.";
        return;
      }

      if (!shiftForm.value.shift_date || !shiftForm.value.start_time || !shiftForm.value.end_time || !shiftForm.value.position_id) {
        shiftError.value = "Date, time range, and position are required.";
        return;
      }

      if (shiftForm.value.start_time >= shiftForm.value.end_time) {
        shiftError.value = "End time must be after start time.";
        return;
      }

      const currentUserId = user.value?.userId || user.value?.user_id;
      if (!currentUserId) {
        shiftError.value = "Unable to determine current user.";
        return;
      }

      savingShift.value = true;
      shiftError.value = "";

      const payload = {
        schedule_id: activeSchedule.value.schedule_id,
        position_id: shiftForm.value.position_id,
        user_id: shiftForm.value.user_id || null,
        shift_date: shiftForm.value.shift_date,
        start_time: toTimeWithSeconds(shiftForm.value.start_time),
        end_time: toTimeWithSeconds(shiftForm.value.end_time),
        is_open: !shiftForm.value.user_id,
        created_by: currentUserId,
      };

      try {
        if (editingShiftId.value) {
          await ShiftServices.update(editingShiftId.value, payload);
        } else {
          await ShiftServices.create(payload);
        }
        showShiftDialog.value = false;
        await fetchShifts(activeSchedule.value.schedule_id);
      } catch (error) {
        shiftError.value = error?.response?.data?.message || "Failed to save shift.";
      } finally {
        savingShift.value = false;
      }
    };

    const removeShift = async () => {
      if (!editingShiftId.value) return;

      savingShift.value = true;
      try {
        await ShiftServices.delete(editingShiftId.value);
        showShiftDialog.value = false;
        await fetchShifts(activeSchedule.value.schedule_id);
      } catch (error) {
        shiftError.value = error?.response?.data?.message || "Failed to delete shift.";
      } finally {
        savingShift.value = false;
      }
    };

    const openEditWorkerDialog = (worker) => {
      editingWorker.value = { ...worker };
      addPositionForWorkerId.value = null;
      editWorkerError.value = "";
      showEditWorkerDialog.value = true;
    };

    const addWorkerPosition = async () => {
      if (!addPositionForWorkerId.value || !editingWorker.value) return;
      savingWorkerEdit.value = true;
      editWorkerError.value = "";
      try {
        await PositionUserServices.create({
          position_id: addPositionForWorkerId.value,
          user_id: editingWorker.value.user_id,
          is_active: true,
        });
        addPositionForWorkerId.value = null;
        const puRes = await PositionUserServices.getAll();
        allPositionUsers.value = puRes.data;
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        editWorkerError.value = error?.response?.data?.message || "Failed to add position.";
      } finally {
        savingWorkerEdit.value = false;
      }
    };

    const removeWorkerPosition = async (positionUserId) => {
      savingWorkerEdit.value = true;
      editWorkerError.value = "";
      try {
        await PositionUserServices.delete(positionUserId);
        const puRes = await PositionUserServices.getAll();
        allPositionUsers.value = puRes.data;
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        editWorkerError.value = error?.response?.data?.message || "Failed to remove position.";
      } finally {
        savingWorkerEdit.value = false;
      }
    };

    const confirmRemoveWorker = () => {
      showRemoveWorkerConfirm.value = true;
    };

    const removeWorkerFromArea = async () => {
      if (!editingWorker.value) return;
      savingWorkerEdit.value = true;
      editWorkerError.value = "";
      try {
        const toDelete = editingWorkerPositions.value;
        for (const wp of toDelete) {
          await PositionUserServices.delete(wp.position_user_id);
        }
        showRemoveWorkerConfirm.value = false;
        showEditWorkerDialog.value = false;
        editingWorker.value = null;
        const puRes = await PositionUserServices.getAll();
        allPositionUsers.value = puRes.data;
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        editWorkerError.value = error?.response?.data?.message || "Failed to remove worker.";
      } finally {
        savingWorkerEdit.value = false;
      }
    };

    const openAddWorkerDialog = () => {
      addWorkerEmail.value = "";
      addWorkerPositionId.value = areaPositions.value[0]?.position_id || null;
      addWorkerError.value = "";
      addWorkerSuccess.value = "";
      showAddWorkerDialog.value = true;
    };

    const saveWorker = async () => {
      addWorkerError.value = "";
      addWorkerSuccess.value = "";

      if (!addWorkerEmail.value.trim()) {
        addWorkerError.value = "Email is required.";
        return;
      }
      if (!addWorkerPositionId.value) {
        addWorkerError.value = "Please select a position.";
        return;
      }

      savingWorker.value = true;
      try {
        const usersRes = await UserServices.getAll();
        const matchedUser = usersRes.data.find(
          (u) => u.email.toLowerCase() === addWorkerEmail.value.trim().toLowerCase()
        );

        if (!matchedUser) {
          addWorkerError.value = "No user found with that email address.";
          return;
        }

        const existingPu = await PositionUserServices.getAll();
        const alreadyAssigned = existingPu.data.some(
          (pu) =>
            Number(pu.user_id) === Number(matchedUser.user_id) &&
            Number(pu.position_id) === Number(addWorkerPositionId.value)
        );

        if (alreadyAssigned) {
          addWorkerError.value = "This user is already assigned to that position.";
          return;
        }

        await PositionUserServices.create({
          position_id: addWorkerPositionId.value,
          user_id: matchedUser.user_id,
          is_active: true,
        });

        addWorkerSuccess.value = `${matchedUser.fName} ${matchedUser.lName} has been added.`;
        addWorkerEmail.value = "";

        const puRes = await PositionUserServices.getAll();
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        addWorkerError.value = error?.response?.data?.message || "Failed to add worker.";
      } finally {
        savingWorker.value = false;
      }
    };

    const openPositionDialog = () => {
      positionFormData.value = { position_name: "", worker_ids: [] };
      positionError.value = "";
      showPositionDialog.value = true;
    };

    const savePosition = async () => {
      if (!positionFormData.value.position_name.trim()) {
        positionError.value = "Position name is required.";
        return;
      }
      if (!area.value.area_id) {
        positionError.value = "No area found for this manager.";
        return;
      }
      savingPosition.value = true;
      positionError.value = "";
      try {
        const posRes = await PositionServices.create({
          area_id: area.value.area_id,
          position_name: positionFormData.value.position_name.trim(),
          is_manager: false,
        });
        const newPositionId = posRes.data.position_id;

        for (const userId of positionFormData.value.worker_ids) {
          await PositionUserServices.create({
            position_id: newPositionId,
            user_id: userId,
            is_active: true,
          });
        }

        showPositionDialog.value = false;
        const puRes = await PositionUserServices.getAll();
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        positionError.value = error?.response?.data?.message || "Failed to create position. Please try again.";
      } finally {
        savingPosition.value = false;
      }
    };

    const fetchShifts = async (scheduleId) => {
      if (!scheduleId) {
        shifts.value = [];
        return;
      }

      try {
        const response = await ShiftServices.getBySchedule(scheduleId);
        shifts.value = response.data || [];
      } catch (error) {
        shifts.value = [];
        console.error("Error fetching shifts:", error);
      }
    };

    const fetchAreaSchedules = async (areaId) => {
      if (!areaId) return;
      try {
        const response = await ScheduleServices.getByArea(areaId);
        const list = response.data || [];

        areaSchedules.value = list
          .map((schedule) => ({
            ...schedule,
            schedule_name: schedule.schedule_name || `Schedule ${schedule.schedule_id}`,
          }))
          .sort((a, b) => Number(b.schedule_id) - Number(a.schedule_id));

        if (areaSchedules.value.length === 0) {
          activeScheduleId.value = null;
          shifts.value = [];
          return;
        }

        const preferred = areaSchedules.value.find((s) => s.status === "live") || areaSchedules.value[0];
        activeScheduleId.value = preferred.schedule_id;
      } catch (error) {
        areaSchedules.value = [];
        activeScheduleId.value = null;
        shifts.value = [];
        console.error("Error fetching schedules:", error);
      }
    };

    const fetchAreaWorkers = async (areaId, positions, positionUsers) => {
      try {
        const areaPosFiltered = positions.filter((p) => Number(p.area_id) === Number(areaId));
        areaPositions.value = areaPosFiltered;
        allPositionUsers.value = positionUsers;

        const areaPositionIds = areaPosFiltered.map((p) => Number(p.position_id));
        const userIds = [
          ...new Set(
            positionUsers
              .filter((pu) => areaPositionIds.includes(Number(pu.position_id)) && pu.is_active)
              .map((pu) => Number(pu.user_id))
          ),
        ];

        const userRes = await UserServices.getAll();
        allUsers.value = userRes.data;
        workers.value = userRes.data.filter((u) => userIds.includes(Number(u.user_id)));
      } catch (error) {
        console.error("Error fetching area workers:", error);
      }
    };

    const fetchManagerArea = async () => {
      if (!user.value) return;
      try {
        const puRes = await PositionUserServices.getAll();
        const posRes = await PositionServices.getAll();
        const areaRes = await AreaServices.getAll();

        const userId = user.value.userId || user.value.user_id;
        const userPositions = puRes.data.filter((pu) => Number(pu.user_id) === Number(userId));

        const managerPosition = userPositions
          .map((up) => posRes.data.find((p) => Number(p.position_id) === Number(up.position_id) && p.is_manager))
          .find(Boolean);

        if (managerPosition && managerPosition.area_id) {
          const foundArea = areaRes.data.find((a) => Number(a.area_id) === Number(managerPosition.area_id));
          if (foundArea) {
            area.value = foundArea;
            await fetchAreaWorkers(foundArea.area_id, posRes.data, puRes.data);
            await fetchAreaSchedules(foundArea.area_id);
          }
        }
      } catch (error) {
        console.error("Error fetching manager area:", error);
      }
    };

    watch(activeScheduleId, async (scheduleId) => {
      if (!scheduleId) {
        shifts.value = [];
        return;
      }

      const selected = areaSchedules.value.find((s) => Number(s.schedule_id) === Number(scheduleId));
      if (selected?.start_date) {
        calendarSelectedDate.value = new Date(selected.start_date);
      }

      await fetchShifts(scheduleId);
    });

    onMounted(() => {
      fetchManagerArea();
    });

    return {
      area,
      workers,
      areaPositions,
      allUsers,
      areaSchedules,
      activeSchedule,
      activeScheduleId,
      calendarView,
      calendarSelectedDate,
      biWeekSecondDate,
      calendarEvents,
      calendarEditConfig,
      workerOptions,
      showCreateScheduleDialog,
      scheduleForm,
      scheduleTypeOptions,
      savingSchedule,
      scheduleError,
      openCreateScheduleDialog,
      saveSchedule,
      setScheduleLive,
      showDeleteScheduleDialog,
      deletingSchedule,
      deleteSchedule,
      showShiftDialog,
      shiftForm,
      editingShiftId,
      savingShift,
      shiftError,
      handleEventCreate,
      handleEventDragCreate,
      handleEventClick,
      handleCellClick,
      handleMonthCellClick,
      handleInternalViewChange,
      internalVuecalView,
      calendarMonthEditConfig,
      defaultShiftHours,
      saveShift,
      removeShift,
      showPositionDialog,
      positionFormData,
      savingPosition,
      positionError,
      openPositionDialog,
      savePosition,
      showAddWorkerDialog,
      addWorkerEmail,
      addWorkerPositionId,
      addWorkerError,
      addWorkerSuccess,
      savingWorker,
      openAddWorkerDialog,
      saveWorker,
      showEditWorkerDialog,
      showRemoveWorkerConfirm,
      editingWorker,
      editingWorkerPositions,
      availablePositionsForWorker,
      editWorkerError,
      savingWorkerEdit,
      addPositionForWorkerId,
      openEditWorkerDialog,
      addWorkerPosition,
      removeWorkerPosition,
      confirmRemoveWorker,
      removeWorkerFromArea,
    };
  },
};
</script>

<style scoped>
.manager-calendar {
  height: 620px;
}

.calendar-lock-wrapper {
  position: relative;
}

.calendar-lock-blur {
  filter: blur(4px);
  pointer-events: none;
  opacity: 0.85;
}

.calendar-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.vuecal__event.shift-draft) {
  background-color: #795548;
  border-color: #795548;
  color: #ffffff;
}

:deep(.vuecal__event.shift-live-open) {
  background-color: #1976d2;
  border-color: #1976d2;
  color: #ffffff;
}

:deep(.vuecal__event.shift-live-covered) {
  background-color: #4caf50;
  border-color: #4caf50;
  color: #ffffff;
}

/* Bright highlight for drag-to-create transient event */
:deep(.manager-calendar .vuecal__event:not(.shift-draft):not(.shift-live-open):not(.shift-live-covered)) {
  background-color: rgba(66, 165, 245, 0.5) !important;
  border: 2px solid #1e88e5 !important;
  color: #0d47a1 !important;
}

:deep(.manager-calendar.vuecal--drag-creating-event) {
  cursor: ns-resize;
}
</style>
