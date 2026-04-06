<template>
  <v-card class="shifts-container mb-8" elevation="0">
    <h2 class="mb-4">Open Shifts</h2>
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
      <div
        v-for="shift in filteredShifts"
        :key="'open-' + shift.shift_id"
        class="shift-card"
      >
        <div class="shift-date">
          <span class="day">{{ formatDay(shift.shift_date) }}</span>
          <span class="date">{{ formatDate(shift.shift_date) }}</span>
        </div>
        <div class="shift-info">
          <p class="mb-1">{{ formatTimeRange(shift.start_time, shift.end_time) }}</p>
          <h4 class="text-body-1 font-weight-medium mb-1">{{ shift.area_name || '—' }}</h4>
          <span class="shift-area">{{ shift.position_name || '—' }}</span>
        </div>
        <div
          v-if="!hasPendingClaim(shift.shift_id)"
          class="shift-actions"
        >
          <v-btn
            color="primary"
            size="small"
            variant="tonal"
            @click="openClaimModal(shift)"
          >
            Claim
          </v-btn>
        </div>
        <div
          v-else
          class="shift-actions shift-actions--claimed d-flex flex-wrap align-center justify-end"
        >
          <v-btn
            class="request-sent-btn text-none"
            color="success"
            size="small"
            variant="flat"
            disabled
          >
            Request sent
          </v-btn>
          <v-btn
            color="error"
            size="small"
            variant="outlined"
            class="text-none"
            @click="openCancelModal(shift)"
          >
            Cancel request
          </v-btn>
        </div>
      </div>
    </div>
    <div v-else class="empty-shifts">
      <v-icon size="48" color="grey-lighten-1">mdi-briefcase-outline</v-icon>
      <p class="mt-4 text-grey-darken-1">{{ emptyMessage }}</p>
    </div>

    <v-dialog v-model="claimModalOpen" max-width="520" persistent>
      <v-card>
        <v-card-title class="text-h6">Confirm claim</v-card-title>
        <v-card-text v-if="claimModalShift">
          <p class="mb-2">
            You are about to request this open shift:
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
          <v-btn variant="outlined" color="grey-darken-2" class="text-none" @click="closeClaimModal">
            No
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            class="text-none"
            :loading="claimSubmitting"
            @click="confirmClaim"
          >
            Yes, send request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="cancelModalOpen" max-width="480" persistent>
      <v-card>
        <v-card-title class="text-h6">Cancel request</v-card-title>
        <v-card-text v-if="cancelModalShift">
          <p class="mb-2">
            Withdraw your request for this open shift?
          </p>
          <ul class="claim-detail-list text-body-2">
            <li><strong>Date:</strong> {{ formatDay(cancelModalShift.shift_date) }}, {{ formatDate(cancelModalShift.shift_date) }}</li>
            <li><strong>Time:</strong> {{ formatTimeRange(cancelModalShift.start_time, cancelModalShift.end_time) }}</li>
            <li><strong>Department:</strong> {{ cancelModalShift.area_name || '—' }}</li>
            <li><strong>Position:</strong> {{ cancelModalShift.position_name || '—' }}</li>
          </ul>
          <v-alert
            v-if="cancelError"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-3"
          >
            {{ cancelError }}
          </v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4 dialog-actions">
          <v-spacer />
          <v-btn
            variant="outlined"
            color="grey-darken-2"
            class="text-none"
            @click="closeCancelModal"
          >
            No, keep request
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            class="text-none"
            :loading="cancelSubmitting"
            @click="confirmCancelRequest"
          >
            Yes, cancel request
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import Utils from '../config/utils'
import ShiftServices from '../services/shiftServices'
import ShiftClaimServices from '../services/shiftClaimServices'

const loading = ref(false)
const shifts = ref([])
/** null = All; otherwise selected `position_name` */
const selectedPositionFilter = ref(null)

/** shift_id → shift_claim_id for pending claims */
const pendingClaimIdByShiftId = ref({})

const claimModalOpen = ref(false)
const claimModalShift = ref(null)
const claimSubmitting = ref(false)
const claimError = ref('')

const cancelModalOpen = ref(false)
const cancelModalShift = ref(null)
const cancelSubmitting = ref(false)
const cancelError = ref('')

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

