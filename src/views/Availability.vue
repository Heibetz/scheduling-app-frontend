<script setup>
import { ref, onMounted, computed } from "vue";
import Utils from "../config/utils";
import AvailabilityServices from "../services/availabilityServices";
import { useRouter } from "vue-router";

const router = useRouter();
const currentUser = ref(null);
const loading = ref(false);

// Form data for each day - updated structure to support multiple time ranges
const availabilityForm = ref([
  { 
    day: 1, 
    dayName: 'Monday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 2, 
    dayName: 'Tuesday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 3, 
    dayName: 'Wednesday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 4, 
    dayName: 'Thursday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 5, 
    dayName: 'Friday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 6, 
    dayName: 'Saturday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
  { 
    day: 0, 
    dayName: 'Sunday', 
    isUnavailable: true, 
    timeRanges: [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }] 
  },
]);

// Snackbar for notifications
const snackbar = ref(false);
const snackbarText = ref('');
const snackbarColor = ref('success');

// Form validation
const isFormValid = ref(true);
const showTimeInputs = ref({});

// Toggle time input visibility for a specific day
const toggleTimeInputs = (dayIndex) => {
  showTimeInputs.value[dayIndex] = !showTimeInputs.value[dayIndex];
};

// Get status text for a day
const getDayStatus = (dayForm) => {
  if (dayForm.isUnavailable) return 'Unavailable';
  if (dayForm.timeRanges.length === 1) {
    return `${dayForm.timeRanges[0].startTime} - ${dayForm.timeRanges[0].endTime}`;
  }
  return `${dayForm.timeRanges.length} time slots`;
};

// Check if user has access
const hasAccess = computed(() => {
  return currentUser.value && !currentUser.value.is_super_admin;
});

// Calculate total available hours for weekly summary
const totalAvailableHours = computed(() => {
  let totalHours = 0;
  availabilityForm.value.forEach(dayForm => {
    if (!dayForm.isUnavailable) {
      dayForm.timeRanges.forEach(range => {
        const startTime24 = convertTo24Hour(range.startTime);
        const endTime24 = convertTo24Hour(range.endTime);
        const [startHours, startMinutes] = startTime24.split(':').map(Number);
        const [endHours, endMinutes] = endTime24.split(':').map(Number);
        const startTotalMinutes = startHours * 60 + startMinutes;
        const endTotalMinutes = endHours * 60 + endMinutes;
        const durationMinutes = endTotalMinutes - startTotalMinutes;
        totalHours += durationMinutes / 60;
      });
    }
  });
  return totalHours;
});

// Time options for dropdowns
const timeOptions = ref([]);
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeString = convertTo12Hour(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      times.push(timeString);
    }
  }
  timeOptions.value = times;
};

