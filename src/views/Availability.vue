<script setup>
import { ref, onMounted, computed } from "vue";
import Utils from "../config/utils";
import AvailabilityServices from "../services/availabilityServices";
import { useRouter } from "vue-router";

const router = useRouter();
const currentUser = ref(null);
const loading = ref(false);

// Form data for each day - updated structure to support multiple available time ranges
const availabilityForm = ref([
  { 
    day: 1, 
    dayName: 'Monday', 
    isAvailable: true,  // true = has available time ranges, false = not available
    timeRanges: [] // Empty with isAvailable=true means fully available (24/7)
  },
  { 
    day: 2, 
    dayName: 'Tuesday', 
    isAvailable: true, 
    timeRanges: [] 
  },
  { 
    day: 3, 
    dayName: 'Wednesday', 
    isAvailable: true, 
    timeRanges: [] 
  },
  { 
    day: 4, 
    dayName: 'Thursday', 
    isAvailable: true, 
    timeRanges: [] 
  },
  { 
    day: 5, 
    dayName: 'Friday', 
    isAvailable: true, 
    timeRanges: [] 
  },
  { 
    day: 6, 
    dayName: 'Saturday', 
    isAvailable: true, 
    timeRanges: [] 
  },
  { 
    day: 0, 
    dayName: 'Sunday', 
    isAvailable: true, 
    timeRanges: [] 
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
  const isOpening = !showTimeInputs.value[dayIndex];
  showTimeInputs.value[dayIndex] = isOpening;
  
  // If opening and day is available but has no time ranges, initialize with default
  if (isOpening) {
    const dayForm = availabilityForm.value[dayIndex];
    if (dayForm.isAvailable && dayForm.timeRanges.length === 0) {
      // Keep it as 24/7 available initially, let user choose
    }
  }
};

// Get status text for a day
const getDayStatus = (dayForm) => {
  if (!dayForm.isAvailable) {
    return 'Not Available';
  }
  if (dayForm.timeRanges.length === 0) {
    return 'Fully Available (24/7)';
  }
  if (dayForm.timeRanges.length === 1) {
    return `Available: ${dayForm.timeRanges[0].startTime} - ${dayForm.timeRanges[0].endTime}`;
  }
  return `${dayForm.timeRanges.length} available periods`;
};

// Check if user has access
const hasAccess = computed(() => {
  return currentUser.value && !currentUser.value.is_super_admin;
});

// Time options for dropdowns - now with 1-minute increments
const timeOptions = ref([]);
const generateTimeOptions = () => {
  const times = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 1) {
      const timeString = convertTo12Hour(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
      times.push(timeString);
    }
  }
  timeOptions.value = times;
};

// Validate manual time input
const validateTimeInput = (timeString) => {
  if (!timeString) return false;
  
  // Check if it matches the expected format (e.g., "9:30 AM" or "09:30 AM")
  const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9]\s?(AM|PM)$/i;
  return timeRegex.test(timeString.trim());
};