const emptyMessage = computed(() => {
  if (shifts.value.length === 0) {
    return 'No open shifts available right now'
  }
  if (selectedPositionFilter.value != null && filteredShifts.value.length === 0) {
    return 'No open shifts match this filter'
  }
  return 'No open shifts available right now'
})

function getPendingClaimId(shiftId) {
  const v = pendingClaimIdByShiftId.value[Number(shiftId)]
  return v == null ? null : Number(v)
}

function hasPendingClaim(shiftId) {
  return getPendingClaimId(shiftId) != null
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short' })
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

async function loadPendingClaims(userId) {
  try {
    const res = await ShiftClaimServices.getByUser(userId)
    const rows = res.data ?? res ?? []
    const map = {}
    for (const c of rows) {
      if (c.status === 'pending') {
        map[Number(c.shift_id)] = Number(c.shift_claim_id)
      }
    }
    pendingClaimIdByShiftId.value = map
  } catch (e) {
    console.error('Error loading shift claims:', e)
    pendingClaimIdByShiftId.value = {}
  }
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

function openCancelModal(shift) {
  cancelError.value = ''
  cancelModalShift.value = shift
  cancelModalOpen.value = true
}

function closeCancelModal() {
  cancelModalOpen.value = false
  cancelModalShift.value = null
  cancelError.value = ''
}

async function confirmCancelRequest() {
  const shift = cancelModalShift.value
  const currentUser = Utils.getStore('user')
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id
  const claimId = shift ? getPendingClaimId(shift.shift_id) : null
  if (!shift || !userId || claimId == null) return

  cancelSubmitting.value = true
  cancelError.value = ''
  try {
    await ShiftClaimServices.cancel(claimId)
    await loadPendingClaims(userId)
    closeCancelModal()
  } catch (e) {
    cancelError.value = e.response?.data?.message || e.message || 'Could not cancel request'
  } finally {
    cancelSubmitting.value = false
  }
}

async function confirmClaim() {
  const shift = claimModalShift.value
  const currentUser = Utils.getStore('user')
  const userId = currentUser?.userId || currentUser?.user_id || currentUser?.id
  if (!shift || !userId) return

  claimSubmitting.value = true
  claimError.value = ''
  try {
    await ShiftClaimServices.create({
      shift_id: shift.shift_id,
      user_id: userId,
    })
    await loadPendingClaims(userId)
    closeClaimModal()
  } catch (e) {
    const msg = e.response?.data?.message || e.message || 'Could not send request'
    claimError.value = msg
    if (e.response?.status === 409) {
      await loadPendingClaims(userId)
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
    pendingClaimIdByShiftId.value = {}
    return
  }
  loading.value = true
  try {
    const [openRes] = await Promise.all([
      ShiftServices.getOpenForUser(userId),
      loadPendingClaims(userId),
    ])
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
    pendingClaimIdByShiftId.value = {}
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

.shifts-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 24px 0;
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
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.shift-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  transition: all 0.2s;
  gap: 12px;
}

.shift-card:hover {
  border-color: #cbd5e1;
  transform: translateY(-1px);
}

.shift-date {
  min-width: 80px;
  margin-right: 12px;
  flex-shrink: 0;
}

.shift-date .day {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
}

.shift-date .date {
  display: block;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1a202c;
}

.shift-info {
  flex: 1;
  min-width: 0;
}

.shift-info h4 {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1a202c;
  margin: 0 0 4px 0;
}

.shift-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0 0 4px 0;
}

.shift-area {
  font-size: 0.75rem;
  color: #94a3b8;
}

.shift-actions {
  flex-shrink: 0;
  margin-left: auto;
}

.shift-actions--claimed {
  gap: 8px;
}

/* Keep "Request sent" readable: default disabled styling washes out grey tonals */
.shift-actions :deep(.request-sent-btn.v-btn--disabled),
.shift-actions :deep(.request-sent-btn[disabled]) {
  opacity: 1 !important;
  background-color: #c8e6c9 !important;
  color: #1b5e20 !important;
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
}

.dialog-actions {
  gap: 8px;
}

@media (max-width: 768px) {
  .shift-card {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .shift-date {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .shift-actions {
    margin-left: 0;
    width: 100%;
  }

  .shift-actions :deep(.v-btn) {
    width: 100%;
  }
}
</style>
