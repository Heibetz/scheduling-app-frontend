<template>
  <div
    class="shifts-container"
    :class="{ 'mb-8': !embedded, 'shifts-container--embedded': embedded }"
  >
    <h2 v-if="!hideHeading" class="mb-2">Open Shifts</h2>
    <p v-if="!loading" class="open-shifts-count mb-4">
      {{ availabilitySentence }}
    </p>
    <div v-if="!loading" class="open-shift-filters mb-4">
      <button
        type="button"
        class="toggle-btn"
        :class="{ active: selectedPositionFilter === null }"
        @click="selectedPositionFilter = null"
      >
        All
      </button>
      <button
        v-for="opt in positionFilterOptions"
        :key="'pos-' + opt.position_name"
        type="button"
        class="toggle-btn"
        :class="{ active: isPositionFilterActive(opt.position_name) }"
        @click="selectedPositionFilter = opt.position_name"
      >
        {{ opt.position_name }}
      </button>
    </div>
    <div v-if="loading" class="d-flex align-center pa-4">
      <v-progress-circular indeterminate size="24" class="mr-3" color="primary" />
      <span>Loading open shifts...</span>
    </div>
    <div v-else-if="filteredShifts.length" class="shifts-grid">
      <div v-for="shift in filteredShifts" :key="'open-' + shift.shift_id" class="shift-card">
        <!-- Top -->
        <div class="shift-card__top">
          <div class="shift-card__date">
            <div class="dow">{{ formatDow(shift.shift_date) }}</div>
            <div class="dayNum">{{ formatDayNum(shift.shift_date) }}</div>
            <div class="mon">{{ formatMon(shift.shift_date) }}</div>
          </div>
          <div class="shift-card__topInfo">
            <div class="timeRange">{{ formatTimeRange(shift.start_time, shift.end_time) }}</div>
            <div class="deptName">{{ shift.area_name || '—' }}</div>
          </div>
        </div>

        <!-- Middle -->
        <div class="shift-card__middle">
          <div class="pill pill--position">{{ shift.position_name || '—' }}</div>
          <div class="meta">{{ calcDurationHours(shift) }}h</div>
          <div v-if="shift.source === 'manager'" class="pill pill--manager">
            Posted by manager
          </div>
          <div v-else-if="shift.source === 'worker'" class="pill pill--worker">
            Offered by worker
          </div>
          <div v-if="isUrgent(shift)" class="pill pill--urgent">
            Urgent
          </div>
        </div>

        <!-- Bottom -->
        <div class="shift-card__divider" />
        <div class="shift-card__bottom">
          <div class="status">
            <span v-if="isMyOfferedShift(shift)" class="statusText statusText--offered">Offered</span>
            <span v-else class="statusText">Open</span>
          </div>

          <div class="actions">
            <v-btn
              class="claim-btn text-none"
              size="small"
              variant="flat"
              :disabled="isMyOfferedShift(shift)"
              @click="openClaimModal(shift)"
            >
              Claim
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-shifts">
      <v-icon size="48" color="grey-lighten-1">mdi-briefcase-outline</v-icon>
      <p class="mt-4 text-grey-darken-1">{{ emptyMessage }}</p>
    </div>

    <v-dialog v-model="claimModalOpen" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">Claim this shift?</v-card-title>
        <v-card-text v-if="claimModalShift">
          <p class="mb-2">
            This shift will be added to your schedule.
          </p>
          <ul class="claim-detail-list text-body-2">
            <li><strong>Date:</strong> {{ formatDay(claimModalShift.shift_date) }}, {{ formatDate(claimModalShift.shift_date) }}</li>
            <li><strong>Time:</strong> {{ formatTimeRange(claimModalShift.start_time, claimModalShift.end_time) }}</li>
            <li><strong>Department:</strong> {{ claimModalShift.area_name || '—' }}</li>
            <li><strong>Position:</strong> {{ claimModalShift.position_name || '—' }}</li>
          </ul>
          <v-alert
            v-if="claimError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ claimError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4 dialog-actions">
          <v-spacer />
          <v-btn variant="outlined" color="grey-darken-2" class="text-none" @click="closeClaimModal">Cancel</v-btn>
          <v-btn
            class="claim-btn text-none"
            variant="flat"
            :loading="claimSubmitting"
            @click="confirmClaim"
          >
            Yes, claim
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="successOpen" color="success" timeout="2500">
      Shift claimed! It has been added to your schedule
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Utils from '../config/utils'
import ShiftServices from '../services/shiftServices'
import { refreshWorkerAttention } from '../utils/workerAttention.js'