// Format typed time to consistent format
const formatTimeInput = (timeString) => {
  if (!timeString) return '';
  
  const trimmed = timeString.trim().toUpperCase();
  
  // If it's already a valid format, return as is
  if (validateTimeInput(trimmed)) {
    // Ensure consistent formatting (add leading zero to hour if single digit)
    const match = trimmed.match(/^([0-9]{1,2}):([0-5][0-9])\s?(AM|PM)$/i);
    if (match) {
      const hour = parseInt(match[1]);
      const minute = match[2];
      const period = match[3].toUpperCase();
      
      if (hour >= 1 && hour <= 12) {
        return `${hour}:${minute} ${period}`;
      }
    }
  }
  
  return timeString;
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

// Load availability data from backend directly as availability
const loadAvailabilityData = async () => {
  if (!currentUser.value?.userId) return;
  
  loading.value = true;
  try {
    console.log('Loading availability for user:', currentUser.value.userId);
    const response = await AvailabilityServices.getByUserId(currentUser.value.userId);
    const backendData = response.data;
    
    console.log('Backend data:', backendData);
    
    // Reset all days to fully available first
    availabilityForm.value.forEach(dayForm => {
      dayForm.isAvailable = true;
      dayForm.timeRanges = [];
    });
    
    // Group backend data by day of week
    const dataByDay = {};
    backendData.forEach(item => {
      if (!dataByDay[item.day_of_week]) {
        dataByDay[item.day_of_week] = [];
      }
      if (item.is_active) {
        dataByDay[item.day_of_week].push({
          startTime: convertTo12Hour(item.start_time.substring(0, 5)),
          endTime: convertTo12Hour(item.end_time.substring(0, 5)),
          availabilityId: item.availability_id
        });
      }
    });
    
    // Load available periods directly
    Object.keys(dataByDay).forEach(dayOfWeek => {
      const dayForm = availabilityForm.value.find(d => d.day === parseInt(dayOfWeek));
      if (dayForm && dataByDay[dayOfWeek].length > 0) {
        const availablePeriods = dataByDay[dayOfWeek].sort((a, b) => {
          const startA = convertTo24Hour(a.startTime);
          const startB = convertTo24Hour(b.startTime);
          return startA.localeCompare(startB);
        });
        
        // Check if it's a full day availability (00:00 to 23:59)
        if (availablePeriods.length === 1 && 
            convertTo24Hour(availablePeriods[0].startTime) === '00:00' && 
            convertTo24Hour(availablePeriods[0].endTime) === '23:59') {
          // Full day available - empty time ranges means 24/7
          dayForm.isAvailable = true;
          dayForm.timeRanges = [];
        } else {
          // Specific available periods
          dayForm.isAvailable = true;
          dayForm.timeRanges = availablePeriods
        }
      } else {
        // No availability data - mark as not available
        dayForm.isAvailable = false;
        dayForm.timeRanges = [];
      }
    });
    
    // Mark days with no data as not available
    availabilityForm.value.forEach(dayForm => {
      if (!dataByDay[dayForm.day]) {
        dayForm.isAvailable = false;
        dayForm.timeRanges = [];
      }
    });
    
    console.log('Form loaded with availability data:', availabilityForm.value);
    
  } catch (error) {
    console.error('Error loading availability:', error);
    showSnackbar('Error loading availability data', 'error');
  } finally {
    loading.value = false;
  }
};

// Validate time ranges for a specific day
const validateTimeRanges = (dayForm) => {
  // Only validate if there are time ranges to check (when day has available times)
  if (!dayForm.isAvailable || dayForm.timeRanges.length === 0) return null;
  
  for (let i = 0; i < dayForm.timeRanges.length; i++) {
    const range = dayForm.timeRanges[i];
    
    // Validate time format first
    if (!validateTimeInput(range.startTime)) {
      return `Available time range ${i + 1}: Invalid start time format. Use format like "9:30 AM"`;
    }
    
    if (!validateTimeInput(range.endTime)) {
      return `Available time range ${i + 1}: Invalid end time format. Use format like "5:30 PM"`;
    }
    
    // Convert to 24-hour for comparison
    const startTime24 = convertTo24Hour(range.startTime);
    const endTime24 = convertTo24Hour(range.endTime);
    
    if (startTime24 >= endTime24) {
      return `Available time range ${i + 1}: End time must be after start time`;
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
        return `Available time ranges ${i + 1} and ${j + 1} overlap`;
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
      // Delete all existing availability records for this day first
      // Get existing records to delete
      const existingResponse = await AvailabilityServices.getByUserId(currentUser.value.userId);
      const existingRecords = existingResponse.data.filter(item => 
        item.day_of_week === dayForm.day && item.is_active
      );
      
      for (const record of existingRecords) {
        promises.push(AvailabilityServices.delete(record.availability_id));
      }
      
      if (!dayForm.isAvailable) {
        // Day is not available - don't create any availability records
        continue;
      }
      
      if (dayForm.timeRanges.length === 0) {
        // Day is fully available (24/7) - save full day availability
        const fullDayPayload = {
          user_id: currentUser.value.userId,
          day_of_week: dayForm.day,
          start_time: '00:00:00',
          end_time: '23:59:00',
          is_active: true
        };
        
        promises.push(
          AvailabilityServices.create(fullDayPayload).then((response) => {
            // Store the ID for potential future updates
            dayForm.fullDayAvailabilityId = response.data.availability_id;
          })
        );
      } else {
        // Day has specific available periods - save each one
        for (const range of dayForm.timeRanges) {
          const availablePayload = {
            user_id: currentUser.value.userId,
            day_of_week: dayForm.day,
            start_time: convertTo24Hour(range.startTime) + ':00',
            end_time: convertTo24Hour(range.endTime) + ':00',
            is_active: true
          };
          
          promises.push(
            AvailabilityServices.create(availablePayload).then((response) => {
              range.availabilityId = response.data.availability_id;
            })
          );
        }
      }
    }
    
    await Promise.all(promises);
    showSnackbar('Availability schedule saved successfully!', 'success');
    
  } catch (error) {
    console.error('Error saving availability:', error);
    showSnackbar('Error saving availability schedule', 'error');
  } finally {
    loading.value = false;
  }
};

const showSnackbar = (text, color = 'success') => {
  snackbarText.value = text;
  snackbarColor.value = color;
  snackbar.value = true;
  
  // Auto-hide after 2 seconds for better UX
  setTimeout(() => {
    snackbar.value = false;
  }, 2000);
};

const resetToDefaults = () => {
  // Reset form to default values - all days fully available
  availabilityForm.value.forEach(dayForm => {
    dayForm.timeRanges = [];
    dayForm.isAvailable = true; // All days fully available
  });
  showSnackbar('Form reset to defaults - all days fully available', 'info');
};

// Quick action functions
const setWeekdayAvailable = () => {
  availabilityForm.value.forEach(dayForm => {
    if (dayForm.day === 0 || dayForm.day === 6) { // Sunday and Saturday
      dayForm.isAvailable = false;
      dayForm.timeRanges = [];
    } else {
      dayForm.isAvailable = true;
      dayForm.timeRanges = [{ startTime: '8:30 AM', endTime: '5:15 PM', availabilityId: null }];
    }
  });
  showSnackbar('Weekdays set to 8:30 AM - 5:15 PM availability, weekends unavailable', 'info');
};

const setFullWeekAvailable = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isAvailable = true;
    dayForm.timeRanges = [];
  });
  showSnackbar('Full week set as available (24/7)', 'info');
};

