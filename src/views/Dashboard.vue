<template>
  <v-container fluid class="pa-6">
    <!-- Modern Calendar -->
    <v-card class="calendar-container mb-8" elevation="0">
      <div class="calendar-header">
        <h2>{{ areaName }} Schedule</h2>
      </div>
      
      <div class="calendar-body">
        <vue-cal
          v-if="!loading"
          class="modern-calendar"
          :events="calendarEvents"
          :selected-date="today"
          :active-view="calendarView"
          :disable-views="['years', 'year', 'day']"
          :on-event-click="handleEventClick"
          :editable-events="{ title: false, drag: false, resize: false, delete: false, create: false }"
          :time-from="300" 
          :time-to="1380"
          :time-step="60"
          :twelve-hour="true"
          events-on-month-view="short"
        />
        <div v-else-if="!loading && !shifts.length" class="empty-calendar">
          <v-icon size="48" color="grey-lighten-1">mdi-calendar-blank</v-icon>
          <p class="mt-4 text-grey-darken-1">No shifts scheduled</p>
        </div>
        <div v-if="loading" class="loading-calendar">
          <v-progress-circular indeterminate color="primary" size="40"/>
          <p class="mt-4">Loading schedule...</p>
          <p class="text-caption mt-2">{{ loadingMessage }}</p>
          <v-btn
            v-if="loadingMessage.includes('Error') || loadingMessage.includes('timeout')"
            @click="retryLoadData"
            color="primary"
            size="small"
            class="mt-4"
          >
            Retry
          </v-btn>
        </div>
      </div>
    </v-card>

    <!-- Stats Grid -->
    <v-row class="mb-8">
      <v-col v-for="stat in stats" :key="stat.label" cols="12" md="4">
        <v-card class="stat-card" elevation="0">
          <div class="stat-icon">
            <v-icon :color="stat.color">{{ stat.icon }}</v-icon>
          </div>
          <div class="stat-content">
            <h3>{{ stat.value }}</h3>
            <p>{{ stat.label }}</p>
            <span class="stat-detail">{{ stat.detail }}</span>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <!-- Shift details side panel -->
    <v-navigation-drawer
      v-model="shiftDetailsOpen"
      location="right"
      temporary
      width="420"
      class="shift-drawer"
    >
      <div class="shift-drawer__header">
        <div>
          <div class="shift-drawer__title">Shift details</div>
          <div v-if="selectedShift" class="shift-drawer__subtitle">
            {{ selectedShift.area_name || '—' }} · {{ selectedShift.position_name || '—' }}
          </div>
          <div v-if="selectedShift?.is_open" class="shift-drawer__badges">
            <span class="shift-drawer__badge shift-drawer__badge--offered">Offered</span>
          </div>
        </div>
        <v-btn icon variant="text" @click="shiftDetailsOpen = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>

      <v-divider />

      <div class="shift-drawer__body" v-if="selectedShift">
        <div class="shift-drawer__section">
          <div class="shift-drawer__sectionTitle">Details</div>
          <div class="shift-drawer__row">
            <span class="label">Date</span>
            <span class="value">{{ formatDay(selectedShift.shift_date) }}, {{ formatDate(selectedShift.shift_date) }}</span>
          </div>
          <div class="shift-drawer__row">
            <span class="label">Time</span>
            <span class="value">{{ formatTimeRange(selectedShift.start_time, selectedShift.end_time) }}</span>
          </div>
          <div class="shift-drawer__row">
            <span class="label">Department</span>
            <span class="value">{{ selectedShift.area_name || '—' }}</span>
          </div>
          <div class="shift-drawer__row">
            <span class="label">Position</span>
            <span class="value">{{ selectedShift.position_name || '—' }}</span>
          </div>
        </div>

        <!-- Task Lists Section -->
        <div class="shift-drawer__section" v-if="isMyShift">
          <div class="shift-drawer__sectionTitle">Task Lists</div>
          <div v-if="loadingTasks" class="d-flex align-center justify-center py-4">
            <v-progress-circular indeterminate size="24" width="2" color="primary" />
            <span class="ml-2 text-caption">Loading tasks...</span>
          </div>
          <div v-else-if="shiftTasks.length === 0" class="shift-drawer__placeholder">
            No task lists assigned to this shift.
          </div>
          <div v-else>
            <div v-for="st in shiftTasks" :key="st.shift_task_id || st.task_id" class="task-checklist mb-4">
              <div class="task-checklist__header">
                <v-icon size="small" color="primary" class="mr-1">mdi-clipboard-list-outline</v-icon>
                <span class="font-weight-medium">{{ getTaskName(st.task_id) }}</span>
                <v-chip size="x-small" class="ml-2" :color="getTaskProgress(st.task_id).completed === getTaskProgress(st.task_id).total && getTaskProgress(st.task_id).total > 0 ? 'success' : 'grey'" variant="tonal">
                  {{ getTaskProgress(st.task_id).completed }}/{{ getTaskProgress(st.task_id).total }}
                </v-chip>
              </div>
              <v-list density="compact" class="task-checklist__items">
                <v-list-item
                  v-for="item in (taskListItemsMap[st.task_id] || [])"
                  :key="item.task_list_item_id"
                  class="task-checklist__item"
                  @click="toggleItemStatus(item)"
                  :disabled="togglingItemId === item.task_list_item_id"
                >
                  <template #prepend>
                    <v-progress-circular v-if="togglingItemId === item.task_list_item_id" indeterminate size="20" width="2" />
                    <v-checkbox-btn
                      v-else
                      :model-value="isItemCompleted(item.task_list_item_id)"
                      color="success"
                      density="compact"
                      @click.stop="toggleItemStatus(item)"
                    />
                  </template>
                  <v-list-item-title :class="{ 'text-decoration-line-through text-grey': isItemCompleted(item.task_list_item_id) }" style="font-size: 0.9em">
                    {{ item.description || 'No description' }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </div>
          </div>
        </div>
      </div>

      <v-spacer />

      <div class="shift-drawer__actions">
        <!-- Own shift that is NOT offered yet -->
        <v-btn
          v-if="selectedShift && isMyShift && !selectedShift.is_open"
          color="warning"
          variant="flat"
          class="text-none"
          block
          @click="openOfferConfirm"
        >
          Offer shift
        </v-btn>
        <!-- Own shift that IS offered -->
        <v-btn
          v-else-if="selectedShift && isMyShift && selectedShift.is_open"
          color="warning"
          variant="tonal"
          class="text-none"
          block
          @click="openCancelOfferConfirm"
        >
          Cancel offer
        </v-btn>
        <!-- Open shift from someone else that I can claim -->
        <v-btn
          v-else-if="selectedShift && !isMyShift && selectedShift.is_open && canClaimSelected"
          color="primary"
          variant="flat"
          class="text-none"
          block
          @click="openClaimConfirm"
        >
          Claim shift
        </v-btn>
        <v-alert
          v-else-if="selectedShift && !isMyShift && selectedShift.is_open && !canClaimSelected"
          type="info"
          variant="tonal"
          density="compact"
        >
          You don't hold the required position to claim this shift.
        </v-alert>
      </div>
    </v-navigation-drawer>

    <v-dialog v-model="offerConfirmOpen" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">{{ offerConfirmMode === 'offer' ? 'Offer this shift?' : 'Cancel offer?' }}</v-card-title>
        <v-card-text>
          <p class="mb-2" v-if="offerConfirmMode === 'offer'">
            Your shift will stay on your schedule until someone else claims it.
          </p>
          <p class="mb-2" v-else>
            This shift will no longer be visible on the open shifts board.
          </p>
          <v-alert v-if="offerError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ offerError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4" style="gap: 8px;">
          <v-spacer />
          <v-btn variant="outlined" color="grey-darken-2" class="text-none" @click="closeOfferConfirm">Cancel</v-btn>
          <v-btn
            color="warning"
            variant="flat"
            class="text-none"
            :loading="offerSubmitting"
            @click="confirmOfferChange"
          >
            Yes, {{ offerConfirmMode === 'offer' ? 'offer' : 'cancel offer' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="claimConfirmOpen" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">Claim this shift?</v-card-title>
        <v-card-text>
          <p class="mb-2">
            You will be assigned to this shift.
          </p>
          <v-alert v-if="offerError" type="error" variant="tonal" density="compact" class="mt-3">
            {{ offerError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4" style="gap: 8px;">
          <v-spacer />
          <v-btn variant="outlined" color="grey-darken-2" class="text-none" @click="closeClaimConfirm">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="offerSubmitting"
            @click="confirmClaim"
          >
            Yes, claim shift
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="offerSuccessOpen" color="success" timeout="2500">
      {{ offerSuccessMessage }}
    </v-snackbar>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import VueCal from "vue-cal"
import "vue-cal/dist/vuecal.css"
import Utils from '../config/utils'
import ShiftServices from '../services/shiftServices'
import PositionServices from '../services/positionServices'
import PositionUserServices from '../services/positionUserServices'
import ScheduleServices from '../services/scheduleServices'
import AreaServices from '../services/areaServices'
import UserServices from '../services/userServices'
import TaskServices from '../services/taskServices'
import TaskListItemServices from '../services/taskListItemServices'
import TaskListItemStatusServices from '../services/taskListItemStatusServices'
// State
const user = ref(Utils.getStore('user'))
const loading = ref(true)
const loadingMessage = ref('Initializing...')
const shifts = ref([]) // ALL shifts in user's area(s)
const userArea = ref(null)
const calendarView = ref('week')
const userPositionIds = ref([]) // position_ids the current user holds
const allUsersMap = ref({}) // user_id -> { fName, lName }
// Shift offering UI state
const shiftDetailsOpen = ref(false)
const selectedShift = ref(null)
const offerConfirmOpen = ref(false)
const offerConfirmMode = ref('offer') // 'offer' | 'cancel' | 'claim'
const offerSubmitting = ref(false)
const offerError = ref('')
const offerSuccessOpen = ref(false)
const offerSuccessMessage = ref('')
const claimConfirmOpen = ref(false)

// Task list state
const shiftTasks = ref([])          // tasks assigned to selected shift
const taskListItemsMap = ref({})    // task_id -> [items]
const shiftItemStatuses = ref({})   // task_list_item_id -> status record
const loadingTasks = ref(false)
const togglingItemId = ref(null)    // item currently being toggled

const today = new Date()
const currentUserId = computed(() => {
  const u = user.value
  return u ? Number(u.userId || u.user_id || u.id) : null
})

// Computed Properties
const areaName = computed(() => {
  // First try to use the stored user area
  if (userArea.value && userArea.value !== 'My Area') {
    return userArea.value
  }
  
  // Fallback to area from shifts if available
  if (shifts.value && shifts.value.length > 0) {
    const firstShiftArea = shifts.value[0]?.area_name
    if (firstShiftArea && firstShiftArea !== 'Unknown Area') {
      return firstShiftArea
    }
  }
  
  // Last fallback - try to get a default area name
  return 'Area'
})

const calendarEvents = computed(() => {
  if (!shifts.value || shifts.value.length === 0) {
    return []
  }
  
  const uid = currentUserId.value
  
  const events = shifts.value
    .filter(shift => Number(shift.user_id) === uid)
    .map(shift => {
    const shiftDate = shift.shift_date
    const startTime = shift.start_time
    const endTime = shift.end_time
    
    if (!shiftDate || !startTime || !endTime) return null
    
    let dateOnly
    if (shiftDate.includes('T')) {
      dateOnly = shiftDate.substring(0, 10)
    } else {
      dateOnly = shiftDate
    }
    
    const normalizeTime = (timeStr) => {
      if (!timeStr) return null
      const timeParts = timeStr.split(':')
      const hours = timeParts[0].padStart(2, '0')
      const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00'
      return `${hours}:${minutes}:00`
    }
    
    const normalizedStartTime = normalizeTime(startTime)
    const normalizedEndTime = normalizeTime(endTime)
    const startDateTime = new Date(`${dateOnly}T${normalizedStartTime}`)
    const endDateTime = new Date(`${dateOnly}T${normalizedEndTime}`)
    
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) return null
    
    // Determine shift type
    const isOpen = !!shift.is_open
    const isMine = Number(shift.user_id) === uid
    let eventClass, title
    
    if (isOpen) {
      eventClass = 'shift-open'
      title = `OPEN - ${shift.position_name || 'Shift'}`
    } else if (isMine) {
      eventClass = 'shift-mine'
      title = shift.position_name || 'Shift'
    } else {
      eventClass = 'shift-other'
      const worker = allUsersMap.value[Number(shift.user_id)]
      const workerName = worker ? `${worker.fName} ${worker.lName}` : 'Coworker'
      title = `${workerName} - ${shift.position_name || 'Shift'}`
    }
    
    return {
      start: startDateTime,
      end: endDateTime,
      title,
      content: shift.area_name || '',
      class: eventClass,
      shift_id: shift.shift_id,
      is_open: shift.is_open,
      user_id: shift.user_id,
    }
  }).filter(Boolean)
  
  return events
})

async function handleEventClick(event) {
  const shiftId = event?.shift_id
  if (!shiftId) return
  const found = shifts.value.find(s => Number(s.shift_id) === Number(shiftId))
  if (!found) return
  
  const uid = currentUserId.value
  const isMine = Number(found.user_id) === uid
  const isOpen = !!found.is_open
  
  // Only allow clicking own shifts or open shifts
  if (!isMine && !isOpen) return
  
  selectedShift.value = found
  shiftDetailsOpen.value = true
  
  // Load tasks for this shift if it's mine
  if (isMine) {
    await loadShiftTasks(shiftId)
  }
}

function openOfferConfirm() {
  offerError.value = ''
  offerConfirmMode.value = 'offer'
  offerConfirmOpen.value = true
}

function openCancelOfferConfirm() {
  offerError.value = ''
  offerConfirmMode.value = 'cancel'
  offerConfirmOpen.value = true
}

function closeOfferConfirm() {
  offerConfirmOpen.value = false
  offerError.value = ''
}

async function confirmOfferChange() {
  if (!selectedShift.value) return
  offerSubmitting.value = true
  offerError.value = ''
  try {
    const makeOpen = offerConfirmMode.value === 'offer'
    await ShiftServices.patch(selectedShift.value.shift_id, { is_open: makeOpen ? 1 : 0 })
    await loadUserShifts()
    offerSuccessMessage.value = makeOpen ? 'Shift offered! It is now visible to other workers.' : 'Offer cancelled.'
    offerSuccessOpen.value = true
    closeOfferConfirm()
    shiftDetailsOpen.value = false
  } catch (e) {
    offerError.value = e.response?.data?.message || e.message || 'Could not update offer status'
  } finally {
    offerSubmitting.value = false
  }
}

const isMyShift = computed(() => {
  if (!selectedShift.value) return false
  return Number(selectedShift.value.user_id) === currentUserId.value
})

const canClaimSelected = computed(() => {
  if (!selectedShift.value) return false
  return userPositionIds.value.includes(Number(selectedShift.value.position_id))
})

function openClaimConfirm() {
  offerError.value = ''
  claimConfirmOpen.value = true
}

function closeClaimConfirm() {
  claimConfirmOpen.value = false
  offerError.value = ''
}

async function confirmClaim() {
  if (!selectedShift.value) return
  offerSubmitting.value = true
  offerError.value = ''
  try {
    await ShiftServices.claim(selectedShift.value.shift_id)
    await loadUserShifts()
    offerSuccessMessage.value = 'Shift claimed successfully!'
    offerSuccessOpen.value = true
    closeClaimConfirm()
    shiftDetailsOpen.value = false
  } catch (e) {
    offerError.value = e.response?.data?.message || e.message || 'Could not claim shift'
  } finally {
    offerSubmitting.value = false
  }
}

const myShifts = computed(() => {
  const uid = currentUserId.value
  return shifts.value.filter(s => Number(s.user_id) === uid)
})

const stats = computed(() => {
  const now = new Date()
  const thisWeek = getWeekRange(now)
  const nextWeek = getWeekRange(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
  const thisMonth = getMonthRange(now)

  const thisWeekShifts = filterShiftsByDateRange(myShifts.value, thisWeek.start, thisWeek.end)
  const nextWeekShifts = filterShiftsByDateRange(myShifts.value, nextWeek.start, nextWeek.end)
  const monthShifts = filterShiftsByDateRange(myShifts.value, thisMonth.start, thisMonth.end)

  return [
    {
      label: 'This Week',
      value: `${calculateTotalHours(thisWeekShifts)}h`,
      detail: `${thisWeekShifts.length} shifts`,
      icon: 'mdi-clock',
      color: 'blue'
    },
    {
      label: 'Next Week', 
      value: `${calculateTotalHours(nextWeekShifts)}h`,
      detail: `${nextWeekShifts.length} shifts`,
      icon: 'mdi-calendar',
      color: 'green'
    },
    {
      label: 'This Month',
      value: `${calculateTotalHours(monthShifts)}h`, 
      detail: `${monthShifts.length} shifts`,
      icon: 'mdi-chart-line',
      color: 'purple'
    }
  ]
})

// Utility Functions
function getWeekRange(date) {
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  return { start, end }
}

function getMonthRange(date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0)
  }
}

function filterShiftsByDateRange(shifts, start, end) {
  return shifts.filter(shift => {
    if (!shift.shift_date) return false
    
    // Handle both ISO format and plain date format
    let shiftDate
    if (shift.shift_date.includes('T')) {
      // Already in ISO format
      shiftDate = new Date(shift.shift_date)
    } else {
      // Plain date format
      shiftDate = new Date(shift.shift_date + 'T00:00:00')
    }
    
    // Compare just the date part (not time)
    const shiftDateOnly = new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate())
    const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
    return shiftDateOnly >= startDateOnly && shiftDateOnly <= endDateOnly
  })
}

function calculateTotalHours(shifts) {
  return shifts.reduce((total, shift) => {
    if (!shift.start_time || !shift.end_time) return total
    
    // Handle both HH:MM and HH:MM:SS formats
    const normalizeTime = (timeStr) => {
      const parts = timeStr.split(':')
      return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : timeStr
    }
    
    const startTime = normalizeTime(shift.start_time)
    const endTime = normalizeTime(shift.end_time)
    
    const start = new Date(`1970-01-01T${startTime}:00`)
    const end = new Date(`1970-01-01T${endTime}:00`)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return total
    
    const hours = (end - start) / (1000 * 60 * 60)
    return total + Math.max(0, hours)
  }, 0).toFixed(1)
}

function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return '--'
  
  const format = time => {
    // Handle both HH:MM and HH:MM:SS formats
    const timeParts = time.split(':')
    const hour = parseInt(timeParts[0])
    const minute = timeParts[1] || '00'
    
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    
    return `${displayHour}:${minute} ${period}`
  }
  
  return `${format(startTime)} - ${format(endTime)}`
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// Data Loading
async function loadUserShifts() {
  try {
    loading.value = true
    loadingMessage.value = 'Loading schedule...'
    
    const currentUser = user.value || Utils.getStore('user')
    if (!currentUser) {
      loadingMessage.value = 'Please log in to view schedule'
      loading.value = false
      return
    }

    const userId = currentUser.userId || currentUser.user_id || currentUser.id
    if (!userId) {
      loadingMessage.value = 'Invalid user session - Please log in again'
      loading.value = false
      return
    }

    // Load base data in parallel
    const [positionResponse, areaResponse, puResponse, usersResponse] = await Promise.all([
      PositionServices.getAll().catch(() => ({ data: [] })),
      AreaServices.getAll().catch(() => ({ data: [] })),
      PositionUserServices.getAll().catch(() => ({ data: [] })),
      UserServices.getAll().catch(() => ({ data: [] })),
    ])

    const positions = positionResponse.data || []
    const areas = areaResponse.data || []
    const allPU = puResponse.data || []
    const allUsers = usersResponse.data || []

    // Build user lookup map
    const uMap = {}
    allUsers.forEach(u => { uMap[Number(u.user_id)] = { fName: u.fName, lName: u.lName } })
    allUsersMap.value = uMap

    // Determine which positions this user holds
    const myPU = allPU.filter(pu => Number(pu.user_id) === Number(userId))
    userPositionIds.value = myPU.map(pu => Number(pu.position_id))

    // Determine user's area(s) from their positions
    const myPositionObjs = positions.filter(p => userPositionIds.value.includes(Number(p.position_id)))
    const myAreaIds = [...new Set(myPositionObjs.map(p => Number(p.area_id)))]

    // Set area name for header
    if (myAreaIds.length > 0) {
      const firstArea = areas.find(a => Number(a.area_id) === myAreaIds[0])
      if (firstArea) userArea.value = firstArea.area_name
    }

    if (myAreaIds.length === 0) {
      shifts.value = []
      loading.value = false
      loadingMessage.value = 'No area assignments found'
      return
    }

    loadingMessage.value = 'Loading area schedules...'

    // Load all live schedules for user's areas
    const schedulePromises = myAreaIds.map(areaId =>
      ScheduleServices.getByArea(areaId).catch(() => ({ data: [] }))
    )
    const scheduleResults = await Promise.all(schedulePromises)
    const liveSchedules = scheduleResults
      .flatMap(r => r.data || [])
      .filter(s => s.status === 'live')

    if (liveSchedules.length === 0) {
      shifts.value = []
      loading.value = false
      loadingMessage.value = 'No live schedules'
      return
    }

    loadingMessage.value = 'Loading shifts...'

    // Load ALL shifts from those live schedules
    const shiftPromises = liveSchedules.map(s =>
      ShiftServices.getBySchedule(s.schedule_id).catch(() => ({ data: [] }))
    )
    const shiftResults = await Promise.all(shiftPromises)
    const allShifts = shiftResults.flatMap(r => r.data || [])

    // Enhance with position and area names
    const enhancedShifts = allShifts.map(shift => {
      const position = positions.find(p => Number(p.position_id) === Number(shift.position_id))
      const area = position ? areas.find(a => Number(a.area_id) === Number(position.area_id)) : null
      return {
        ...shift,
        position_name: position?.position_name || 'Unknown Position',
        area_name: area?.area_name || 'Unknown Area'
      }
    })

    shifts.value = enhancedShifts

  } catch (error) {
    console.error('Error loading shifts:', error)
    let errorMessage = 'Failed to load data'
    if (error.message?.includes('Network Error')) {
      errorMessage = 'Cannot connect to server'
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed - please log in again'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server error - please try again later'
    } else {
      errorMessage = error.message || 'Failed to load data'
    }
    loadingMessage.value = `Error: ${errorMessage}`
    shifts.value = []
  } finally {
    setTimeout(() => { loading.value = false }, 300)
  }
}

onMounted(async () => {
  const currentUser = Utils.getStore('user')
  if (currentUser) {
    user.value = currentUser
    const loadingTimeout = setTimeout(() => {
      if (loading.value) {
        loading.value = false
        loadingMessage.value = 'Loading timeout - please refresh the page'
      }
    }, 30000)
    try {
      await loadUserShifts()
      clearTimeout(loadingTimeout)
    } catch (error) {
      clearTimeout(loadingTimeout)
      console.error('Error loading dashboard:', error)
    }
  } else {
    loadingMessage.value = 'Please log in to view your schedule'
    loading.value = false
  }
})

function retryLoadData() {
  loadUserShifts()
}

// ─── Task list functions ───
async function loadShiftTasks(shiftId) {
  loadingTasks.value = true
  shiftTasks.value = []
  taskListItemsMap.value = {}
  shiftItemStatuses.value = {}
  try {
    // 1. Get tasks assigned to this shift
    const stRes = await TaskServices.getShiftTasks({ shift_id: shiftId })
    shiftTasks.value = stRes.data || []

    if (shiftTasks.value.length === 0) return

    // 2. Load task list items and statuses in parallel
    const itemPromises = shiftTasks.value.map(st =>
      TaskListItemServices.getAll({ task_id: st.task_id }).catch(() => ({ data: [] }))
    )
    const statusPromise = TaskListItemStatusServices.getAll({ shift_id: shiftId }).catch(() => ({ data: [] }))

    const [itemResults, statusRes] = await Promise.all([
      Promise.all(itemPromises),
      statusPromise
    ])

    // Build items map
    const iMap = {}
    shiftTasks.value.forEach((st, idx) => {
      iMap[st.task_id] = itemResults[idx].data || []
    })
    taskListItemsMap.value = iMap

    // Build status map
    const sMap = {}
    for (const s of (statusRes.data || [])) {
      sMap[s.task_list_item_id] = s
    }
    shiftItemStatuses.value = sMap

    // 3. Load task names (we need the full task objects)
    const taskIds = [...new Set(shiftTasks.value.map(st => st.task_id))]
    const taskPromises = taskIds.map(id =>
      TaskServices.get(id).catch(() => ({ data: null }))
    )
    const taskResults = await Promise.all(taskPromises)
    const tMap = {}
    taskResults.forEach(r => {
      if (r.data) tMap[r.data.task_id] = r.data
    })
    taskNamesMap.value = tMap
  } catch (e) {
    console.error('Error loading shift tasks:', e)
  } finally {
    loadingTasks.value = false
  }
}

const taskNamesMap = ref({})

function getTaskName(taskId) {
  const t = taskNamesMap.value[taskId]
  return t ? t.task_name : `Task ${taskId}`
}

function isItemCompleted(itemId) {
  const status = shiftItemStatuses.value[itemId]
  return status ? !!status.is_completed : false
}

function getTaskProgress(taskId) {
  const items = taskListItemsMap.value[taskId] || []
  if (items.length === 0) return { completed: 0, total: 0 }
  const completed = items.filter(i => isItemCompleted(i.task_list_item_id)).length
  return { completed, total: items.length }
}

async function toggleItemStatus(item) {
  if (!selectedShift.value) return
  const itemId = item.task_list_item_id
  const shiftId = selectedShift.value.shift_id
  togglingItemId.value = itemId

  try {
    const existing = shiftItemStatuses.value[itemId]
    if (existing) {
      // Update existing status record
      const newCompleted = !existing.is_completed
      await TaskListItemStatusServices.update(existing.task_list_item_status_id, {
        is_completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null
      })
      shiftItemStatuses.value = {
        ...shiftItemStatuses.value,
        [itemId]: { ...existing, is_completed: newCompleted, completed_at: newCompleted ? new Date().toISOString() : null }
      }
    } else {
      // Create new status record (marking as complete)
      const res = await TaskListItemStatusServices.create({
        shift_id: shiftId,
        task_list_item_id: itemId,
        is_completed: true,
        completed_at: new Date().toISOString()
      })
      shiftItemStatuses.value = {
        ...shiftItemStatuses.value,
        [itemId]: res.data
      }
    }
  } catch (e) {
    console.error('Error toggling task item status:', e)
  } finally {
    togglingItemId.value = null
  }
}

</script>

<style scoped>
/* Clean Modern Layout */
.area-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #1a202c;
  margin-bottom: 0;
}

/* Calendar Container */
.calendar-container {
  background: white;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.08);
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: #fafafa;
  border-bottom: 1px solid #e2e8f0;
}

