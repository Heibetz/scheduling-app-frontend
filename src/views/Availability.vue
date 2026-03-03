<script setup>
import { ref, onMounted, computed } from "vue";
import Utils from "../config/utils";
import AvailabilityServices from "../services/availabilityServices";
import { useRouter } from "vue-router";

const router = useRouter();
const currentUser = ref(null);
const loading = ref(false);

// Form data for each day
const availabilityForm = ref([
  { day: 1, dayName: 'Monday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 2, dayName: 'Tuesday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 3, dayName: 'Wednesday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 4, dayName: 'Thursday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 5, dayName: 'Friday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 6, dayName: 'Saturday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
  { day: 0, dayName: 'Sunday', startTime: '09:00', endTime: '17:00', isUnavailable: true, availabilityId: null },
]);

// Snackbar for notifications
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

// Time options for dropdowns
const timeOptions = ref([]);

// Form validation
const isFormValid = ref(true);

// Check if user has access
const hasAccess = computed(() => {
  return currentUser.value && !currentUser.value.is_super_admin;
});

// Generate time options (24-hour format, 15-minute intervals)
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push(timeString);
    }
  }
  timeOptions.value = times;
};

// Load availability data from backend
const loadAvailabilityData = async () => {
  if (!currentUser.value?.userId) return;
  
  loading.value = true;
  try {
    console.log('Loading availability for user:', currentUser.value.userId);
    const response = await AvailabilityServices.getByUserId(currentUser.value.userId);
    const backendData = response.data;
    
    console.log('Backend data:', backendData);
    
    // Reset all days to unavailable first
    availabilityForm.value.forEach(dayForm => {
      dayForm.isUnavailable = true;
      dayForm.availabilityId = null;
      dayForm.startTime = '09:00';
      dayForm.endTime = '17:00';
    });
    
    // Update form with backend data - only days with active records should be available
    backendData.forEach(item => {
      const dayForm = availabilityForm.value.find(d => d.day === item.day_of_week);
      if (dayForm && item.is_active) {
        dayForm.isUnavailable = false; // Day is available
        dayForm.availabilityId = item.availability_id;
        dayForm.startTime = item.start_time.substring(0, 5); // Remove seconds
        dayForm.endTime = item.end_time.substring(0, 5); // Remove seconds
      } else if (dayForm) {
        // Day has a record but is inactive, keep it unavailable but store the ID
        dayForm.availabilityId = item.availability_id;
      }
    });
    
    console.log('Form loaded with data:', availabilityForm.value);
    
  } catch (error) {
    console.error('Error loading availability:', error);
    showSnackbar('Error loading availability data', 'error');
  } finally {
    loading.value = false;
  }
};

// Validate time for a specific day
const validateTime = (dayForm) => {
  if (!dayForm.isUnavailable && dayForm.startTime >= dayForm.endTime) {
    return 'End time must be after start time';
  }
  return null;
};

// Save all availability data
const saveAvailability = async () => {
  // Validate all forms
  const errors = [];
  availabilityForm.value.forEach(dayForm => {
    const error = validateTime(dayForm);
    if (error) {
      errors.push(`${dayForm.dayName}: ${error}`);
    }
  });
  
  if (errors.length > 0) {
    showSnackbar(errors[0], 'error');
    return;
  }
  
  loading.value = true;
  try {
    const promises = [];
    
    for (const dayForm of availabilityForm.value) {
      if (dayForm.isUnavailable) {
        // Delete if exists
        if (dayForm.availabilityId) {
          promises.push(
            AvailabilityServices.delete(dayForm.availabilityId).then(() => {
              dayForm.availabilityId = null;
            })
          );
        }
      } else {
        // Create or update
        const availabilityPayload = {
          user_id: currentUser.value.userId,
          day_of_week: dayForm.day,
          start_time: dayForm.startTime + ':00',
          end_time: dayForm.endTime + ':00',
          is_active: true
        };

        if (dayForm.availabilityId) {
          // Update existing
          promises.push(
            AvailabilityServices.update(dayForm.availabilityId, availabilityPayload)
          );
        } else {
          // Create new
          promises.push(
            AvailabilityServices.create(availabilityPayload).then((response) => {
              dayForm.availabilityId = response.data.availability_id;
            })
          );
        }
      }
    }
    
    await Promise.all(promises);
    showSnackbar('Availability saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving availability:', error);
    showSnackbar('Error saving availability', 'error');
  } finally {
    loading.value = false;
  }
};

