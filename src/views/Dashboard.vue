<template>
  <v-container fluid class="pa-4">
    <!-- Welcome Section -->
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">Welcome back, {{ userFullName }}</h1>
      <p class="text-subtitle-1 text-grey-darken-1">{{ userRole }} - Your work schedule and hours</p>
    </div>

    <!-- Statistics Cards Row -->
    <v-row class="mb-6">
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center mb-2">
            <v-icon color="primary" class="mr-2">mdi-clock-outline</v-icon>
            <span class="text-subtitle-2 font-weight-medium">This Week's Hours</span>
          </div>
          <div class="text-h3 font-weight-bold">{{ thisWeekHours }}</div>
          <div class="text-caption text-grey-darken-1">{{ thisWeekShifts }} shifts</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center mb-2">
            <v-icon color="primary" class="mr-2">mdi-calendar-outline</v-icon>
            <span class="text-subtitle-2 font-weight-medium">Next Week's Hours</span>
          </div>
          <div class="text-h3 font-weight-bold">{{ nextWeekHours }}</div>
          <div class="text-caption text-grey-darken-1">{{ nextWeekShifts }} shifts</div>
        </v-card>
      </v-col>
      
      <v-col cols="12" sm="6" md="3">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center mb-2">
            <v-icon color="primary" class="mr-2">mdi-cash</v-icon>
            <span class="text-subtitle-2 font-weight-medium">Total Hours This Month</span>
          </div>
          <div class="text-h3 font-weight-bold">{{ totalMonthHours }}</div>
          <div class="text-caption text-grey-darken-1">{{ totalMonthShifts }} shifts</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- My Upcoming Shifts Section -->
    <v-card elevation="2" class="pa-6">
      <div class="mb-4">
        <h2 class="text-h5 font-weight-bold mb-1">My Upcoming Shifts</h2>
        <p class="text-subtitle-2 text-grey-darken-1">Your scheduled work shifts for the next two weeks</p>
      </div>

      <div class="shifts-list">
        <div
          v-for="shift in upcomingShifts"
          :key="shift.id"
          class="shift-item d-flex align-center pa-4 mb-3"
        >
          <!-- Date Section -->
          <div class="shift-date mr-6" style="min-width: 200px;">
            <div class="d-flex align-center mb-1">
              <span class="text-subtitle-1 font-weight-bold">{{ shift.dayName }}, {{ shift.date }}</span>
              <v-chip
                :color="getStatusColor(shift.status)"
                size="small"
                class="ml-2"
                dark
              >
                {{ shift.status }}
              </v-chip>
            </div>
            <div class="text-body-2 text-grey-darken-1">{{ shift.timeRange }}</div>
          </div>

          <!-- Position Section -->
          <div class="shift-position flex-grow-1 mr-6">
            <div class="text-subtitle-1 font-weight-medium">{{ shift.position }}</div>
            <div class="text-body-2 text-grey-darken-1">{{ shift.location }}</div>
          </div>

          <!-- Duration Section -->
          <div class="shift-duration">
            <div class="text-subtitle-1 font-weight-bold">{{ shift.duration }}</div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="upcomingShifts.length === 0" class="text-center py-8">
        <v-icon size="64" color="grey-lighten-2" class="mb-4">mdi-calendar-blank</v-icon>
        <p class="text-h6 text-grey-darken-1">No upcoming shifts scheduled</p>
        <p class="text-body-2 text-grey-darken-2">Check back later for your schedule updates</p>
      </div>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import Utils from '../config/utils'

// User data
const user = ref(null)
const userFullName = computed(() => 
  user.value ? `${user.value.fName} ${user.value.lName}` : 'User'
)
const userRole = computed(() => 
  user.value ? 'Student Success' : 'Loading...'
)

// Statistics data (mock data for now)
const thisWeekHours = ref(12)
const thisWeekShifts = ref(3)
const nextWeekHours = ref(8)
const nextWeekShifts = ref(2)
const totalMonthHours = ref(32)
const totalMonthShifts = ref(8)

// Shifts data (mock data for now)
const upcomingShifts = ref([
  {
    id: 1,
    dayName: 'Monday',
    date: '2026-01-27',
    timeRange: '9:00 AM - 1:00 PM',
    position: 'Front Desk',
    location: 'Main Office',
    duration: '4 hrs',
    status: 'confirmed'
  },
  {
    id: 2,
    dayName: 'Wednesday',
    date: '2026-01-29',
    timeRange: '9:00 AM - 1:00 PM',
    position: 'Front Desk',
    location: 'Main Office',
    duration: '4 hrs',
    status: 'confirmed'
  },
  {
    id: 3,
    dayName: 'Thursday',
    date: '2026-01-30',
    timeRange: '9:00 AM - 1:00 PM',
    position: 'Front Desk',
    location: 'Main Office',
    duration: '4 hrs',
    status: 'confirmed'
  },
  {
    id: 4,
    dayName: 'Monday',
    date: '2026-02-03',
    timeRange: '9:00 AM - 1:00 PM',
    position: 'Front Desk',
    location: 'Main Office',
    duration: '4 hrs',
    status: 'pending'
  }
])

// Helper function to get status color
const getStatusColor = (status) => {
  switch (status.toLowerCase()) {
    case 'confirmed':
      return 'success'
    case 'pending':
      return 'warning'
    case 'cancelled':
      return 'error'
    default:
      return 'primary'
  }
}

onMounted(() => {
  // Load user data from store
  user.value = Utils.getStore('user')
})
</script>

<style scoped>
.shift-item {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
  transition: all 0.2s ease;
}

.shift-item:hover {
  background-color: #f5f5f5;
  border-color: #d0d0d0;
}

.shifts-list {
  max-height: 600px;
  overflow-y: auto;
}
</style>