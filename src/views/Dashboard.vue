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

    <OpenShifts ref="openShiftsRef" @shift-claimed="loadUserShifts" />

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

        <!-- Placeholder for future teammate additions (tasklists, notes, etc.) -->
        <div class="shift-drawer__section">
          <div class="shift-drawer__sectionTitle">More</div>
          <div class="shift-drawer__placeholder">
            Additional shift tools will appear here.
          </div>
        </div>
      </div>

      <v-spacer />

      <div class="shift-drawer__actions">
        <v-btn
          v-if="selectedShift && !selectedShift.is_open"
          color="warning"
          variant="flat"
          class="text-none"
          block
          @click="openOfferConfirm"
        >
          Offer shift
        </v-btn>
        <v-btn
          v-else-if="selectedShift && selectedShift.is_open"
          color="warning"
          variant="tonal"
          class="text-none"
          block
          @click="openCancelOfferConfirm"
        >
          Cancel offer
        </v-btn>
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
import AreaServices from '../services/areaServices'
import OpenShifts from '../components/OpenShifts.vue'

// State
const user = ref(Utils.getStore('user'))
const loading = ref(true)
const loadingMessage = ref('Initializing...')
const shifts = ref([])
const userArea = ref(null)
const calendarView = ref('week')
const openShiftsRef = ref(null)

// Shift offering UI state
const shiftDetailsOpen = ref(false)
const selectedShift = ref(null)
const offerConfirmOpen = ref(false)
const offerConfirmMode = ref('offer') // 'offer' | 'cancel'
const offerSubmitting = ref(false)
const offerError = ref('')
const offerSuccessOpen = ref(false)
const offerSuccessMessage = ref('')

const today = new Date()

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
  
  const events = shifts.value.map(shift => {
    // Extract shift data
    const shiftDate = shift.shift_date
    const startTime = shift.start_time
    const endTime = shift.end_time
    
    if (!shiftDate || !startTime || !endTime) {
      return null
    }
    
    // Normalize date format - handle both "YYYY-MM-DD" and ISO format
    let dateOnly
    if (shiftDate.includes('T')) {
      // ISO format like "2026-03-25T00:00:00.000Z"
      dateOnly = shiftDate.substring(0, 10) // Extract just "2026-03-25"
    } else {
      // Already in YYYY-MM-DD format
      dateOnly = shiftDate
    }
    
    // Normalize time format to ensure consistent parsing
    const normalizeTime = (timeStr) => {
      if (!timeStr) return null
      // Handle different time formats (HH:MM, HH:MM:SS)
      const timeParts = timeStr.split(':')
      const hours = timeParts[0].padStart(2, '0')
      const minutes = timeParts[1] ? timeParts[1].padStart(2, '0') : '00'
      return `${hours}:${minutes}:00`
    }
    
    const normalizedStartTime = normalizeTime(startTime)
    const normalizedEndTime = normalizeTime(endTime)
    
    // Create proper Date objects with normalized date and time
    const startDateTime = new Date(`${dateOnly}T${normalizedStartTime}`)
    const endDateTime = new Date(`${dateOnly}T${normalizedEndTime}`)
    
    // Validate the created dates
    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return null
    }
    
    const isOffered = !!shift.is_open
    const eventClass = isOffered ? 'shift-offered' : (shift.status === 'pending' ? 'shift-pending' : 'shift-confirmed')
    
    return {
      start: startDateTime,
      end: endDateTime,
      title: shift.position_name || 'Shift',
      content: shift.area_name || '',
      class: eventClass,
      shift_id: shift.shift_id,
      is_open: shift.is_open,
    }
  }).filter(Boolean) // Remove any null entries
  
  return events
})