const showSnackbar = (text, color = 'success') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
};

const resetToDefaults = () => {
  // Reset form to default values
  availabilityForm.value.forEach(dayForm => {
    dayForm.startTime = '09:00';
    dayForm.endTime = '17:00';
    // Monday-Friday available, Weekend unavailable
    dayForm.isUnavailable = dayForm.day === 0 || dayForm.day === 6;
  });
  showSnackbar('Form reset to defaults', 'info');
};

// Quick action functions
const setWeekdaysOnly = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isUnavailable = dayForm.day === 0 || dayForm.day === 6; // Sunday and Saturday
    if (!dayForm.isUnavailable) {
      dayForm.startTime = '09:00';
      dayForm.endTime = '17:00';
    }
  });
  showSnackbar('Set to weekdays only (Mon-Fri, 9:00-17:00)', 'info');
};

const setFullWeek = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isUnavailable = false;
    dayForm.startTime = '09:00';
    dayForm.endTime = '17:00';
  });
  showSnackbar('Set full week availability (9:00-17:00)', 'info');
};

const setAllUnavailable = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isUnavailable = true;
  });
  showSnackbar('All days set to unavailable', 'info');
};

onMounted(async () => {
  currentUser.value = Utils.getStore("user");
  generateTimeOptions();
  
  // Redirect if user doesn't have access
  if (!hasAccess.value) {
    router.push({ name: 'dashboard' });
    return;
  }
  
  // Load availability data from backend
  await loadAvailabilityData();
});
</script>