// Convert 24-hour time to 12-hour AM/PM format
const convertTo12Hour = (time24) => {
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

// Convert 12-hour AM/PM time to 24-hour format
const convertTo24Hour = (time12) => {
  const [time, period] = time12.split(' ');
  const [hours, minutes] = time.split(':').map(Number);
  let hours24 = hours;
  
  if (period === 'AM' && hours === 12) {
    hours24 = 0;
  } else if (period === 'PM' && hours !== 12) {
    hours24 = hours + 12;
  }
  
  return `${hours24.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
      dayForm.timeRanges = [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }];
    });
    
    // Group backend data by day of week
    const dataByDay = {};
    backendData.forEach(item => {
      if (!dataByDay[item.day_of_week]) {
        dataByDay[item.day_of_week] = [];
      }
      if (item.is_active) {
        dataByDay[item.day_of_week].push({
          startTime: item.start_time.substring(0, 5),
          endTime: item.end_time.substring(0, 5),
          availabilityId: item.availability_id
        });
      }
    });
    
    // Update form with backend data - support multiple time ranges per day
    Object.keys(dataByDay).forEach(dayOfWeek => {
      const dayForm = availabilityForm.value.find(d => d.day === parseInt(dayOfWeek));
      if (dayForm && dataByDay[dayOfWeek].length > 0) {
        dayForm.isUnavailable = false;
        // Convert 24-hour times from backend to 12-hour format for display
        dayForm.timeRanges = dataByDay[dayOfWeek].map(range => ({
          startTime: convertTo12Hour(range.startTime),
          endTime: convertTo12Hour(range.endTime),
          availabilityId: range.availabilityId
        }));
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

// Validate time ranges for a specific day
const validateTimeRanges = (dayForm) => {
  if (dayForm.isUnavailable) return null;
  
  for (let i = 0; i < dayForm.timeRanges.length; i++) {
    const range = dayForm.timeRanges[i];
    // Convert to 24-hour for comparison
    const startTime24 = convertTo24Hour(range.startTime);
    const endTime24 = convertTo24Hour(range.endTime);
    
    if (startTime24 >= endTime24) {
      return `Time range ${i + 1}: End time must be after start time`;
    }
    
    // Check for overlapping ranges
    for (let j = i + 1; j < dayForm.timeRanges.length; j++) {
      const otherRange = dayForm.timeRanges[j];
      const otherStartTime24 = convertTo24Hour(otherRange.startTime);
      const otherEndTime24 = convertTo24Hour(otherRange.endTime);
      
      if (
        (startTime24 < otherEndTime24 && endTime24 > otherStartTime24) ||
        (otherStartTime24 < endTime24 && otherEndTime24 > startTime24)
      ) {
        return `Time ranges ${i + 1} and ${j + 1} overlap`;
      }
    }
  }
  return null;
};

// Save all availability data
const saveAvailability = async () => {
  // Validate all forms
  const errors = [];
  availabilityForm.value.forEach(dayForm => {
    const error = validateTimeRanges(dayForm);
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
        // Delete all existing time ranges for this day
        dayForm.timeRanges.forEach(range => {
          if (range.availabilityId) {
            promises.push(
              AvailabilityServices.delete(range.availabilityId).then(() => {
                range.availabilityId = null;
              })
            );
          }
        });
      } else {
        // Handle multiple time ranges for this day
        dayForm.timeRanges.forEach(range => {
          const availabilityPayload = {
            user_id: currentUser.value.userId,
            day_of_week: dayForm.day,
            start_time: convertTo24Hour(range.startTime) + ':00',
            end_time: convertTo24Hour(range.endTime) + ':00',
            is_active: true
          };

          if (range.availabilityId) {
            // Update existing
            promises.push(
              AvailabilityServices.update(range.availabilityId, availabilityPayload)
            );
          } else {
            // Create new
            promises.push(
              AvailabilityServices.create(availabilityPayload).then((response) => {
                range.availabilityId = response.data.availability_id;
              })
            );
          }
        });
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
    dayForm.timeRanges = [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }];
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
      dayForm.timeRanges = [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }];
    }
  });
  showSnackbar('Set to weekdays only (Mon-Fri, 9:00 AM - 5:00 PM)', 'info');
};

const setFullWeek = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isUnavailable = false;
    dayForm.timeRanges = [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }];
  });
  showSnackbar('Set full week availability (9:00 AM - 5:00 PM)', 'info');
};

const setAllUnavailable = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isUnavailable = true;
  });
  showSnackbar('All days set to unavailable', 'info');
};

// Add and remove time range functions
const addTimeRange = (dayForm) => {
  const lastRange = dayForm.timeRanges[dayForm.timeRanges.length - 1];
  const newStartTime = lastRange ? lastRange.endTime : '9:00 AM';
  const newEndTime = getNextTimeSlot(newStartTime, 60); // Add 1 hour by default
  
  dayForm.timeRanges.push({
    startTime: newStartTime,
    endTime: newEndTime,
    availabilityId: null
  });
};

const removeTimeRange = (dayForm, index) => {
  if (dayForm.timeRanges.length > 1) {
    const rangeToRemove = dayForm.timeRanges[index];
    if (rangeToRemove.availabilityId) {
      // If it exists in backend, delete it
      AvailabilityServices.delete(rangeToRemove.availabilityId)
        .then(() => {
          showSnackbar('Time range removed', 'success');
        })
        .catch((error) => {
          console.error('Error deleting time range:', error);
          showSnackbar('Error removing time range', 'error');
        });
    }
    dayForm.timeRanges.splice(index, 1);
  }
};

// Helper function to get next time slot
const getNextTimeSlot = (timeString, minutesToAdd) => {
  // Convert to 24-hour, add minutes, then back to 12-hour
  const time24 = convertTo24Hour(timeString);
  const [hours, minutes] = time24.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const newMinutes = totalMinutes % 60;
  const newTime24 = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
  return convertTo12Hour(newTime24);
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
  <div class="availability-page" v-if="hasAccess">
    <!-- Header Section -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">My Availability</h1>
        <p class="page-subtitle">Set your weekly availability for scheduling</p>
      </div>
      <v-btn 
        color="#2c3e50"
        class="save-btn"
        @click="saveAvailability"
        :loading="loading"
        size="large"
        rounded="lg"
      >
        <v-icon class="mr-2">mdi-clock</v-icon>
        Save Availability
      </v-btn>
    </div>

    <!-- Weekly Summary Card -->
    <v-card class="weekly-summary-card" elevation="0" rounded="lg">
      <v-card-text class="pa-6">
        <div class="d-flex align-center">
          <v-icon class="mr-3" size="20" color="#6c757d">mdi-calendar-clock</v-icon>
          <h3 class="summary-title">Weekly Summary</h3>
        </div>
        <p class="summary-subtitle">Your total available hours per week</p>
        <div class="hours-display">
          <span class="hours-number">{{ Math.round(totalAvailableHours * 10) / 10 }}</span>
          <span class="hours-label">hours per week</span>
        </div>
      </v-card-text>
    </v-card>

    <!-- Days List -->
    <div class="days-container">
      <div 
        v-for="(dayForm, dayIndex) in availabilityForm" 
        :key="dayForm.day" 
        class="day-item"
      >
        <div class="day-row">
          <div class="day-info">
            <h3 class="day-name">{{ dayForm.dayName }}</h3>
          </div>
          
          <div class="day-status">
            <v-chip
              :color="dayForm.isUnavailable ? '#e9ecef' : '#e8f5e8'"
              :text-color="dayForm.isUnavailable ? '#6c757d' : '#2d5016'"
              size="small"
              class="status-chip"
            >
              {{ getDayStatus(dayForm) }}
            </v-chip>
          </div>
          
          <div class="day-actions">
            <v-btn
              v-if="dayForm.isUnavailable"
              color="#2c3e50"
              variant="contained"
              size="small"
              rounded="lg"
              @click="dayForm.isUnavailable = false; toggleTimeInputs(dayIndex)"
              class="action-btn"
            >
              Mark Available
            </v-btn>
            <v-btn
              v-else
              color="transparent"
              variant="outlined"
              size="small"
              rounded="lg"
              @click="toggleTimeInputs(dayIndex)"
              class="edit-btn"
            >
              <v-icon size="16" class="mr-1">mdi-pencil</v-icon>
              Edit
            </v-btn>
          </div>
        </div>

        <!-- Expandable Time Input Section -->
        <v-expand-transition>
          <div v-show="showTimeInputs[dayIndex] && !dayForm.isUnavailable" class="time-inputs-section">
            <div class="time-ranges-container">
              <div 
                v-for="(range, rangeIndex) in dayForm.timeRanges" 
                :key="`${dayForm.day}-${rangeIndex}`"
                class="time-range-input"
              >
                <div class="time-input-row">
                  <div class="time-selects">
                    <v-select
                      v-model="range.startTime"
                      :items="timeOptions"
                      label="Start"
                      density="compact"
                      variant="outlined"
                      :disabled="loading"
                      class="time-select"
                      hide-details
                    ></v-select>
                    
                    <span class="time-separator">to</span>
                    
                    <v-select
                      v-model="range.endTime"
                      :items="timeOptions"
                      label="End"
                      density="compact"
                      variant="outlined"
                      :disabled="loading"
                      class="time-select"
                      hide-details
                    ></v-select>
                  </div>
                  
                  <div class="range-actions">
                    <v-btn
                      v-if="rangeIndex === dayForm.timeRanges.length - 1 && dayForm.timeRanges.length < 4"
                      icon
                      size="small"
                      color="#28a745"
                      variant="text"
                      @click="addTimeRange(dayForm)"
                    >
                      <v-icon size="18">mdi-plus</v-icon>
                    </v-btn>
                    
                    <v-btn
                      v-if="dayForm.timeRanges.length > 1"
                      icon
                      size="small"
                      color="#dc3545"
                      variant="text"
                      @click="removeTimeRange(dayForm, rangeIndex)"
                    >
                      <v-icon size="18">mdi-delete</v-icon>
                    </v-btn>
                  </div>
                </div>
                
                <!-- Validation Error -->
                <div v-if="validateTimeRanges(dayForm)" class="validation-error">
                  {{ validateTimeRanges(dayForm) }}
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="input-actions">
                <v-btn
                  variant="outlined"
                  size="small"
                  color="#dc3545"
                  @click="dayForm.isUnavailable = true; showTimeInputs[dayIndex] = false"
                  class="mr-2"
                >
                  Mark Unavailable
                </v-btn>
                <v-btn
                  variant="contained"
                  size="small"
                  color="#28a745"
                  @click="showTimeInputs[dayIndex] = false"
                >
                  Done
                </v-btn>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>

    <!-- Loading Overlay -->
    <v-overlay v-model="loading" class="align-center justify-center">
      <v-progress-circular color="#2c3e50" size="64" indeterminate></v-progress-circular>
    </v-overlay>

    <!-- Success/Error Snackbar -->
    <v-snackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
      location="bottom right"
      rounded="lg"
    >
      {{ snackbarText }}
      <template v-slot:actions>
        <v-btn variant="text" @click="snackbar = false">Close</v-btn>
      </template>
    </v-snackbar>
  </div>

  <!-- Access Denied -->
  <div v-else class="access-denied">
    <v-icon size="64" color="#6c757d">mdi-lock</v-icon>
    <h2>Access Denied</h2>
    <p>You don't have permission to access this page.</p>
    <v-btn color="#2c3e50" @click="router.push({ name: 'dashboard' })">Go to Dashboard</v-btn>
  </div>
</template>

<style scoped>
.availability-page {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem 1rem;
  background-color: #f8f9fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  font-weight: 600;
  color: #212529;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

.page-subtitle {
  font-size: 1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.save-btn {
  background-color: #2c3e50 !important;
  color: white !important;
  font-weight: 600;
  text-transform: none;
  box-shadow: none;
}

.save-btn:hover {
  background-color: #1a252f !important;
}

.weekly-summary-card {
  background-color: white !important;
  border: 1px solid #e9ecef;
  margin-bottom: 1.5rem;
}

.summary-title {
  font-size: 1rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.summary-subtitle {
  font-size: 0.875rem;
  color: #6c757d;
  margin: 0.25rem 0 1rem 0;
}

.hours-display {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.hours-number {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  line-height: 1;
}

.hours-label {
  font-size: 0.875rem;
  color: #6c757d;
  font-weight: 500;
}

.days-container {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.day-item {
  background-color: white;
  border: 1px solid #e9ecef;
  border-bottom: none;
}

.day-item:first-child {
  border-top-left-radius: 0.5rem;
  border-top-right-radius: 0.5rem;
}

.day-item:last-child {
  border-bottom: 1px solid #e9ecef;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
}

.day-row {
  display: flex;
  align-items: center;
  padding: 1.25rem 1.5rem;
  gap: 1rem;
}

.day-info {
  flex: 0 0 120px;
}

.day-name {
  font-size: 1rem;
  font-weight: 500;
  color: #212529;
  margin: 0;
}

.day-status {
  flex: 1;
  display: flex;
  align-items: center;
}

.status-chip {
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 6px !important;
  height: 28px;
}

.day-actions {
  flex: 0 0 auto;
}

.action-btn {
  background-color: #2c3e50 !important;
  color: white !important;
  text-transform: none;
  font-weight: 500;
  box-shadow: none;
}

.action-btn:hover {
  background-color: #1a252f !important;
}

.edit-btn {
  color: #6c757d !important;
  border-color: #dee2e6 !important;
  text-transform: none;
  font-weight: 500;
}

.edit-btn:hover {
  background-color: #f8f9fa !important;
  border-color: #adb5bd !important;
}

.time-inputs-section {
  border-top: 1px solid #f8f9fa;
  padding: 1.5rem 1.5rem;
  background-color: #fdfdfd;
}

.time-ranges-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.time-range-input {
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 1rem;
}

.time-input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.time-selects {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.time-select {
  max-width: 140px;
}

.time-separator {
  color: #6c757d;
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.range-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.input-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f8f9fa;
  display: flex;
  gap: 0.75rem;
}

.validation-error {
  margin-top: 0.5rem;
  font-size: 0.75rem;
  color: #dc3545;
  font-weight: 500;
}

.access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 50vh;
  text-align: center;
  gap: 1rem;
}

.access-denied h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #495057;
  margin: 0;
}

.access-denied p {
  color: #6c757d;
  margin: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .availability-page {
    padding: 1rem 0.75rem;
  }

  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .day-row {
    padding: 1rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .day-info {
    flex: 0 0 100%;
    order: 1;
  }

  .day-status {
    flex: 1;
    order: 2;
  }

  .day-actions {
    flex: 0 0 auto;
    order: 3;
  }

  .time-selects {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .time-select {
    max-width: none;
  }

  .time-separator {
    display: none;
  }

  .time-input-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
  }

  .range-actions {
    justify-content: center;
  }
}

/* Animation */
.v-enter-active,
.v-leave-active {
  transition: all 0.3s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>