.calendar-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0;
}

.view-toggle {
  display: flex;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #374151;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #f3f4f6;
  color: #111827;
}

.toggle-btn.active {
  background: #111827;
  color: white;
}

.calendar-body {
  padding: 0;
}

/* Modern Calendar Styling */
.modern-calendar {
  border: none;
  font-family: inherit;
}

:deep(.vuecal__header) {
  background: #f3f4f6;
  color: #374151;
  padding: 0;
  border: none;
}

:deep(.vuecal__title-bar) {
  background: #f3f4f6;
  padding: 12px 16px;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.vuecal__title) {
  font-weight: 600;
  font-size: 0;
}

:deep(.vuecal__title)::after {
  content: 'Schedule';
  font-size: 1.1rem;
}

:deep(.vuecal__arrow) {
  color: #374151;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

:deep(.vuecal__arrow:hover) {
  background: rgba(0, 0, 0, 0.12);
}

:deep(.vuecal__weekdays) {
  background: #f9fafb;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.vuecal__weekday-label) {
  color: #6b7280;
  font-weight: 600;
  font-size: 0.875rem;
}

:deep(.vuecal__cell) {
  border-color: #e2e8f0;
  background: white;
}

:deep(.vuecal__cell:nth-child(even)) {
  background: #fefefe;
}

:deep(.vuecal__time-column) {
  background: #f9fafb;
  border-right: 1px solid #e2e8f0;
}

:deep(.vuecal__time-cell) {
  color: #6b7280;
  font-weight: 500;
  font-size: 0.8rem;
}

/* My shifts - Blue */
:deep(.vuecal__event.shift-mine) {
  background: #3b82f6;
  border: none;
  border-radius: 6px;
  color: white;
  border-left: 3px solid #2563eb;
  cursor: pointer;
}

:deep(.vuecal__event.shift-mine:hover) {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Other people's shifts - Grey */
:deep(.vuecal__event.shift-other) {
  background: #9ca3af;
  border: none;
  border-radius: 6px;
  color: white;
  border-left: 3px solid #6b7280;
  cursor: default;
  opacity: 0.85;
}

/* Open shifts - Red */
:deep(.vuecal__event.shift-open) {
  background: #ef4444;
  border: none;
  border-radius: 6px;
  color: white;
  border-left: 3px solid #dc2626;
  cursor: pointer;
}

:deep(.vuecal__event.shift-open:hover) {
  background: #dc2626;
  transform: translateY(-1px);
}

/* Empty and Loading States */
.empty-calendar,
.loading-calendar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #64748b;
}

/* Stats Cards */
.stat-card {
  display: flex;
  align-items: center;
  padding: 24px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  transition: box-shadow 0.2s;
}

.stat-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  margin-right: 16px;
}