<template>
  <v-container fluid v-if="hasAccess">
    <!-- Header -->
    <v-row>
      <v-col>
        <div class="d-flex justify-space-between align-center mb-4">
          <div>
            <h1 class="text-h4">My Availability</h1>
            <p class="text-subtitle-1 text-grey-darken-1">
              Set your available hours for each day of the week. Click Save when done.
            </p>
          </div>
          <div>
            <v-btn 
              color="secondary"
              variant="outlined"
              class="mr-2"
              @click="resetToDefaults"
              prepend-icon="mdi-restore"
              :disabled="loading"
            >
              Reset to Default
            </v-btn>
            <v-btn 
              color="primary"
              @click="saveAvailability"
              prepend-icon="mdi-content-save"
              :loading="loading"
              size="large"
            >
              Save Availability
            </v-btn>
          </div>
        </div>
      </v-col>
    </v-row>

    <!-- Availability Form -->
    <v-card elevation="2">
      <v-card-title>
        <v-icon class="mr-2">mdi-calendar-week</v-icon>
        Weekly Schedule
      </v-card-title>
      <v-card-text>
        <v-form v-model="isFormValid" ref="form">
          <div class="availability-grid">
            <!-- Table Header -->
            <v-row class="font-weight-bold bg-grey-lighten-4 pa-3 ma-0">
              <v-col cols="3" class="text-center">Day of Week</v-col>
              <v-col cols="3" class="text-center">Start Time</v-col>
              <v-col cols="3" class="text-center">End Time</v-col>
              <v-col cols="3" class="text-center">Unavailable</v-col>
            </v-row>
            
            <!-- Day Rows -->
            <div v-for="(dayForm, index) in availabilityForm" :key="dayForm.day">
              <v-row 
                class="day-row pa-3 ma-0" 
                :class="{ 'unavailable-row': dayForm.isUnavailable }"
              >
                <v-col cols="3" class="d-flex align-center">
                  <v-icon 
                    class="mr-2" 
                    :color="dayForm.isUnavailable ? 'grey' : 'primary'"
                  >
                    mdi-calendar-today
                  </v-icon>
                  <span class="text-h6">{{ dayForm.dayName }}</span>
                </v-col>
                
                <v-col cols="3">
                  <v-select
                    v-model="dayForm.startTime"
                    :items="timeOptions"
                    label="Start Time"
                    density="compact"
                    variant="outlined"
                    :disabled="dayForm.isUnavailable || loading"
                    :rules="[() => validateTime(dayForm) || true]"
                    prepend-inner-icon="mdi-clock-start"
                  ></v-select>
                </v-col>
                
                <v-col cols="3">
                  <v-select
                    v-model="dayForm.endTime"
                    :items="timeOptions"
                    label="End Time"
                    density="compact"
                    variant="outlined"
                    :disabled="dayForm.isUnavailable || loading"
                    :rules="[() => validateTime(dayForm) || true]"
                    prepend-inner-icon="mdi-clock-end"
                  ></v-select>
                </v-col>
                
                <v-col cols="3" class="d-flex align-center justify-center">
                  <v-checkbox
                    v-model="dayForm.isUnavailable"
                    label="Unavailable"
                    color="error"
                    density="compact"
                    :disabled="loading"
                    hide-details
                  ></v-checkbox>
                </v-col>
              </v-row>
              
              <v-divider v-if="index < availabilityForm.length - 1"></v-divider>
            </div>
          </div>
        </v-form>
      </v-card-text>
    </v-card>

    <!-- Quick Actions -->
    <v-row class="mt-4">
      <v-col>
        <v-card variant="outlined">
          <v-card-title class="text-h6">
            <v-icon class="mr-2">mdi-flash</v-icon>
            Quick Actions
          </v-card-title>
          <v-card-text>
            <v-btn-group variant="outlined" class="mr-2 mb-2">
              <v-btn @click="setWeekdaysOnly" :disabled="loading">
                <v-icon class="mr-1">mdi-briefcase</v-icon>
                Weekdays Only
              </v-btn>
              <v-btn @click="setFullWeek" :disabled="loading">
                <v-icon class="mr-1">mdi-calendar</v-icon>
                Full Week
              </v-btn>
              <v-btn @click="setAllUnavailable" :disabled="loading">
                <v-icon class="mr-1">mdi-close</v-icon>
                All Unavailable
              </v-btn>
            </v-btn-group>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- Loading Overlay -->
    <v-overlay v-model="loading" class="align-center justify-center">
      <v-progress-circular
        color="primary"
        size="64"
        indeterminate
      ></v-progress-circular>
    </v-overlay>

    <!-- Snackbar for notifications -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="bottom right"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn
          variant="text"
          @click="snackbar = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </v-container>

  <!-- Access Denied -->
  <v-container v-else class="text-center">
    <v-icon size="64" color="grey">mdi-lock</v-icon>
    <h2 class="text-h5 mt-4 mb-2">Access Denied</h2>
    <p class="text-body-1 text-grey">You don't have permission to access this page.</p>
    <v-btn color="primary" @click="router.push({ name: 'dashboard' })">
      Go to Dashboard
    </v-btn>
  </v-container>
</template>

<style scoped>
.availability-grid {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.day-row {
  border-bottom: 1px solid #f5f5f5;
  transition: background-color 0.2s ease;
}

.day-row:hover {
  background-color: #f8f9fa;
}

.unavailable-row {
  background-color: #fafafa;
  opacity: 0.7;
}

.unavailable-row .v-select {
  opacity: 0.5;
}

.text-h4 {
  color: #1976d2;
}

.v-btn-group {
  flex-wrap: wrap;
}
</style>