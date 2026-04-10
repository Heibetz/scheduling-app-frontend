<template>
  <v-card class="shifts-container mb-8" elevation="0">
    <div class="header-row">
      <div>
        <h2 class="mb-1">Open Shifts</h2>
        <p v-if="!loading" class="open-shifts-count">
          {{ filteredShifts.length }} open {{ filteredShifts.length === 1 ? 'shift' : 'shifts' }} in your area
        </p>
      </div>
    </div>

    <div v-if="loading" class="d-flex align-center pa-4">
      <v-progress-circular indeterminate size="24" class="mr-3" color="primary" />
      <span>Loading open shifts...</span>
    </div>

    <div v-else-if="filteredShifts.length" class="shifts-grid">
      <div v-for="shift in filteredShifts" :key="'mgr-open-' + shift.shift_id" class="shift-card">
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

        <div class="shift-card__middle">
          <div class="pill pill--position">{{ shift.position_name || '—' }}</div>
          <div class="meta">{{ calcDurationHours(shift) }}h</div>
          <div v-if="shift.source === 'manager'" class="pill pill--manager">Posted by manager</div>
          <div v-else-if="shift.source === 'worker'" class="pill pill--worker">Offered by worker</div>
          <div v-if="isUrgent(shift)" class="pill pill--urgent">Urgent</div>
        </div>

        <div class="shift-card__divider" />
        <div class="shift-card__bottom">
          <div class="status">
            <span class="statusText">Open</span>
          </div>
          <div class="actions">
            <v-btn
              color="error"
              size="small"
              variant="outlined"
              class="text-none"
              @click="removeOpenShift(shift)"
            >
              Remove
            </v-btn>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-shifts">
      <v-icon size="48" color="grey-lighten-1">mdi-briefcase-outline</v-icon>
      <p class="mt-4 text-grey-darken-1">No open shifts available right now</p>
    </div>

  </v-card>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import Utils from '../config/utils'
import ShiftServices from '../services/shiftServices'
import PositionServices from '../services/positionServices'

const props = defineProps({
  areaId: { type: [Number, String], required: true },
})

const loading = ref(false)
const shifts = ref([])

const user = computed(() => Utils.getStore('user'))

const positionOptions = ref([])
// Note: Managers post open shifts via the calendar by leaving them unassigned.

const filteredShifts = computed(() => shifts.value)

function formatDow(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()
}
function formatDayNum(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { day: 'numeric' })
}
function formatMon(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
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
function isUrgent(shift) {
  if (!shift?.shift_date) return false
  const dateOnly = String(shift.shift_date).includes('T') ? String(shift.shift_date).slice(0, 10) : String(shift.shift_date)
  const time = shift.start_time ? String(shift.start_time).slice(0, 5) : '00:00'
  const dt = new Date(`${dateOnly}T${time}:00`)
  if (Number.isNaN(dt.getTime())) return false
  const diffMs = dt.getTime() - Date.now()
  return diffMs >= 0 && diffMs <= 48 * 60 * 60 * 1000
}

async function loadOpenShifts() {
  const u = user.value
  const userId = u?.userId || u?.user_id || u?.id
  if (!userId) {
    shifts.value = []
    return
  }
  loading.value = true
  try {
    const res = await ShiftServices.getOpenForManager(userId)
    const raw = res.data ?? res ?? {}
    shifts.value = Array.isArray(raw) ? raw : (raw.shifts ?? [])
  } finally {
    loading.value = false
  }
}

async function loadPositions() {
  const res = await PositionServices.getAll()
  const rows = res.data ?? res ?? []
  const areaId = Number(props.areaId)
  positionOptions.value = areaId ? rows.filter(p => Number(p.area_id) === areaId) : []
}

async function removeOpenShift(shift) {
  await ShiftServices.patch(shift.shift_id, { is_open: 0 })
  shifts.value = shifts.value.filter(s => Number(s.shift_id) !== Number(shift.shift_id))
}

let intervalId = null
function handleVisibilityChange() {
  if (!document.hidden) {
    loadOpenShifts()
  }
}

onMounted(() => {
  loadPositions()
  loadOpenShifts()

  document.addEventListener('visibilitychange', handleVisibilityChange)
  intervalId = setInterval(() => {
    if (!document.hidden) loadOpenShifts()
  }, 15000)
})

watch(
  () => props.areaId,
  (newVal, oldVal) => {
    if (Number(newVal) !== Number(oldVal)) {
      loadPositions()
      loadOpenShifts()
    }
  }
)

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  if (intervalId) clearInterval(intervalId)
})
</script>

<style scoped>
.shifts-container {
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 24px;
}

.header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.open-shifts-count {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
}

.post-btn {
  background-color: #C8102E !important;
  color: #ffffff !important;
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

.shift-card__date .dow,
.shift-card__date .mon {
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

.empty-shifts {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: #64748b;
  text-align: center;
}

@media (max-width: 768px) {
  .shifts-grid {
    grid-template-columns: 1fr;
  }
}
</style>