.stat-content h3 {
  font-size: 2rem;
  font-weight: 700;
  color: #1a202c;
  margin: 0;
}

.stat-content p {
  font-weight: 600;
  color: #64748b;
  margin: 4px 0;
}

.stat-detail {
  font-size: 0.875rem;
  color: #94a3b8;
}

/* Shift drawer */
.shift-drawer :deep(.v-navigation-drawer__content) {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.shift-drawer__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 16px;
}

.shift-drawer__title {
  font-size: 1rem;
  font-weight: 700;
  color: #1a202c;
}

.shift-drawer__subtitle {
  margin-top: 2px;
  font-size: 0.875rem;
  color: #64748b;
}

.shift-drawer__badges {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.shift-drawer__badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
}

.shift-drawer__badge--offered {
  background: #FAEEDA;
  color: #633806;
}

.shift-drawer__body {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shift-drawer__section {
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  background: #ffffff;
}

.shift-drawer__sectionTitle {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.shift-drawer__row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}

.shift-drawer__row .label {
  font-size: 0.875rem;
  color: #64748b;
}

.shift-drawer__row .value {
  font-size: 0.875rem;
  color: #1a202c;
  font-weight: 600;
  text-align: right;
}

.shift-drawer__placeholder {
  font-size: 0.875rem;
  color: #94a3b8;
}

/* Task checklist */
.task-checklist {
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.task-checklist__header {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  font-size: 0.9rem;
}

.task-checklist__items {
  padding: 0 !important;
}

.task-checklist__item {
  cursor: pointer;
  border-bottom: 1px solid #f1f5f9;
  min-height: 40px !important;
}

.task-checklist__item:last-child {
  border-bottom: none;
}

.task-checklist__item:hover {
  background: #f8fafc;
}

.shift-drawer__actions {
  padding: 16px;
  border-top: 1px solid #e2e8f0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .calendar-header {
    flex-direction: column;
    gap: 16px;
    justify-content: center;
  }
}
</style>