const props = defineProps({
  /** When true, used inside Open Shifts page: no outer card, no duplicate heading. */
  embedded: { type: Boolean, default: false },
  /** Hide the "Open Shifts" h2 (e.g. when parent supplies the section title). */
  hideHeading: { type: Boolean, default: false },
})

const emit = defineEmits(['shift-claimed'])

const loading = ref(false)
const shifts = ref([])
/** null = All; otherwise selected `position_name` */
const selectedPositionFilter = ref(null)

const claimModalOpen = ref(false)
const claimModalShift = ref(null)
const claimSubmitting = ref(false)
const claimError = ref('')
const successOpen = ref(false)

/** Unique `position_name` values from loaded shifts, sorted A–Z */
const positionFilterOptions = computed(() => {
  const seen = new Set()
  const out = []
  for (const s of shifts.value) {
    const name = (s.position_name ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push({ position_name: name })
  }
  out.sort((a, b) =>
    a.position_name.localeCompare(b.position_name, undefined, { sensitivity: 'base' })
  )
  return out
})

function isPositionFilterActive(positionName) {
  return selectedPositionFilter.value === positionName
}

const filteredShifts = computed(() => {
  const list = shifts.value
  if (selectedPositionFilter.value == null) return list
  const name = selectedPositionFilter.value
  return list.filter((s) => (s.position_name ?? '').trim() === name)
})

const availabilitySentence = computed(() => {
  const n = filteredShifts.value.length
  const label = n === 1 ? 'shift' : 'shifts'
  if (selectedPositionFilter.value == null) {
    return `${n} ${label} available in your area`
  }
  return `${n} ${label} available for ${selectedPositionFilter.value}`
})

const emptyMessage = computed(() => {
  if (selectedPositionFilter.value != null && filteredShifts.value.length === 0) {
    return 'No open shifts available for this position right now'
  }
  return 'No open shifts available right now'
})

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDow(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}

function formatDayNum(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric' })
}

function formatMon(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
}

function calcDurationHours(shift) {
  if (!shift?.start_time || !shift?.end_time) return '0.0'
  const parse = (t) => {
    const [hh, mm] = String(t).split(':')
    return (Number(hh) || 0) * 60 + (Number(mm) || 0)
  }
  const start = parse(shift.start_time)
  const end = parse(shift.end_time)
  const mins = Math.max(0, end - start)
  return (mins / 60).toFixed(1)
}

function isMyOfferedShift(shift) {
  const currentUser = Utils.getStore('user')
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id
  return userId != null && shift?.user_id != null && Number(shift.user_id) === Number(userId)
}

function isUrgent(shift) {
  if (!shift?.shift_date) return false
  // Use shift_date + start_time if available to reduce false positives.
  const dateOnly = String(shift.shift_date).includes('T')
    ? String(shift.shift_date).slice(0, 10)
    : String(shift.shift_date)
  const time = shift.start_time ? String(shift.start_time).slice(0, 5) : '00:00'
  const dt = new Date(`${dateOnly}T${time}:00`)
  if (Number.isNaN(dt.getTime())) return false
  const diffMs = dt.getTime() - Date.now()
  return diffMs >= 0 && diffMs <= 48 * 60 * 60 * 1000
}

function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return '--'
  const format = (time) => {
    const timeParts = time.split(':')
    const hour = parseInt(timeParts[0], 10)
    const minute = timeParts[1] || '00'
    const period = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minute} ${period}`
  }
  return `${format(startTime)} - ${format(endTime)}`
}

function openClaimModal(shift) {
  claimError.value = ''
  claimModalShift.value = shift
  claimModalOpen.value = true
}

function closeClaimModal() {
  claimModalOpen.value = false
  claimModalShift.value = null
  claimError.value = ''
}

async function confirmClaim() {
  const shift = claimModalShift.value
  const currentUser = Utils.getStore('user')
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id
  if (!shift || !userId) return

  claimSubmitting.value = true
  claimError.value = ''
  try {
    await ShiftServices.claim(shift.shift_id)
    // Remove claimed shift immediately from the grid and update count/filters.
    shifts.value = shifts.value.filter((s) => Number(s.shift_id) !== Number(shift.shift_id))
    successOpen.value = true
    emit('shift-claimed')
    refreshWorkerAttention()
    closeClaimModal()
  } catch (e) {
    if (e.response?.status === 409) {
      claimError.value = 'This shift was just taken by someone else'
      // Refresh the open shifts list so the UI stays accurate.
      await loadOpenShifts()
    } else {
      claimError.value = e.response?.data?.message || e.message || 'Could not claim shift'
    }
  } finally {
    claimSubmitting.value = false
  }
}

async function loadOpenShifts() {
  const currentUser = Utils.getStore('user')
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id
  if (!userId) {
    shifts.value = []
    selectedPositionFilter.value = null
    return
  }
  loading.value = true
  try {
    const openRes = await ShiftServices.getOpenForUser(userId)
    const raw = openRes.data ?? openRes ?? {}
    selectedPositionFilter.value = null
    if (Array.isArray(raw)) {
      shifts.value = raw
    } else {
      shifts.value = raw.shifts ?? []
    }
  } catch (e) {
    console.error('Error loading open shifts:', e)
    shifts.value = []
    selectedPositionFilter.value = null
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOpenShifts()
})

defineExpose({ loadOpenShifts })
</script>

<style scoped>
.shifts-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
}

.shifts-container--embedded {
  border: none;
  padding: 0;
  background: transparent;
}

.shifts-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 8px 0;
}

.open-shifts-count {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
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

.open-shift-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.open-shift-filters .toggle-btn {
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: #fff;
  color: #b91c1c;
}

.open-shift-filters .toggle-btn:hover {
  background: #fee2e2;
  color: #b91c1c;
}

.open-shift-filters .toggle-btn.active {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  color: #fff;
  border-color: #b91c1c;
}

.shifts-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.shift-card {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background: #ffffff;
  border: 0.5px solid #e2e8f0;
  border-radius: 12px;
  transition: border-color 0.2s ease;
}

.shift-card:hover {
  border-color: #cbd5e1;
}

.shift-card__top {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.shift-card__date {
  width: 56px;
  flex: 0 0 56px;
  text-align: left;
  line-height: 1.1;
}

.shift-card__date .dow {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
}

.shift-card__date .dayNum {
  font-size: 1.375rem;
  font-weight: 700;
  color: #1a202c;
  margin-top: 2px;
}

.shift-card__date .mon {
  font-size: 0.75rem;
  font-weight: 700;
  color: #64748b;
  margin-top: 2px;
}

.shift-card__topInfo {
  flex: 1;
  min-width: 0;
}

.shift-card__topInfo .timeRange {
  font-size: 0.875rem;
  font-weight: 600;
  color: #1a202c;
}

.shift-card__topInfo .deptName {
  margin-top: 2px;
  font-size: 0.875rem;
  color: #64748b;
}

.shift-card__middle {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-top: 12px;
}

.pill {
  display: inline-flex;
  align-items: center;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.pill--position {
  background: #f1f5f9;
  color: #475569;
}

.pill--manager {
  background: #E6F1FB;
  color: #0C447C;
}

.pill--worker {
  background: #FAEEDA;
  color: #633806;
}

.pill--urgent {
  background: #FCEBEB;
  color: #791F1F;
}

.meta {
  font-size: 0.75rem;
  color: #64748b;
  font-weight: 600;
}

.shift-card__divider {
  height: 1px;
  background: #e2e8f0;
  margin: 12px 0;
}

.shift-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.statusText {
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
}

.statusText--requested {
  color: #94a3b8;
}

.statusText--offered {
  color: #b45309;
}

.claim-btn {
  background-color: #C8102E !important;
  color: #ffffff !important;
}

.claim-detail-list {
  margin: 0;
  padding-left: 1.25rem;
}

.empty-shifts {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #64748b;
  text-align: center;
}

.dialog-actions {
  gap: 8px;
}

@media (max-width: 768px) {
  .shifts-grid {
    grid-template-columns: 1fr;
  }
}
</style>
