<script setup>
import { ref, onMounted } from "vue";
import Utils from "../config/utils";
import UserServices from "../services/userServices";

const user = ref(null);
const profileData = ref({
  fullName: "",
  email: "",
  phone: "",
  department: "",
  role: "",
  startDate: "",
  employeeId: "",
  isActive: false,
  isSuperAdmin: false
});

// Phone editing state
const isEditingPhone = ref(false);
const editPhoneValue = ref("");
const loading = ref(false);
const error = ref("");
const saving = ref(false);

const loadUserProfile = async () => {
  user.value = Utils.getStore("user");
  if (user.value && user.value.userId) {
    try {
      loading.value = true;
      error.value = "";
      
      const response = await UserServices.getUser(user.value.userId);
      const userData = response.data;
      
      // Set profile data from backend
      profileData.value.fullName = `${userData.fName} ${userData.lName}`;
      profileData.value.email = userData.email;
      profileData.value.phone = userData.phone || "Not provided";
      profileData.value.isActive = userData.is_active;
      profileData.value.isSuperAdmin = userData.is_super_admin;
      
      // Mock data for fields not in backend (replace when available)
      profileData.value.department = "Support Central";
      profileData.value.role = userData.is_super_admin ? "Super Administrator" : "Department Manager";
      profileData.value.startDate = new Date(userData.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long' 
      });
      profileData.value.employeeId = "N/A";
      
    } catch (err) {
      console.error("Error loading user profile:", err);
      error.value = "Failed to load profile data. Please try again.";
    } finally {
      loading.value = false;
    }
  }
};

const startEditPhone = () => {
  editPhoneValue.value = profileData.value.phone === "Not provided" ? "" : profileData.value.phone;
  isEditingPhone.value = true;
};

const savePhone = async () => {
  if (!user.value || !user.value.userId) return;
  
  try {
    saving.value = true;
    error.value = "";
    
    await UserServices.updateUser(user.value.userId, {
      phone: editPhoneValue.value
    });
    
    profileData.value.phone = editPhoneValue.value || "Not provided";
    isEditingPhone.value = false;
    
  } catch (err) {
    console.error("Error updating phone:", err);
    error.value = "Failed to update phone number. Please try again.";
  } finally {
    saving.value = false;
  }
};

const cancelEditPhone = () => {
  editPhoneValue.value = "";
  isEditingPhone.value = false;
  error.value = "";
};

onMounted(() => {
  loadUserProfile();
});
</script>

<template>
  <v-container class="pa-8">
    <!-- Loading State -->
    <div v-if="loading" class="text-center pa-8">
      <v-progress-circular indeterminate size="64"></v-progress-circular>
      <p class="mt-4 text-h6">Loading Profile...</p>
    </div>

    <!-- Error State -->
    <v-alert v-if="error" type="error" class="mb-4" dismissible @click:close="error = ''">
      {{ error }}
    </v-alert>

    <!-- Profile Content -->
    <div v-if="!loading">
      <div class="profile-header mb-8">
        <h1 class="text-h3 mb-2">Profile</h1>
        <p class="text-h6 text-grey-600">Manage your account information and preferences</p>
      </div>

      <v-row>
        <!-- Personal Information Section -->
        <v-col cols="12" md="6">
          <v-card class="pa-6 mb-4" elevation="2">
            <div class="mb-4">
              <h2 class="text-h5 mb-1">Personal Information</h2>
              <p class="text-body-2 text-grey-600">Your account details</p>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-account</v-icon>
                <span class="text-body-2 text-grey-600">Full Name</span>
              </div>
              <div class="ps-8">
                <span class="text-h6">{{ profileData.fullName }}</span>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-email</v-icon>
                <span class="text-body-2 text-grey-600">Email</span>
              </div>
              <div class="ps-8">
                <span class="text-h6">{{ profileData.email }}</span>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-phone</v-icon>
                <span class="text-body-2 text-grey-600">Phone</span>
              </div>
              <div class="ps-8">
                <div v-if="!isEditingPhone" class="d-flex align-center">
                  <span class="text-h6 me-3" :class="{ 'text-grey-500': profileData.phone === 'Not provided' }">
                    {{ profileData.phone }}
                  </span>
                  <v-btn 
                    icon 
                    size="small" 
                    variant="text" 
                    @click="startEditPhone"
                    :disabled="saving"
                  >
                    <v-icon size="16">mdi-pencil</v-icon>
                  </v-btn>
                </div>
                <div v-else class="edit-phone-container">
                  <v-text-field
                    v-model="editPhoneValue"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mb-3"
                    placeholder="Enter phone number"
                    :disabled="saving"
                  ></v-text-field>
                  <div class="d-flex gap-2">
                    <v-btn 
                      color="primary" 
                      size="small" 
                      @click="savePhone"
                      :loading="saving"
                      :disabled="saving"
                    >
                      Save
                    </v-btn>
                    <v-btn 
                      color="grey" 
                      size="small" 
                      variant="outlined"
                      @click="cancelEditPhone"
                      :disabled="saving"
                    >
                      Cancel
                    </v-btn>
                  </div>
                </div>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-office-building</v-icon>
                <span class="text-body-2 text-grey-600">Department</span>
              </div>
              <div class="ps-8">
                <span class="text-h6">{{ profileData.department }}</span>
              </div>
            </div>
          </v-card>
        </v-col>

        <!-- Employment Details Section -->
        <v-col cols="12" md="6">
          <v-card class="pa-6 mb-4" elevation="2">
            <div class="mb-4">
              <h2 class="text-h5 mb-1">Employment Details</h2>
              <p class="text-body-2 text-grey-600">Your role and status</p>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-body-2 text-grey-600">Role</span>
              </div>
              <div class="mb-2">
                <v-chip 
                  :color="profileData.isSuperAdmin ? 'purple' : 'black'" 
                  text-color="white" 
                  size="default"
                  class="font-weight-medium"
                >
                  {{ profileData.role }}
                </v-chip>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-calendar</v-icon>
                <span class="text-body-2 text-grey-600">Start Date</span>
              </div>
              <div class="ps-8">
                <span class="text-h6">{{ profileData.startDate }}</span>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <span class="text-body-2 text-grey-600">Employee ID</span>
              </div>
              <div class="mb-2">
                <span class="text-h6 font-weight-medium">{{ profileData.employeeId }}</span>
              </div>
            </div>

            <div class="profile-field mb-4">
              <div class="d-flex align-center mb-2">
                <v-icon class="me-3" size="20">mdi-account-check</v-icon>
                <span class="text-body-2 text-grey-600">Account Status</span>
              </div>
              <div class="ps-8">
                <v-chip 
                  :color="profileData.isActive ? 'green' : 'red'" 
                  text-color="white" 
                  size="small"
                >
                  {{ profileData.isActive ? 'Active' : 'Inactive' }}
                </v-chip>
              </div>
            </div>
          </v-card>
        </v-col>
      </v-row>
    </div>
  </v-container>
</template>

<style scoped>
.profile-header {
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 16px;
}

.profile-field {
  border-bottom: 1px solid #f5f5f5;
  padding-bottom: 16px;
}

.profile-field:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.edit-phone-container {
  max-width: 300px;
}

.gap-2 {
  gap: 8px;
}
</style>