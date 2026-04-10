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
        <v-btn color="secondary" @click="openAreaTasksDialog">
          <v-icon class="mr-2">mdi-checkbox-marked-outline</v-icon>
          Task Lists
        </v-btn>
      </v-col>
    </v-row>

    <v-row class="mb-4">
      <v-col cols="12">
        <v-card class="pa-4" elevation="2">

          <!-- ═══ OVERVIEW MODE: monthly calendar showing all schedules ═══ -->
          <template v-if="viewMode === 'overview'">
            <div class="d-flex align-center justify-space-between ga-3 mb-3">
              <span class="text-h6 font-weight-bold">Schedules</span>
              <v-btn color="primary" @click="openCreateScheduleDialog">
                <v-icon start>mdi-calendar-plus</v-icon>
                Create Schedule
              </v-btn>
            </div>

            <div v-if="areaSchedules.length === 0" class="text-center text-grey pa-8">
              <v-icon size="48" color="grey-lighten-1" class="mb-3">mdi-calendar-blank-outline</v-icon>
              <p class="text-body-1">No schedules yet. Create one to get started.</p>
            </div>

            <vue-cal
              v-else
              class="overview-calendar"
              :events="overviewEvents"
              :selected-date="overviewSelectedDate"
              active-view="month"
              :twelve-hour="true"
              :disable-views="['years', 'year', 'week', 'day']"
              :time="false"
              events-on-month-view="short"
              :on-event-click="handleOverviewEventClick"
              :editable-events="{ create: false, drag: false, resize: false, delete: false, title: false }"
            />
          </template>

          <!-- ═══ SCHEDULE MODE: weekly shift editor for a single schedule ═══ -->
          <template v-else>
            <div class="d-flex flex-wrap align-center justify-space-between ga-3 mb-3">
              <div class="d-flex align-center ga-3">
                <v-btn variant="text" size="small" @click="backToOverview">
                  <v-icon start>mdi-arrow-left</v-icon>
                  Back
                </v-btn>
                <v-text-field
                  v-if="editingScheduleName !== null"
                  v-model="editingScheduleName"
                  density="compact"
                  hide-details
                  variant="underlined"
                  class="font-weight-bold text-h6"
                  style="min-width: 300px; max-width: 400px"
                  autofocus
                  @blur="saveScheduleName"
                  @keyup.enter="$event.target.blur()"
                />
                <span
                  v-else
                  class="text-h6 font-weight-bold"
                  style="cursor: pointer"
                  @click="editingScheduleName = activeSchedule?.schedule_name || ''"
                >
                  {{ activeSchedule?.schedule_name }}
                  <v-icon size="16" class="ml-1" color="grey">mdi-pencil</v-icon>
                </span>
                <v-chip v-if="activeSchedule" :color="activeSchedule.status === 'live' ? 'primary' : 'brown'" variant="tonal">
                  {{ activeSchedule.status === 'live' ? 'Live' : 'Draft' }}
                </v-chip>
              </div>
              <div class="d-flex align-center ga-2">
                <v-btn
                  v-if="activeSchedule && activeSchedule.status !== 'live'"
                  color="info"
                  variant="tonal"
                  @click="showGoLiveDialog = true"
                >
                  <v-icon start>mdi-broadcast</v-icon>
                  Go Live
                </v-btn>
                <v-btn
                  v-if="activeSchedule"
                  color="error"
                  variant="tonal"
                  @click="showDeleteScheduleDialog = true"
                >
                  <v-icon start>mdi-delete</v-icon>
                  Delete
                </v-btn>
              </div>
            </div>

            <div class="d-flex flex-wrap align-center ga-3 mb-3">
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

            <div class="d-flex align-center justify-center ga-3 mb-2">
              <v-btn
                size="small"
                variant="tonal"
                :disabled="!canGoPrev"
                @click="goToPrevWeek"
              >
                <v-icon start>mdi-chevron-left</v-icon>
                Prev Week
              </v-btn>
              <span class="text-subtitle-1 font-weight-bold">
                {{ currentWeekLabel }}
              </span>
              <v-btn
                size="small"
                variant="tonal"
                :disabled="!canGoNext"
                @click="goToNextWeek"
              >
                Next Week
                <v-icon end>mdi-chevron-right</v-icon>
              </v-btn>
            </div>

            <vue-cal
              class="manager-calendar hide-nav-arrows"
              :events="calendarEvents"
              :selected-date="calendarSelectedDate"
              active-view="week"
              :twelve-hour="true"
              :disable-views="['years', 'year', 'month', 'day']"
              :drag-to-create-event="true"
              :editable-events="calendarEditConfig"
              :on-event-create="handleEventCreate"
              :on-event-click="handleEventClick"
              @event-drag-create="handleEventDragCreate"
              @cell-click="handleCellClick"
              @view-change="handleInternalViewChange"
              :time-from="360"
              :time-to="1200"
              :time-step="60"
              :snap-to-time="60"
            />
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
                <th class="text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="areaPositions.length === 0">
                <td colspan="3" class="text-center text-grey">No positions found for this area</td>
              </tr>
              <tr v-for="pos in areaPositions" :key="pos.position_id">
                <td>{{ pos.position_name }}</td>
                <td>{{ pos.is_manager ? 'Yes' : 'No' }}</td>
                <td class="text-center">
                  <v-btn
                    v-if="!pos.is_manager"
                    icon
                    size="small"
                    variant="text"
                    color="error"
                    @click="confirmDeletePosition(pos)"
                  >
                    <v-icon size="20">mdi-delete</v-icon>
                  </v-btn>
                </td>
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

          <!-- Assigned Task Lists Section -->
          <div class="mt-4">
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-2">Assigned Task Lists</span>
              <v-btn
                v-if="shiftAssignedTasks.length > 0"
                size="small"
                variant="tonal"
                color="info"
                @click="showShiftTaskDetails = !showShiftTaskDetails"
              >
                <v-icon start>{{ showShiftTaskDetails ? 'mdi-chevron-up' : 'mdi-eye' }}</v-icon>
                {{ showShiftTaskDetails ? 'Hide Details' : 'View Tasks' }}
              </v-btn>
            </div>
            <v-chip-group v-if="shiftAssignedTasks.length > 0" class="mb-2">
              <v-chip
                v-for="st in shiftAssignedTasks"
                :key="st.shift_task_id || st.task_id"
                closable
                @click:close="unassignTaskFromShift(st)"
                color="primary"
                variant="tonal"
              >
                {{ getTaskName(st.task_id) }}
              </v-chip>
            </v-chip-group>
            <!-- Expanded task list details with items -->
            <v-card v-if="showShiftTaskDetails && shiftAssignedTasks.length > 0" variant="outlined" class="mb-3">
              <v-list density="compact">
                <template v-for="st in shiftAssignedTasks" :key="st.shift_task_id || st.task_id">
                  <v-list-item>
                    <v-list-item-title class="font-weight-medium">{{ getTaskName(st.task_id) }}</v-list-item-title>
                    <v-list-item-subtitle>{{ getTaskDescription(st.task_id) }}</v-list-item-subtitle>
                  </v-list-item>
                  <!-- Show task list items -->
                  <v-list-item
                    v-for="item in (taskListItemsMap[st.task_id] || [])"
                    :key="item.task_list_item_id"
                    class="pl-8"
                  >
                    <template #prepend>
                      <v-icon size="small" color="grey">mdi-circle-small</v-icon>
                    </template>
                    <v-list-item-title style="font-size:0.85em">{{ item.description || 'No description' }}</v-list-item-title>
                  </v-list-item>
                  <v-divider />
                </template>
              </v-list>
            </v-card>
            <div v-if="shiftAssignedTasks.length === 0" class="text-grey mb-2" style="font-size:0.9em">No task lists assigned to this shift.</div>
            <div class="d-flex align-center ga-2">
              <v-select
                v-model="shiftSelectedTaskId"
                :items="shiftAvailableTasks"
                item-title="task_name"
                item-value="task_id"
                label="Select task list to assign"
                density="compact"
                hide-details
                class="flex-grow-1"
                :menu-props="{ location: 'bottom', eager: true }"
                clearable
              />
              <v-btn icon size="small" color="primary" @click="openInlineTaskCreate">
                <v-icon>mdi-playlist-plus</v-icon>
              </v-btn>
            </div>
            <!-- Inline task list creation inside shift dialog -->
            <v-card v-if="showInlineTaskForm" variant="outlined" class="pa-3 mt-2">
              <div class="text-subtitle-2 mb-2">Quick Create Task List</div>
              <v-text-field v-model="inlineTaskForm.task_name" label="Task List Name" density="compact" required />
              <v-textarea v-model="inlineTaskForm.description" label="Description" rows="2" density="compact" />
              <v-alert v-if="inlineTaskError" type="error" density="compact" class="mb-2">{{ inlineTaskError }}</v-alert>
              <div class="d-flex ga-2">
                <v-btn size="small" color="primary" :loading="savingInlineTask" @click="saveInlineTask">Create</v-btn>
                <v-btn size="small" variant="text" @click="showInlineTaskForm = false">Cancel</v-btn>
              </div>
            </v-card>
          </div>

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
            :items="positionWorkerOptions"
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

    <!-- Delete Position Confirmation -->
    <v-dialog v-model="showDeletePositionDialog" max-width="400px">
      <v-card>
        <v-card-title class="text-h6 pa-4">Delete Position</v-card-title>
        <v-card-text>
          Are you sure you want to delete <strong>{{ deletingPosition?.position_name }}</strong>?
          This will also remove all worker assignments for this position.
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showDeletePositionDialog = false">Cancel</v-btn>
          <v-btn color="error" :loading="deletingPositionLoading" @click="deletePosition">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Task Lists Dialog -->
    <v-dialog v-model="showAreaTasksDialog" max-width="900px">
      <v-card>
        <v-card-title class="pa-4 d-flex align-center justify-space-between">
          <span class="text-h6">Task Lists</span>
          <v-btn size="small" color="primary" @click="openNewTaskForm">
            <v-icon start>mdi-plus</v-icon>
            New Task List
          </v-btn>
        </v-card-title>
        <v-card-text>
          <!-- Inline create / edit form for task list -->
          <v-card v-if="showTaskForm" variant="outlined" class="pa-3 mb-4">
            <div class="text-subtitle-2 mb-2">{{ editingTaskId ? 'Edit Task List' : 'Create Task List' }}</div>
            <v-text-field v-model="taskForm.task_name" label="Task List Name" density="compact" required />
            <v-textarea v-model="taskForm.description" label="Description" rows="2" density="compact" />
            <v-alert v-if="taskError" type="error" density="compact" class="mb-2">{{ taskError }}</v-alert>
            <div class="d-flex ga-2">
              <v-btn size="small" color="primary" :loading="savingTask" @click="saveTask">
                {{ editingTaskId ? 'Update' : 'Create' }}
              </v-btn>
              <v-btn size="small" variant="text" @click="cancelTaskForm">Cancel</v-btn>
            </div>
          </v-card>
          <!-- Task lists -->
          <div v-if="areaTasks.length > 0">
            <v-expansion-panels variant="accordion" class="mb-2">
              <v-expansion-panel
                v-for="task in areaTasks"
                :key="task.task_id"
                @group:selected="loadTaskListItems(task.task_id)"
              >
                <v-expansion-panel-title>
                  <div class="d-flex align-center justify-space-between w-100">
                    <div>
                      <span class="font-weight-medium">{{ task.task_name }}</span>
                      <span class="text-grey ml-2" style="font-size:0.85em">
                        {{ task.description ? '— ' + task.description : '' }}
                      </span>
                      <v-chip size="x-small" color="secondary" variant="tonal" class="ml-2">
                        {{ (taskListItemsMap[task.task_id] || []).length }} tasks
                      </v-chip>
                    </div>
                    <div class="d-flex align-center ga-1" @click.stop>
                      <v-btn size="x-small" icon variant="text" @click.stop="editAreaTask(task)">
                        <v-icon>mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn size="x-small" icon variant="text" color="error" @click.stop="deleteAreaTask(task.task_id)">
                        <v-icon>mdi-delete</v-icon>
                      </v-btn>
                    </div>
                  </div>
                </v-expansion-panel-title>
                <v-expansion-panel-text>
                  <!-- Task items within this task list -->
                  <div class="mb-2">
                    <div class="d-flex align-center justify-space-between mb-2">
                      <span class="text-subtitle-2">Tasks in this list</span>
                    </div>
                    <!-- Existing items -->
                    <v-list v-if="(taskListItemsMap[task.task_id] || []).length > 0" density="compact" class="pa-0">
                      <v-list-item
                        v-for="item in taskListItemsMap[task.task_id]"
                        :key="item.task_list_item_id"
                      >
                        <template #prepend>
                          <v-icon size="small" color="grey">mdi-circle-small</v-icon>
                        </template>
                        <v-list-item-title>{{ item.description || 'No description' }}</v-list-item-title>
                        <template #append>
                          <v-btn size="x-small" icon variant="text" color="error" @click="deleteTaskListItem(task.task_id, item.task_list_item_id)">
                            <v-icon>mdi-close</v-icon>
                          </v-btn>
                        </template>
                      </v-list-item>
                    </v-list>
                    <div v-else class="text-grey mb-2" style="font-size:0.85em">No tasks in this list yet.</div>
                    <!-- Add new item form -->
                    <div class="d-flex align-center ga-2 mt-2">
                      <v-text-field
                        v-model="newItemDescription[task.task_id]"
                        label="Add a task"
                        density="compact"
                        hide-details
                        class="flex-grow-1"
                        @keyup.enter="addTaskListItem(task.task_id)"
                      />
                      <v-btn size="small" color="primary" variant="tonal" @click="addTaskListItem(task.task_id)">
                        <v-icon start>mdi-plus</v-icon>
                        Add
                      </v-btn>
                    </div>
                  </div>
                </v-expansion-panel-text>
              </v-expansion-panel>
            </v-expansion-panels>
          </div>
          <div v-else class="text-center text-grey py-4">No task lists yet. Click "New Task List" to create one.</div>
        </v-card-text>
        <v-card-actions class="pa-4">
          <v-spacer />
          <v-btn variant="text" @click="showAreaTasksDialog = false">Close</v-btn>
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

    <ManagerOpenShifts :area-id="area.area_id" />
    <v-dialog v-model="showGoLiveDialog" max-width="500px">
      <v-card>
        <v-card-title class="pa-4" style="background-color: #1976d2; color: white">
          <v-icon color="white" class="mr-2">mdi-broadcast</v-icon>
          Go Live
        </v-card-title>
        <v-card-text class="pa-6">
          <p class="text-body-1 mb-3">
            Are you sure you want to publish
            <strong>{{ activeSchedule?.schedule_name }}</strong>?
          </p>
          <p class="text-body-2 text-grey-darken-1">
            This will make all shifts visible to workers and notify everyone who has been assigned a shift. This action cannot be undone.
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer />
          <v-btn variant="text" @click="showGoLiveDialog = false">Cancel</v-btn>
          <v-btn color="info" variant="flat" :loading="publishingSchedule" @click="confirmGoLive">
            <v-icon start>mdi-broadcast</v-icon>
            Go Live
          </v-btn>
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
import TaskServices from "../services/taskServices";
import TaskListItemServices from "../services/taskListItemServices";
import TaskListItemStatusServices from "../services/taskListItemStatusServices";
import ManagerOpenShifts from "../components/ManagerOpenShifts.vue";
import Utils from "../config/utils";