function handleEventClick(event) {
  const shiftId = event?.shift_id
  if (!shiftId) return
  const found = shifts.value.find(s => Number(s.shift_id) === Number(shiftId))
  if (!found) return
  selectedShift.value = found
  shiftDetailsOpen.value = true
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
    // Refresh shifts & open board so UI stays consistent
    await loadUserShifts()
    openShiftsRef.value?.loadOpenShifts?.()
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

const stats = computed(() => {
  const now = new Date()
  const thisWeek = getWeekRange(now)
  const nextWeek = getWeekRange(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000))
  const thisMonth = getMonthRange(now)

  const thisWeekShifts = filterShiftsByDateRange(shifts.value, thisWeek.start, thisWeek.end)
  const nextWeekShifts = filterShiftsByDateRange(shifts.value, nextWeek.start, nextWeek.end)
  const monthShifts = filterShiftsByDateRange(shifts.value, thisMonth.start, thisMonth.end)

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
    loadingMessage.value = 'Loading your shifts...'
    
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

    loadingMessage.value = 'Loading shifts...'
    
    // Load shifts using service
    const shiftResponse = await ShiftServices.getByUser(userId)
    let userShifts = shiftResponse.data || shiftResponse || []
    
    loadingMessage.value = 'Loading position and area details...'
    
    // Load additional data for position and area names (always load these)
    const [positionResponse, areaResponse] = await Promise.all([
      PositionServices.getAll().catch(err => {
        console.error('Position service error:', err)
        return { data: [] }
      }),
      AreaServices.getAll().catch(err => {
        console.error('Area service error:', err)
        return { data: [] }
      })
    ])
    
    const positions = positionResponse.data || positionResponse || []
    const areas = areaResponse.data || areaResponse || []
    
    // Try to determine user's area using multiple approaches
    let userAreaName = null
    
    // Method 1: Try from user data with different possible field names
    const possiblePositionFields = ['position_id', 'positionId', 'Position_id']
    for (const field of possiblePositionFields) {
      if (currentUser[field]) {
        const userPosition = positions.find(p => 
          Number(p.position_id) === Number(currentUser[field]) || 
          Number(p.positionId) === Number(currentUser[field])
        )
        if (userPosition) {
          const userAreaFromPosition = areas.find(a => 
            Number(a.area_id) === Number(userPosition.area_id) ||
            Number(a.areaId) === Number(userPosition.area_id)
          )
          if (userAreaFromPosition && userAreaFromPosition.area_name !== 'Unknown Area') {
            userAreaName = userAreaFromPosition.area_name
            break
          }
        }
      }
    }
    
    // Method 2: If no area from user data, try from shifts
    if (!userAreaName && userShifts.length > 0) {
      const firstShift = userShifts[0]
      const position = positions.find(p => Number(p.position_id) === Number(firstShift.position_id))
      if (position) {
        const area = areas.find(a => Number(a.area_id) === Number(position.area_id))
        if (area && area.area_name !== 'Unknown Area') {
          userAreaName = area.area_name
        }
      }
    }
    
    // Method 3: If still no area, check if areas array has data and use first available area
    if (!userAreaName && areas.length > 0) {
      const firstArea = areas[0]
      if (firstArea && firstArea.area_name !== 'Unknown Area') {
        userAreaName = firstArea.area_name
      }
    }
    
    // Store the user's area for the header
    if (userAreaName) {
      userArea.value = userAreaName
    }
    
    if (userShifts.length === 0) {
      shifts.value = []
      loading.value = false
      loadingMessage.value = 'No shifts scheduled'
      return
    }
    
    // Enhance shifts with position and area names
    const enhancedShifts = userShifts.map(shift => {
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
    console.error('Error loading user shifts:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      response: error.response
    })
    
    let errorMessage = 'Failed to load data'
    if (error.message.includes('Network Error') || error.code === 'NETWORK_ERROR') {
      errorMessage = 'Cannot connect to server - please check if backend is running'
    } else if (error.response?.status === 401) {
      errorMessage = 'Authentication failed - please log in again'
    } else if (error.response?.status === 404) {
      errorMessage = 'API endpoint not found - please check backend configuration'
    } else if (error.response?.status >= 500) {
      errorMessage = 'Server error - please try again later'
    } else {
      errorMessage = error.message || 'Failed to load data'
    }
    
    loadingMessage.value = `Error: ${errorMessage}`
    shifts.value = []
  } finally {
    setTimeout(() => {
      loading.value = false
    }, 500) // Small delay to show final message
  }
}

onMounted(async () => {
  const currentUser = Utils.getStore('user')
  
  if (currentUser) {
    user.value = currentUser
    
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (loading.value) {
        loading.value = false
        loadingMessage.value = 'Loading timeout - please refresh the page'
      }
    }, 30000) // 30 second timeout
    
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

// Add retry function
function retryLoadData() {
  loadUserShifts()
  openShiftsRef.value?.loadOpenShifts?.()
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
  box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.1);
}

.calendar-header {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border-bottom: 1px solid #e2e8f0;
}

.calendar-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #b91c1c;
  margin: 0;
}

.view-toggle {
  display: flex;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(220, 38, 38, 0.1);
}

.toggle-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: #b91c1c;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.toggle-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.toggle-btn.active {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
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
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: white;
  padding: 16px 24px;
  border: none;
}

:deep(.vuecal__title) {
  font-weight: 600;
  font-size: 1.1rem;
}

:deep(.vuecal__arrow) {
  color: white;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 6px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

:deep(.vuecal__arrow:hover) {
  background: rgba(255, 255, 255, 0.25);
}

:deep(.vuecal__weekdays) {
  background: #fef2f2;
  padding: 12px 0;
  border-bottom: 1px solid #e2e8f0;
}

:deep(.vuecal__weekday-label) {
  color: #b91c1c;
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
  background: #fef2f2;
  border-right: 1px solid #e2e8f0;
}

:deep(.vuecal__time-cell) {
  color: #b91c1c;
  font-weight: 500;
  font-size: 0.8rem;
}

:deep(.vuecal__event.shift-confirmed) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  border: none;
  border-radius: 6px;
  color: white;
  border-left: 3px solid #991b1b;
}

:deep(.vuecal__event.shift-pending) {
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  border: none;
  border-radius: 6px;
  color: white;
  border-left: 3px solid #dc2626;
}

:deep(.vuecal__event.shift-confirmed:hover) {
  background: linear-gradient(135deg, #b91c1c 0%, #991b1b 100%);
  transform: translateY(-1px);
}

:deep(.vuecal__event.shift-pending:hover) {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  transform: translateY(-1px);
}

/* Offered shift styling */
::deep(.vuecal__event.shift-offered) {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  border: none;
  border-radius: 6px;
  color: #1f2937;
  border-left: 3px solid #d97706;
}

::deep(.vuecal__event.shift-offered:hover) {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
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