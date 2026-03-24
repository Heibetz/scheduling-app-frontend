<script setup>
import {ref, onMounted, computed} from 'vue';
import Utils from '../config/utils';
import ShiftServices from '../services/shiftServices';
import TaskServices from '../services/taskServices';
import TaskListItemServices from '../services/taskListItemServices';
import TaskListItemStatusServices from '../services/taskListItemStatusServices';

const USE_MOCK_DATA = true; // set to false later to use backend data

const user = ref(Utils.getStore("user"));
const loading = ref(false);
const error = ref("");
const shifts = ref([]);

const mockShifts = [
  {
    shift_id: 1,
    shift_date: "2026-03-02",
    start_time: "09:00:00",
    end_time: "13:00:00",
    status: "confirmed",
  },
  
  {
    shift_id: 3,
    shift_date: "2026-03-03",
    start_time: "10:00:00",
    end_time: "14:00:00",
    status: "confirmed",
  },
  {
    shift_id: 4,
    shift_date: "2026-03-05",
    start_time: "09:00:00",
    end_time: "12:00:00",
    status: "confirmed",
  },
  {
    shift_id: 5,
    shift_date: "2026-03-09",
    start_time: "11:00:00",
    end_time: "15:00:00",
    status: "pending",
  },
];

const timeSlots = [
    "8:00", "9:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00",
];