const setAllDaysUnavailable = () => {
  availabilityForm.value.forEach(dayForm => {
    dayForm.isAvailable = false;
    dayForm.timeRanges = [];
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
        <h1 class="page-title">My Unavailability</h1>
        <p class="page-subtitle">Set your weekly unavailable hours</p>
      </div>
      <v-btn 
        color="#2c3e50"
        class="save-btn"
        @click="saveAvailability"
        :loading="loading"
        size="large"
        rounded="lg"
      >
        <v-icon class="mr-2">mdi-clock-check</v-icon>
        Save Unavailability
      </v-btn>
    </div>

    <!-- Days List -->
    <div class="days-container">
      <div 
        v-for="(dayForm, dayIndex) in availabilityForm" 
        :key="dayForm.day" 
        class="day-item"
      >
        <div 
          class="day-row clickable-day" 
          @click="toggleTimeInputs(dayIndex)"
          :class="{ 'expanded': showTimeInputs[dayIndex] }"
        >
          <div class="day-info">
            <h3 class="day-name">{{ dayForm.dayName }}</h3>
            <p class="click-hint">Click to manage availability</p>
          </div>
          
          <div class="day-status">
            <v-chip
              :color="dayForm.isAvailable ? '#e8f5e8' : '#ffe6e6'"
              :text-color="dayForm.isAvailable ? '#2d5016' : '#8b0000'"
              size="small"
              class="status-chip"
            >
              {{ getDayStatus(dayForm) }}
            </v-chip>
          </div>
          
          <div class="expand-indicator">
            <v-icon 
              :class="{ 'rotated': showTimeInputs[dayIndex] }" 
              class="expand-icon"
            >
              mdi-chevron-down
            </v-icon>
          </div>
        </div>

        <!-- Expandable Time Input Section -->
        <v-expand-transition>
          <div v-show="showTimeInputs[dayIndex]" class="time-inputs-section">
            <div class="time-ranges-container">
              <!-- Availability Options -->
              <div class="availability-options">
                <h4 class="options-title">Set Unavailability for {{ dayForm.dayName }}</h4>
                
                <div class="quick-options">
                  <v-btn
                    variant="outlined"
                    size="small"
                    color="#28a745"
                    @click="dayForm.isAvailable = true; dayForm.timeRanges = []"
                    :class="{ 'selected-option': dayForm.isAvailable && dayForm.timeRanges.length === 0 }"
                    class="option-btn"
                  >
                    <v-icon size="16" class="mr-1">mdi-clock-check</v-icon>
                    Available 24/7
                  </v-btn>
                  
                  <v-btn
                    variant="outlined"
                    size="small"
                    color="#007bff"
                    @click="dayForm.isAvailable = true; if (dayForm.timeRanges.length === 0) dayForm.timeRanges = [{ startTime: '9:00 AM', endTime: '5:00 PM', availabilityId: null }]"
                    :class="{ 'selected-option': dayForm.isAvailable && dayForm.timeRanges.length > 0 }"
                    class="option-btn"
                  >
                    <v-icon size="16" class="mr-1">mdi-clock-outline</v-icon>
                    Set Specific Hours
                  </v-btn>
                </div>
              </div>
              <!-- Time Range Inputs (only show if specific hours selected) -->
              <div v-if="dayForm.isAvailable && dayForm.timeRanges.length > 0" class="time-ranges-section">
                <div 
                  v-for="(range, rangeIndex) in dayForm.timeRanges" 
                  :key="`${dayForm.day}-${rangeIndex}`"
                  class="time-range-input"
                >
                <div class="time-input-row">
                  <div class="time-selects">
                    <v-combobox
                      v-model="range.startTime"
                      :items="timeOptions"
                      label="Start Time"
                      density="compact"
                      variant="outlined"
                      :disabled="loading"
                      class="time-select"
                      hide-details
                      placeholder="e.g., 9:30 AM"
                      :error="range.startTime && !validateTimeInput(range.startTime)"
                      @blur="range.startTime = formatTimeInput(range.startTime)"
                      :filter="(item, queryText) => {
                        return item.toLowerCase().includes(queryText.toLowerCase())
                      }"
                    >
                      <template v-slot:message v-if="range.startTime && !validateTimeInput(range.startTime)">
                        <span class="text-error">Please enter time in format: 9:30 AM</span>
                      </template>
                    </v-combobox>
                    
                    <span class="time-separator">to</span>
                    
                    <v-combobox
                      v-model="range.endTime"
                      :items="timeOptions"
                      label="End Time"
                      density="compact"
                      variant="outlined"
                      :disabled="loading"
                      class="time-select"
                      hide-details
                      placeholder="e.g., 5:30 PM"
                      :error="range.endTime && !validateTimeInput(range.endTime)"
                      @blur="range.endTime = formatTimeInput(range.endTime)"
                      :filter="(item, queryText) => {
                        return item.toLowerCase().includes(queryText.toLowerCase())
                      }"
                    >
                      <template v-slot:message v-if="range.endTime && !validateTimeInput(range.endTime)">
                        <span class="text-error">Please enter time in format: 5:30 PM</span>
                      </template>
                    </v-combobox>
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
              </div>

              <!-- Close Button -->
              <div class="close-actions">
                <v-btn
                  variant="contained"
                  size="small"
                  color="#2c3e50"
                  @click="showTimeInputs[dayIndex] = false"
                  class="close-btn"
                >
                  <v-icon size="16" class="mr-1">mdi-check</v-icon>
                  Done
                </v-btn>
              </div>
            </div>
          </div>
        </v-expand-transition>
      </div>
    </div>

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
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
  background: #f8f9fa;
  min-height: 100vh;
  contain: layout style;
}