const SCHEDULE_TYPE_OPTIONS = [
  { label: "Custom Date Range", value: "custom" },
  { label: "Weekly", value: "weekly" },
  { label: "Bi-Weekly", value: "bi-weekly" },
];

export default {
  name: "ManagerDashboard",
  components: { VueCal, ManagerOpenShifts },
  setup() {
    const user = ref(Utils.getStore("user"));
    const area = ref({ area_id: null, area_name: "" });
    const workers = ref([]);
    const areaPositions = ref([]);
    const allUsers = ref([]);

    const viewMode = ref('overview');
    const areaSchedules = ref([]);
    const activeScheduleId = ref(null);
    const shifts = ref([]);
    const overviewSelectedDate = ref(new Date());

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

    // Area Tasks state
    const showAreaTasksDialog = ref(false);
    const areaTasks = ref([]);
    const showTaskForm = ref(false);
    const taskForm = ref({ task_name: "", description: "" });
    const editingTaskId = ref(null);
    const savingTask = ref(false);
    const taskError = ref("");

    // Shift-task assignment state
    const shiftAssignedTasks = ref([]);
    const shiftSelectedTaskId = ref(null);
    const showInlineTaskForm = ref(false);
    const inlineTaskForm = ref({ task_name: "", description: "" });
    const savingInlineTask = ref(false);
    const inlineTaskError = ref("");
    const showShiftTaskDetails = ref(false);
    const taskShiftMap = ref({});

    // Task list items state
    const taskListItemsMap = ref({});
    const newItemDescription = ref({});
    const shiftItemStatuses = ref({});
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

    const parseLocalDate = (value) => {
      if (!value) return new Date();
      const str = typeof value === "string" ? value : value.toISOString();
      const [y, m, d] = str.slice(0, 10).split("-").map(Number);
      return new Date(y, m - 1, d);
    };

    const scheduleMinDate = computed(() => {
      if (!activeSchedule.value?.start_date) return null;
      const d = parseLocalDate(activeSchedule.value.start_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const scheduleMaxDate = computed(() => {
      if (!activeSchedule.value?.end_date) return null;
      const d = parseLocalDate(activeSchedule.value.end_date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });

    const getScheduleWeekLabel = (viewStartDate) => {
      if (!activeSchedule.value?.start_date || !viewStartDate) return '';
      const schedStart = parseLocalDate(activeSchedule.value.start_date);
      const viewStart = new Date(viewStartDate);
      const diffMs = viewStart.getTime() - schedStart.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const weekNum = Math.floor(diffDays / 7) + 1;
      return `Week ${weekNum}`;
    };

    const currentWeekLabel = computed(() => {
      if (!activeSchedule.value?.start_date) return '';
      const schedStart = parseLocalDate(activeSchedule.value.start_date);
      const current = parseLocalDate(calendarSelectedDate.value);
      const diffMs = current.getTime() - schedStart.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      const weekNum = Math.max(1, Math.floor(diffDays / 7) + 1);
      return `Week ${weekNum}`;
    });

    const totalScheduleWeeks = computed(() => {
      if (!activeSchedule.value?.start_date || !activeSchedule.value?.end_date) return 1;
      const start = parseLocalDate(activeSchedule.value.start_date);
      const end = parseLocalDate(activeSchedule.value.end_date);
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(1, Math.ceil(diffDays / 7));
    });

    const currentWeekIndex = computed(() => {
      if (!activeSchedule.value?.start_date) return 0;
      const schedStart = parseLocalDate(activeSchedule.value.start_date);
      const current = parseLocalDate(calendarSelectedDate.value);
      const diffMs = current.getTime() - schedStart.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      return Math.max(0, Math.floor(diffDays / 7));
    });

    const canGoPrev = computed(() => currentWeekIndex.value > 0);
    const canGoNext = computed(() => currentWeekIndex.value < totalScheduleWeeks.value - 1);

    const goToPrevWeek = () => {
      if (!canGoPrev.value) return;
      const schedStart = parseLocalDate(activeSchedule.value.start_date);
      const targetWeek = currentWeekIndex.value - 1;
      const d = new Date(schedStart);
      d.setDate(d.getDate() + targetWeek * 7);
      calendarSelectedDate.value = d;
    };

    const goToNextWeek = () => {
      if (!canGoNext.value) return;
      const schedStart = parseLocalDate(activeSchedule.value.start_date);
      const targetWeek = currentWeekIndex.value + 1;
      const d = new Date(schedStart);
      d.setDate(d.getDate() + targetWeek * 7);
      calendarSelectedDate.value = d;
    };

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

    const SCHEDULE_COLORS = [
      'schedule-color-0',
      'schedule-color-1',
      'schedule-color-2',
      'schedule-color-3',
      'schedule-color-4',
      'schedule-color-5',
    ];

    const overviewEvents = computed(() => {
      return areaSchedules.value.map((schedule, index) => {
        const start = parseLocalDate(schedule.start_date);
        const end = parseLocalDate(schedule.end_date);
        end.setHours(23, 59, 0, 0);
        return {
          start,
          end,
          title: schedule.schedule_name,
          class: SCHEDULE_COLORS[index % SCHEDULE_COLORS.length],
          schedule_id: schedule.schedule_id,
        };
      });
    });

    const handleOverviewEventClick = (eventData) => {
      const event = eventData?.event || eventData;
      const scheduleId = event?.schedule_id;
      if (!scheduleId) return;
      enterSchedule(scheduleId);
    };

    const enterSchedule = async (scheduleId) => {
      const selected = areaSchedules.value.find((s) => Number(s.schedule_id) === Number(scheduleId));
      if (selected?.start_date) {
        calendarSelectedDate.value = parseLocalDate(selected.start_date);
      }
      viewMode.value = 'schedule';
      activeScheduleId.value = scheduleId;
      await fetchShifts(scheduleId);
    };

    const backToOverview = () => {
      viewMode.value = 'overview';
      activeScheduleId.value = null;
      shifts.value = [];
    };

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

      const newStart = scheduleForm.value.start_date;
      const newEnd = endDate;
      const overlap = areaSchedules.value.find((s) => {
        const existStart = toDateOnly(s.start_date);
        const existEnd = toDateOnly(s.end_date);
        return newStart <= existEnd && newEnd >= existStart;
      });
      if (overlap) {
        scheduleError.value = `Overlaps with "${overlap.schedule_name}" (${toDateOnly(overlap.start_date)} to ${toDateOnly(overlap.end_date)}).`;
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
      } catch (error) {
        scheduleError.value = error?.response?.data?.message || "Failed to create schedule.";
      } finally {
        savingSchedule.value = false;
      }
    };

    const setScheduleLive = async () => {
      if (!activeSchedule.value) return;

      try {
        await ScheduleServices.publish(activeSchedule.value.schedule_id);
        await fetchAreaSchedules(area.value.area_id);
      } catch (error) {
        console.error("Error publishing schedule:", error);
      }
    };

    const confirmGoLive = async () => {
      publishingSchedule.value = true;
      try {
        await setScheduleLive();
        showGoLiveDialog.value = false;
      } catch (error) {
        console.error("Error in confirmGoLive:", error);
      } finally {
        publishingSchedule.value = false;
      }
    };

    const editingScheduleName = ref(null);

    const saveScheduleName = async () => {
      const newName = (editingScheduleName.value || '').trim();
      editingScheduleName.value = null;
      if (!newName || !activeSchedule.value || newName === activeSchedule.value.schedule_name) return;
      try {
        await ScheduleServices.update(activeSchedule.value.schedule_id, { schedule_name: newName });
        await fetchAreaSchedules(area.value.area_id);
      } catch (error) {
        console.error('Error renaming schedule:', error);
      }
    };

    const showDeleteScheduleDialog = ref(false);
    const deletingSchedule = ref(false);
    const showGoLiveDialog = ref(false);
    const publishingSchedule = ref(false);

    const deleteSchedule = async () => {
      if (!activeSchedule.value) return;
      deletingSchedule.value = true;
      try {
        await ScheduleServices.delete(activeSchedule.value.schedule_id);
        showDeleteScheduleDialog.value = false;
        activeScheduleId.value = null;
        await fetchAreaSchedules(area.value.area_id);
        viewMode.value = 'overview';
      } catch (error) {
        console.error("Error deleting schedule:", error);
      } finally {
        deletingSchedule.value = false;
      }
    };

    const shiftAvailableTasks = computed(() => {
      const assignedIds = shiftAssignedTasks.value.map((st) => Number(st.task_id));
      return areaTasks.value.filter((t) => !assignedIds.includes(Number(t.task_id)));
    });

    const openShiftDialog = async ({ shift = null, start = null, end = null } = {}) => {
      shiftError.value = "";
      showInlineTaskForm.value = false;
      shiftSelectedTaskId.value = null;
      showShiftTaskDetails.value = false;

      // Make sure area tasks are loaded
      await fetchAreaTasks();
      await fetchAllTaskListItems();

      if (shift) {
        editingShiftId.value = shift.shift_id;
        shiftForm.value = {
          shift_date: toDateOnly(shift.shift_date),
          start_time: toTimeOnly(shift.start_time),
          end_time: toTimeOnly(shift.end_time),
          position_id: shift.position_id,
          user_id: shift.user_id,
        };
        await fetchShiftTasks(shift.shift_id);
        await fetchShiftItemStatuses(shift.shift_id);
      } else {
        editingShiftId.value = null;
        shiftForm.value = {
          shift_date: toDateOnly(start),
          start_time: toTimeOnly(start),
          end_time: toTimeOnly(end),
          position_id: areaPositions.value[0]?.position_id || null,
          user_id: null,
        };
        shiftAssignedTasks.value = [];
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
        let shiftId = editingShiftId.value;
        if (shiftId) {
          await ShiftServices.update(shiftId, payload);
        } else {
          const shiftRes = await ShiftServices.create(payload);
          shiftId = shiftRes?.data?.shift_id;
        }
        // Attach any locally-queued tasks for this shift
        if (shiftId && shiftAssignedTasks.value.length > 0) {
          for (const st of shiftAssignedTasks.value) {
            // Only attach tasks that don't already have a shift_task_id (i.e. not yet saved)
            if (!st.shift_task_id) {
              try {
                await TaskServices.attachTaskToShift(shiftId, st.task_id);
              } catch (attachErr) {
                // Ignore duplicate assignment errors (409)
                if (attachErr?.response?.status !== 409) {
                  console.error("Error attaching task:", attachErr);
                }
              }
            }
          }
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

    const positionWorkerOptions = computed(() => {
      const userId = user.value?.userId || user.value?.user_id;
      const areaWorkerIds = workers.value.map((w) => Number(w.user_id));
      const combined = new Set([...areaWorkerIds, Number(userId)]);
      return allUsers.value.filter((u) => combined.has(Number(u.user_id)));
    });

    const showDeletePositionDialog = ref(false);
    const deletingPosition = ref(null);
    const deletingPositionLoading = ref(false);

    const confirmDeletePosition = (pos) => {
      deletingPosition.value = pos;
      showDeletePositionDialog.value = true;
    };

    const deletePosition = async () => {
      if (!deletingPosition.value) return;
      deletingPositionLoading.value = true;
      try {
        await PositionServices.delete(deletingPosition.value.position_id);
        showDeletePositionDialog.value = false;
        deletingPosition.value = null;
        const puRes = await PositionUserServices.getAll();
        const allPosRes = await PositionServices.getAll();
        await fetchAreaWorkers(area.value.area_id, allPosRes.data, puRes.data);
      } catch (error) {
        console.error("Error deleting position:", error);
      } finally {
        deletingPositionLoading.value = false;
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

    // ─── Area Tasks methods ───
    const fetchAreaTasks = async () => {
      if (!area.value.area_id) return;
      try {
        const res = await TaskServices.getAll({ area_id: area.value.area_id });
        areaTasks.value = res.data || [];
      } catch (e) {
        console.error("Error fetching area tasks:", e);
      }
    };

    const fetchTaskShiftMap = async () => {
      const map = {};
      for (const task of areaTasks.value) {
        try {
          const res = await TaskServices.getShiftTasks({ task_id: task.task_id });
          const shiftTasks = res.data || [];
          map[task.task_id] = shiftTasks.map((st) => {
            const shift = shifts.value.find((s) => Number(s.shift_id) === Number(st.shift_id));
            if (shift) {
              return {
                shift_id: shift.shift_id,
                shift_date: toDateOnly(shift.shift_date),
                start_time: toTimeOnly(shift.start_time),
                end_time: toTimeOnly(shift.end_time),
              };
            }
            return { shift_id: st.shift_id, shift_date: '?', start_time: '?', end_time: '?' };
          });
        } catch (e) {
          map[task.task_id] = [];
        }
      }
      taskShiftMap.value = map;
    };

    // ─── Task List Items methods ───
    const loadTaskListItems = async (taskId) => {
      if (taskListItemsMap.value[taskId]) return; // already loaded
      try {
        const res = await TaskListItemServices.getAll({ task_id: taskId });
        taskListItemsMap.value[taskId] = res.data || [];
      } catch (e) {
        console.error("Error loading task list items:", e);
        taskListItemsMap.value[taskId] = [];
      }
    };

    const fetchAllTaskListItems = async () => {
      const map = {};
      for (const task of areaTasks.value) {
        try {
          const res = await TaskListItemServices.getAll({ task_id: task.task_id });
          map[task.task_id] = res.data || [];
        } catch (e) {
          map[task.task_id] = [];
        }
      }
      taskListItemsMap.value = map;
    };

    const addTaskListItem = async (taskId) => {
      const desc = (newItemDescription.value[taskId] || "").trim();
      if (!desc) return;
      try {
        await TaskListItemServices.create({ task_id: taskId, description: desc });
        newItemDescription.value[taskId] = "";
        // Reload items for this task list
        const res = await TaskListItemServices.getAll({ task_id: taskId });
        taskListItemsMap.value = { ...taskListItemsMap.value, [taskId]: res.data || [] };
      } catch (e) {
        console.error("Error adding task list item:", e);
      }
    };

    const deleteTaskListItem = async (taskId, itemId) => {
      try {
        await TaskListItemServices.delete(itemId);
        const res = await TaskListItemServices.getAll({ task_id: taskId });
        taskListItemsMap.value = { ...taskListItemsMap.value, [taskId]: res.data || [] };
      } catch (e) {
        console.error("Error deleting task list item:", e);
      }
    };

    // ─── Shift task completion status ───
    const fetchShiftItemStatuses = async (shiftId) => {
      if (!shiftId) {
        shiftItemStatuses.value = {};
        return;
      }
      try {
        const res = await TaskListItemStatusServices.getAll({ shift_id: shiftId });
        const statuses = res.data || [];
        const map = {};
        for (const s of statuses) {
          map[s.task_list_item_id] = s;
        }
        shiftItemStatuses.value = map;
      } catch (e) {
        shiftItemStatuses.value = {};
      }
    };

    const isShiftItemCompleted = (itemId) => {
      const status = shiftItemStatuses.value[itemId];
      return status ? status.is_completed : false;
    };

    const getShiftTaskProgress = (taskId) => {
      const items = taskListItemsMap.value[taskId] || [];
      if (items.length === 0) return { completed: 0, total: 0 };
      const completed = items.filter((i) => isShiftItemCompleted(i.task_list_item_id)).length;
      return { completed, total: items.length };
    };

    const openAreaTasksDialog = async () => {
      await fetchAreaTasks();
      await fetchTaskShiftMap();
      await fetchAllTaskListItems();
      showTaskForm.value = false;
      editingTaskId.value = null;
      taskError.value = "";
      showAreaTasksDialog.value = true;
    };

    const openNewTaskForm = () => {
      editingTaskId.value = null;
      taskForm.value = { task_name: "", description: "" };
      taskError.value = "";
      showTaskForm.value = true;
    };

    const editAreaTask = (task) => {
      editingTaskId.value = task.task_id;
      taskForm.value = { task_name: task.task_name, description: task.description || "" };
      taskError.value = "";
      showTaskForm.value = true;
    };

    const cancelTaskForm = () => {
      showTaskForm.value = false;
      editingTaskId.value = null;
      taskError.value = "";
    };

    const saveTask = async () => {
      if (!taskForm.value.task_name.trim()) {
        taskError.value = "Task name is required.";
        return;
      }
      savingTask.value = true;
      taskError.value = "";
      try {
        const payload = {
          area_id: area.value.area_id,
          task_name: taskForm.value.task_name.trim(),
          description: taskForm.value.description.trim(),
        };
        if (editingTaskId.value) {
          await TaskServices.update(editingTaskId.value, payload);
        } else {
          await TaskServices.create(payload);
        }
        showTaskForm.value = false;
        editingTaskId.value = null;
        await fetchAreaTasks();
      } catch (e) {
        taskError.value = e?.response?.data?.message || "Failed to save task.";
      } finally {
        savingTask.value = false;
      }
    };

    const deleteAreaTask = async (taskId) => {
      try {
        await TaskServices.delete(taskId);
        await fetchAreaTasks();
      } catch (e) {
        console.error("Error deleting task:", e);
      }
    };

    // ─── Shift-task assignment methods ───
    const getTaskName = (taskId) => {
      const t = areaTasks.value.find((t) => Number(t.task_id) === Number(taskId));
      return t ? t.task_name : `Task ${taskId}`;
    };

    const getTaskDescription = (taskId) => {
      const t = areaTasks.value.find((t) => Number(t.task_id) === Number(taskId));
      return t?.description || 'No description';
    };

    const fetchShiftTasks = async (shiftId) => {
      if (!shiftId) {
        shiftAssignedTasks.value = [];
        return;
      }
      try {
        const res = await TaskServices.getShiftTasks({ shift_id: shiftId });
        shiftAssignedTasks.value = res.data || [];
      } catch (e) {
        shiftAssignedTasks.value = [];
      }
    };

    const onTaskSelected = async (taskId) => {
      if (!taskId) return;
      const shiftId = editingShiftId.value;

      if (!shiftId) {
        // Shift hasn't been saved yet — store locally
        if (!shiftAssignedTasks.value.some((st) => Number(st.task_id) === Number(taskId))) {
          shiftAssignedTasks.value.push({ task_id: taskId });
        }
        shiftSelectedTaskId.value = null;
        return;
      }

      // Shift already exists — save to backend immediately
      shiftError.value = "";
      try {
        await TaskServices.attachTaskToShift(shiftId, taskId);
        shiftSelectedTaskId.value = null;
        await fetchShiftTasks(shiftId);
      } catch (e) {
        console.error("Error assigning task to shift:", e);
        shiftError.value = e?.response?.data?.message || "Failed to assign task.";
      }
    };

    const assignTaskToShift = async () => {
      if (!shiftSelectedTaskId.value) return;
      await onTaskSelected(shiftSelectedTaskId.value);
    };

    const unassignTaskFromShift = async (st) => {
      if (st.shift_task_id) {
        try {
          await TaskServices.removeTaskFromShift(st.shift_task_id);
          await fetchShiftTasks(editingShiftId.value);
        } catch (e) {
          shiftError.value = e?.response?.data?.message || "Failed to remove task.";
        }
      } else {
        shiftAssignedTasks.value = shiftAssignedTasks.value.filter((x) => Number(x.task_id) !== Number(st.task_id));
      }
    };

    const openInlineTaskCreate = () => {
      inlineTaskForm.value = { task_name: "", description: "" };
      inlineTaskError.value = "";
      showInlineTaskForm.value = true;
    };

    const saveInlineTask = async () => {
      if (!inlineTaskForm.value.task_name.trim()) {
        inlineTaskError.value = "Task name is required.";
        return;
      }
      savingInlineTask.value = true;
      inlineTaskError.value = "";
      try {
        const res = await TaskServices.create({
          area_id: area.value.area_id,
          task_name: inlineTaskForm.value.task_name.trim(),
          description: inlineTaskForm.value.description.trim(),
        });
        showInlineTaskForm.value = false;
        await fetchAreaTasks();
        // Auto-select the newly created task
        const newTask = res.data;
        if (newTask?.task_id) {
          shiftSelectedTaskId.value = newTask.task_id;
        }
      } catch (e) {
        inlineTaskError.value = e?.response?.data?.message || "Failed to create task.";
      } finally {
        savingInlineTask.value = false;
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
        }
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

    // Auto-assign task when user selects one from the dropdown
    watch(shiftSelectedTaskId, (newVal) => {
      if (newVal) {
        onTaskSelected(newVal);
      }
    });

    watch(activeScheduleId, async (scheduleId) => {
      if (!scheduleId) {
        shifts.value = [];
        return;
      }
      if (viewMode.value === 'schedule') {
        await fetchShifts(scheduleId);
      }
    });

    onMounted(() => {
      fetchManagerArea();
    });

    return {
      area,
      workers,
      areaPositions,
      allUsers,
      viewMode,
      areaSchedules,
      activeSchedule,
      activeScheduleId,
      calendarView,
      calendarSelectedDate,
      biWeekSecondDate,
      calendarEvents,
      overviewEvents,
      overviewSelectedDate,
      handleOverviewEventClick,
      enterSchedule,
      backToOverview,
      editingScheduleName,
      saveScheduleName,
      scheduleMinDate,
      scheduleMaxDate,
      getScheduleWeekLabel,
      currentWeekLabel,
      totalScheduleWeeks,
      canGoPrev,
      canGoNext,
      goToPrevWeek,
      goToNextWeek,
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
      confirmGoLive,
      showGoLiveDialog,
      publishingSchedule,
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
      positionWorkerOptions,
      savingPosition,
      positionError,
      openPositionDialog,
      savePosition,
      showDeletePositionDialog,
      deletingPosition,
      deletingPositionLoading,
      confirmDeletePosition,
      deletePosition,
      // Area task lists
      showAreaTasksDialog,
      areaTasks,
      showTaskForm,
      taskForm,
      editingTaskId,
      savingTask,
      taskError,
      openAreaTasksDialog,
      openNewTaskForm,
      editAreaTask,
      cancelTaskForm,
      saveTask,
      deleteAreaTask,
      // Task list items
      taskListItemsMap,
      newItemDescription,
      loadTaskListItems,
      addTaskListItem,
      deleteTaskListItem,
      // Shift task completion status
      shiftItemStatuses,
      isShiftItemCompleted,
      getShiftTaskProgress,
      // Shift-task list assignment
      shiftAssignedTasks,
      shiftSelectedTaskId,
      shiftAvailableTasks,
      assignTaskToShift,
      onTaskSelected,
      unassignTaskFromShift,
      getTaskName,
      showInlineTaskForm,
      inlineTaskForm,
      savingInlineTask,
      inlineTaskError,
      openInlineTaskCreate,
      saveInlineTask,
      showShiftTaskDetails,
      getTaskDescription,
      taskShiftMap,
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
  height: 650px;
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

/* Hide vue-cal's built-in title bar in schedule mode */
:deep(.hide-nav-arrows .vuecal__title-bar) {
  display: none !important;
}

/* Overview monthly calendar */
.overview-calendar {
  height: 420px;
}

:deep(.overview-calendar .vuecal__event) {
  cursor: pointer !important;
}

:deep(.vuecal__event.schedule-color-0) {
  background-color: #1976d2 !important;
  border-color: #1565c0 !important;
  color: #fff !important;
}

:deep(.vuecal__event.schedule-color-1) {
  background-color: #e65100 !important;
  border-color: #bf360c !important;
  color: #fff !important;
}

:deep(.vuecal__event.schedule-color-2) {
  background-color: #2e7d32 !important;
  border-color: #1b5e20 !important;
  color: #fff !important;
}

:deep(.vuecal__event.schedule-color-3) {
  background-color: #7b1fa2 !important;
  border-color: #6a1b9a !important;
  color: #fff !important;
}

:deep(.vuecal__event.schedule-color-4) {
  background-color: #c62828 !important;
  border-color: #b71c1c !important;
  color: #fff !important;
}

:deep(.vuecal__event.schedule-color-5) {
  background-color: #00838f !important;
  border-color: #006064 !important;
  color: #fff !important;
}
</style>