const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
};
const calendarStart = computed(() => {
    const monday = getMonday(new Date());
    monday.setHours(0, 0, 0, 0);
    return monday;
});
const twoWeeksDates = computed(() => {
    const start = new Date(calendarStart.value);
    const out = [];
    for (let i = 0; i < 14; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        out.push(d);
    }
    return out;
});
const weekRows = computed(() => {
    const days = twoWeeksDates.value;
    return [days.slice(0, 7), days.slice(7)];
});
function toDateKey(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
function formatTime(t) {
    if (!t) {
        return "-";
    }
    const parts = String(t).split(":");
    const h = parseInt(parts[0], 10);
    const m = parts[1] || "00";
    const ampm = h >= 12 ? "PM" : "AM";
    const hour = ((h + 11) % 12) + 1;
    return `${hour}:${m} ${ampm}`;
}
function shiftsForDay(date) {
    const key = toDateKey(date);
    return shifts.value.filter((s) => {
        const d = s.shift_date;
        if (!d){
            return false;
        }
        const sKey = typeof d === "string" ? d.slice(0, 10) : toDateKey(new Date(d));
        return sKey === key;
    });
}


const fetchShifts = () => {
    loading.value = true;
    error.value = "";

    // Demo mode: use hard-coded shifts but keep same shape as backend
    if (USE_MOCK_DATA) {
        shifts.value = mockShifts;
        loading.value = false;
        return;
    }

    if (!user.value || !user.value.userId) {
        error.value = "Not logged in.";
        loading.value = false;
        return;
    }

    ShiftServices.getAll({
        user_id: user.value.userId,
    })
    .then((res) => {
        shifts.value = res.data || [];
    })
    .catch((err) => {
        console.error("Error fetching shifts", err);
        error.value = "Could not load shifts.";
        shifts.value = [];
    })
    .finally(() => {
        loading.value = false;
    });
};

// ─── Shift Detail Dialog (task checklist) ───
const showShiftDetail = ref(false);
const selectedShift = ref(null);
const shiftTaskLists = ref([]);
const shiftTaskItems = ref({});
const shiftItemStatuses = ref({});
const loadingDetail = ref(false);

const openShiftDetail = async (shift) => {
  selectedShift.value = shift;
  showShiftDetail.value = true;
  loadingDetail.value = true;
  shiftTaskLists.value = [];
  shiftTaskItems.value = {};
  shiftItemStatuses.value = {};

  try {
    // Get task lists assigned to this shift
    const stRes = await TaskServices.getShiftTasks({ shift_id: shift.shift_id });
    const shiftTasks = stRes.data || [];

    if (shiftTasks.length === 0) {
      loadingDetail.value = false;
      return;
    }

    // Get the task list details
    const taskIds = shiftTasks.map((st) => st.task_id);
    const allTasksRes = await TaskServices.getAll();
    const allTasks = allTasksRes.data || [];
    shiftTaskLists.value = allTasks.filter((t) => taskIds.includes(t.task_id));

    // Get items for each task list
    const itemsMap = {};
    for (const taskId of taskIds) {
      const res = await TaskListItemServices.getAll({ task_id: taskId });
      itemsMap[taskId] = res.data || [];
    }
    shiftTaskItems.value = itemsMap;

    // Get completion statuses for this shift
    const statusRes = await TaskListItemStatusServices.getAll({ shift_id: shift.shift_id });
    const statuses = statusRes.data || [];
    const statusMap = {};
    for (const s of statuses) {
      statusMap[s.task_list_item_id] = s;
    }
    shiftItemStatuses.value = statusMap;
  } catch (e) {
    console.error("Error loading shift tasks:", e);
  } finally {
    loadingDetail.value = false;
  }
};

const isItemCompleted = (itemId) => {
  const status = shiftItemStatuses.value[itemId];
  return status ? status.is_completed : false;
};

const toggleItemCompletion = async (item) => {
  if (!selectedShift.value) return;
  const shiftId = selectedShift.value.shift_id;
  const itemId = item.task_list_item_id;
  const existing = shiftItemStatuses.value[itemId];

  try {
    if (existing) {
      const newCompleted = !existing.is_completed;
      await TaskListItemStatusServices.update(existing.task_list_item_status_id, {
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      });
      shiftItemStatuses.value = {
        ...shiftItemStatuses.value,
        [itemId]: { ...existing, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null },
      };
    } else {
      const res = await TaskListItemStatusServices.create({
        shift_id: shiftId,
        task_list_item_id: itemId,
        is_completed: true,
        completed_at: new Date().toISOString(),
      });
      shiftItemStatuses.value = {
        ...shiftItemStatuses.value,
        [itemId]: res.data,
      };
    }
  } catch (e) {
    console.error("Error toggling task completion:", e);
  }
};

const taskListProgress = (taskId) => {
  const items = shiftTaskItems.value[taskId] || [];
  if (items.length === 0) return { completed: 0, total: 0 };
  const completed = items.filter((i) => isItemCompleted(i.task_list_item_id)).length;
  return { completed, total: items.length };
};

onMounted(() => {
    fetchShifts();
});
</script>

<template>
    <v-container fluid class="pa-4">
        <div class="d-flex justify-space-between align-center mb-4">
  <div>
    <h1 class="text-h4 font-weight-bold mb-1">My Schedule</h1>
    <p class="text-subtitle-1 text-grey-darken-1 mb-1">
      Two week view
    </p>
    <p class="text-body-2 text-grey-darken-1 mb-0">
      You have {{ shifts.length }} shift{{ shifts.length === 1 ? '' : 's' }} scheduled in this period.
    </p>
  </div>

  <v-btn color="primary" @click="fetchShifts" :loading="loading">
    Refresh
  </v-btn>
</div>

<v-alert v-if="error" type="error" variant="tonal" class="mb-4" dismissible>
  {{ error }}
</v-alert>
        <v-card v-if="loading" class="pa-8 text-center">
            <v-progress-circular indeterminate></v-progress-circular>
        </v-card>
        <v-card v-else variant="outlined" class="pa-4">
            <div class="week-section" v-for="(week, weekIndex) in weekRows" :key="weekIndex">
            <div class="d-flex align-center mb-2">
                <h3 class="text-subtitle-1 font-weight-medium">{{ weekIndex === 0 ? 'This Week' : 'Next Week' }}</h3>
                <v-divider class="ml-3 flex-grow-1"></v-divider>
            </div>

        <div class="week-row">
            <div v-for="day in week" :key="day.toISOString()" class="calendar-day-column">
                <div class="text-center mb-2">
                    <div class="text-caption text-grey-darken-1"> {{ day.toLocaleDateString("en-US", { weekday: "short" }) }}</div>
                    <div class="text-subtitle-2 font-weight-bold">{{ day.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) }}</div>
                </div>

                <div class="calendar-day-shifts">
                    <div v-for="s in shiftsForDay(day)" :key="s.shift_id" class="shift-card" :class="s.status === 'confirmed' ? 'shift-confirmed' : 'shift-pending'" style="cursor:pointer" @click="openShiftDetail(s)">
                    <div class="shift-time">{{ formatTime(s.start_time) }} – {{ formatTime(s.end_time) }}</div>
                    <div class="shift-meta">Front Desk · Main Office</div>
                    <v-chip size="x-small" class="mt-1" :color="s.status === 'confirmed' ? 'black' : 'grey'" :variant="s.status === 'confirmed' ? 'flat' : 'outlined'">
                        {{ s.status || "—" }}
                    </v-chip>
                    </div>
                </div>
            </div>
        </div>
        </div>
        </v-card>

    <!-- Shift Detail Dialog with Task Checklist -->
    <v-dialog v-model="showShiftDetail" max-width="600px">
      <v-card v-if="selectedShift">
        <v-card-title class="pa-4">
          <span class="text-h6">Shift Details</span>
        </v-card-title>
        <v-card-text>
          <div class="d-flex align-center ga-4 mb-4">
            <v-icon color="primary">mdi-clock-outline</v-icon>
            <div>
              <div class="font-weight-medium">{{ formatTime(selectedShift.start_time) }} – {{ formatTime(selectedShift.end_time) }}</div>
              <div class="text-caption text-grey">{{ selectedShift.shift_date }}</div>
            </div>
          </div>

          <v-divider class="mb-4" />

          <div v-if="loadingDetail" class="text-center py-4">
            <v-progress-circular indeterminate size="32" />
          </div>

          <div v-else-if="shiftTaskLists.length === 0" class="text-center text-grey py-4">
            No task lists assigned to this shift.
          </div>

          <div v-else>
            <div class="text-subtitle-2 mb-2">Your Task Lists</div>
            <v-expansion-panels variant="accordion">
              <v-expansion-panel v-for="tl in shiftTaskLists" :key="tl.task_id">
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <span class="font-weight-medium">{{ tl.task_name }}</span>
                    <v-chip
                      size="x-small"
                      :color="taskListProgress(tl.task_id).completed === taskListProgress(tl.task_id).total && taskListProgress(tl.task_id).total > 0 ? 'success' : 'default'"
                      variant="tonal"
                      class="mr-2"
                    >
                      {{ taskListProgress(tl.task_id).completed }}/{{ taskListProgress(tl.task_id).total }}
                    </v-chip>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <div v-if="tl.description" class="text-caption text-grey mb-2">{{ tl.description }}</div>
                  <v-list density="compact" class="pa-0">
                    <v-list-item
                      v-for="item in (shiftTaskItems[tl.task_id] || [])"
                      :key="item.task_list_item_id"
                    >
                      <template #prepend>
                        <v-icon size="small" color="grey">mdi-circle-small</v-icon>
                      </template>
                      <v-list-item-title>
                        {{ item.description || 'No description' }}
                      </v-list-item-title>
                    </v-list-item>
                  </v-list>
                  <div v-if="(shiftTaskItems[tl.task_id] || []).length === 0" class="text-grey text-caption">No tasks in this list.</div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showShiftDetail = false">Close</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    </v-container>
</template>
<style scoped>
.week-row:last-child {
  border-bottom: none;
}
.calendar-day-column {
  border-right: 1px solid #e0e0e0;
  padding: 8px;
}

.calendar-day-column:last-child {
  border-right: none;
}
.shift-block {
  font-size: 12px;
}
.shift-confirmed {
  background-color: #e0e0e0;
}
.shift-pending {
  background-color: #e3f2fd;
}
.week-section {
  margin-bottom: 16px;
}

.week-row {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
}

.calendar-day-column {
  border-radius: 8px;
  border: 1px solid #e0e0e0;
  background-color: #fafafa;
  padding: 8px;
}

.shift-card {
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 6px;
  margin-bottom: 4px;
}

.shift-confirmed {
  background-color: #e0e0e0;
}

.shift-pending {
  background-color: #e3f2fd;
}

.shift-time {
  font-weight: 600;
}

.shift-meta {
  font-size: 11px;
  color: #616161;
}
.schedule-card {
  max-height: 480px;      /* adjust until both weeks fit visually */
  overflow-y: auto;       /* only the inside of the card scrolls */
}
.week-section h3 {
  white-space: nowrap;
}
</style>