@media (max-width: 768px) {
  .availability-page {
    padding: 1rem;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 3rem;
  gap: 2rem;
  background: white;
  padding: 2rem;
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #e9ecef;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
    text-align: center;
  }
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  line-height: 1.2;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }
}

.page-subtitle {
  font-size: 1.1rem;
  color: #6c757d;
  margin: 0;
  font-weight: 400;
}

.save-btn {
  background-color: #2c3e50 !important;
  color: white !important;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 2px 8px rgba(44, 62, 80, 0.2);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  padding: 1rem 2rem !important;
  will-change: transform;
}

.save-btn:hover {
  background-color: #1a252f !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(44, 62, 80, 0.3);
}

.days-container {
  display: grid;
  gap: 1rem;
}

.day-item {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  overflow: hidden;
  will-change: transform;
}

.day-item:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #3498db;
}

.day-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  padding: 1.5rem 2rem;
  gap: 2rem;
  background: transparent;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  border-radius: 1rem;
}

.day-row:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
  background: rgba(44, 62, 80, 0.02);
}

.day-row.expanded {
  background: rgba(44, 62, 80, 0.05);
}

@media (max-width: 768px) {
  .day-row {
    grid-template-columns: 1fr;
    gap: 1rem;
    text-align: center;
  }

  .quick-options {
    flex-direction: column;
  }

  .option-btn {
    width: 100%;
    justify-content: flex-start;
  }
}

.day-info {
  display: flex;
  flex-direction: column;
}

.click-hint {
  font-size: 0.75rem;
  color: #6c757d;
  margin: 0;
  font-style: italic;
  margin-top: 0.25rem;
}

.day-name {
  font-size: 1.3rem;
  font-weight: 700;
  color: #2c3e50;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.day-status {
  display: flex;
  justify-content: center;
}

.status-chip {
  font-weight: 600;
  font-size: 0.9rem !important;
  padding: 0.5rem 1rem !important;
  border-radius: 1.5rem !important;
}

.expand-indicator {
  display: flex;
  align-items: center;
}

.expand-icon {
  color: #6c757d;
  transition: transform 0.3s ease;
}

.expand-icon.rotated {
  transform: rotate(180deg);
}

.day-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

@media (max-width: 768px) {
  .day-actions {
    justify-content: center;
  }
}

.action-btn {
  font-weight: 600 !important;
  text-transform: none !important;
  border-radius: 0.75rem !important;
  padding: 0.75rem 1.5rem !important;
  transition: transform 0.2s ease !important;
  will-change: transform;
}

.action-btn:hover {
  transform: translateY(-1px) !important;
}

.edit-btn {
  font-weight: 600 !important;
  text-transform: none !important;
  border-radius: 0.75rem !important;
  border: 2px solid #dee2e6 !important;
  transition: border-color 0.2s ease, background-color 0.2s ease !important;
}

.availability-options {
  margin-bottom: 1.5rem;
}

.options-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 1rem 0;
}

.quick-options {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.option-btn {
  text-transform: none;
  font-weight: 500;
  transition: all 0.2s ease;
}

.option-btn.selected-option {
  background-color: #2c3e50 !important;
  color: white !important;
  border-color: #2c3e50 !important;
}

.time-ranges-section {
  border-top: 1px solid #e9ecef;
  padding-top: 1.5rem;
  margin-top: 1.5rem;
}

.close-actions {
  display: flex;
  justify-content: center;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e9ecef;
}

.close-btn {
  background-color: #2c3e50 !important;
  color: white !important;
  font-weight: 500;
  text-transform: none;
}

.edit-btn:hover {
  border-color: #3498db !important;
  background-color: rgba(52, 152, 219, 0.1) !important;
}

.time-inputs-section {
  background: #f8f9fa;
  border-top: 1px solid #dee2e6;
  padding: 2rem;
}

.time-ranges-container {
  max-width: 800px;
  margin: 0 auto;
}

.time-range-input {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 1rem;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #dee2e6;
}

.time-input-row {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

@media (max-width: 768px) {
  .time-input-row {
    flex-direction: column;
    gap: 1rem;
  }
}

.time-selects {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.time-select {
  flex: 1;
  max-width: 150px;
}

/* Enhanced styling for combobox inputs */
.time-select :deep(.v-field__input) {
  font-weight: 500;
  color: #2c3e50;
}

.time-select :deep(.v-field__input::placeholder) {
  color: #6c757d !important;
  opacity: 0.8;
}

.time-select :deep(.v-field--error) {
  border-color: #dc3545 !important;
}

.time-select :deep(.v-input--error .v-field__outline__start),
.time-select :deep(.v-input--error .v-field__outline__notch),
.time-select :deep(.v-input--error .v-field__outline__end) {
  border-color: #dc3545 !important;
}

.time-select :deep(.v-input--focused .v-field__outline__start),
.time-select :deep(.v-input--focused .v-field__outline__notch),
.time-select :deep(.v-input--focused .v-field__outline__end) {
  border-color: #2c3e50 !important;
  border-width: 2px;
}

/* Improve dropdown list styling */
.time-select :deep(.v-list) {
  max-height: 300px !important;
}

.time-select :deep(.v-list-item) {
  padding: 8px 16px !important;
  font-weight: 500;
}

.time-select :deep(.v-list-item:hover) {
  background-color: #f8f9fa !important;
}

.time-select :deep(.v-list-item--active) {
  background-color: #e3f2fd !important;
  color: #1976d2 !important;
}

/* Input hints and help text */
.time-input-hint {
  font-size: 0.75rem;
  color: #6c757d;
  margin-top: 0.25rem;
  font-style: italic;
}

.time-separator {
  font-weight: 600;
  color: #6c757d;
  font-size: 1rem;
  padding: 0 0.5rem;
}

.range-actions {
  display: flex;
  gap: 0.5rem;
}

.input-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(222, 226, 230, 0.5);
}

@media (max-width: 768px) {
  .input-actions {
    flex-direction: column;
    align-items: stretch;
  }
}

.validation-error {
  color: #dc3545;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8d7da;
  border-radius: 0.5rem;
  border: 1px solid #f5c6cb;
}

.access-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  text-align: center;
  color: #6c757d;
  gap: 1.5rem;
}

.access-denied h2 {
  font-size: 2rem;
  color: #495057;
  margin: 0;
}

.access-denied p {
  font-size: 1.1rem;
  margin: 0;
}

/* Optimized styles */

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