<script setup>
import { ref, onMounted, computed } from "vue";
import UserServices from "../services/userServices";
import PositionServices from "../services/positionServices";
import PositionUserServices from "../services/positionUserServices";
import Utils from "../config/utils";
import { useRouter } from "vue-router";

const router = useRouter();
const currentUser = ref(null);
const users = ref([]);
const positions = ref([]);
const positionUsers = ref([]);
const loading = ref(false);
const search = ref("");

// Dialog state
const dialog = ref(false);
const dialogDelete = ref(false);
const editedIndex = ref(-1);
const editedItem = ref({ fName: "", lName: "", email: "", phone: "", is_super_admin: false, is_active: true });
const defaultItem = { fName: "", lName: "", email: "", phone: "", is_super_admin: false, is_active: true };

// Manager dialog state
const managerDialog = ref(false);
const managerUser = ref(null);
const selectedPositionId = ref(null);

const isSuperAdmin = computed(() => currentUser.value && currentUser.value.is_super_admin);

const formTitle = computed(() =>
  editedIndex.value === -1 ? "New User" : "Edit User"
);

// Get manager positions (positions where is_manager = true)
const managerPositions = computed(() =>
  positions.value.filter((p) => p.is_manager)
);

// Build a map: user_id -> array of position objects they hold
const userPositionMap = computed(() => {
  const map = {};
  positionUsers.value.forEach((pu) => {
    if (!map[pu.user_id]) map[pu.user_id] = [];
    const pos = positions.value.find((p) => p.position_id === pu.position_id);
    if (pos) {
      map[pu.user_id].push({ ...pos, position_user_id: pu.position_user_id });
    }
  });
  return map;
});

// Check if a user is a manager
const isManager = (userId) => {
  const userPositions = userPositionMap.value[userId] || [];
  return userPositions.some((p) => p.is_manager);
};

// Get the manager position name for a user
const getManagerPosition = (userId) => {
  const userPositions = userPositionMap.value[userId] || [];
  const mgr = userPositions.find((p) => p.is_manager);
  return mgr ? mgr.position_name : "";
};

const filteredUsers = computed(() => {
  if (!search.value) return users.value;
  const s = search.value.toLowerCase();
  return users.value.filter(
    (u) =>
      u.fName.toLowerCase().includes(s) ||
      u.lName.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s)
  );
});

const fetchAll = async () => {
  loading.value = true;
  try {
    const [usersRes, positionsRes, positionUsersRes] = await Promise.all([
      UserServices.getAll(),
      PositionServices.getAll(),
      PositionUserServices.getAll(),
    ]);
    users.value = usersRes.data;
    positions.value = positionsRes.data;
    positionUsers.value = positionUsersRes.data;
  } catch (err) {
    console.error("Error fetching data:", err);
  } finally {
    loading.value = false;
  }
};

const openNew = () => {
  editedIndex.value = -1;
  editedItem.value = { ...defaultItem };
  dialog.value = true;
};

const editUser = (user) => {
  editedIndex.value = users.value.indexOf(user);
  editedItem.value = { ...user };
  dialog.value = true;
};

const save = () => {
  if (!editedItem.value.fName || !editedItem.value.lName || !editedItem.value.email) return;

  if (editedIndex.value > -1) {
    UserServices.updateUser(editedItem.value.user_id, {
      fName: editedItem.value.fName,
      lName: editedItem.value.lName,
      email: editedItem.value.email,
      phone: editedItem.value.phone,
      is_super_admin: editedItem.value.is_super_admin,
      is_active: editedItem.value.is_active,
    })
      .then(() => {
        fetchAll();
        close();
      })
      .catch((err) => console.error("Error updating user:", err));
  } else {
    UserServices.create({
      fName: editedItem.value.fName,
      lName: editedItem.value.lName,
      email: editedItem.value.email,
      phone: editedItem.value.phone,
      is_super_admin: editedItem.value.is_super_admin,
      is_active: editedItem.value.is_active,
    })
      .then(() => {
        fetchAll();
        close();
      })
      .catch((err) => console.error("Error creating user:", err));
  }
};

const deleteUser = (user) => {
  editedItem.value = { ...user };
  dialogDelete.value = true;
};

const confirmDelete = () => {
  UserServices.delete(editedItem.value.user_id)
    .then(() => {
      fetchAll();
      closeDelete();
    })
    .catch((err) => console.error("Error deleting user:", err));
};

// Manager role management
const openManagerDialog = (user) => {
  managerUser.value = { ...user };
  // Find if user already has a manager position
  const userPositions = userPositionMap.value[user.user_id] || [];
  const mgrPos = userPositions.find((p) => p.is_manager);
  selectedPositionId.value = mgrPos ? mgrPos.position_id : null;
  managerDialog.value = true;
};

const saveManagerRole = async () => {
  const userId = managerUser.value.user_id;
  const userPositions = userPositionMap.value[userId] || [];
  const currentMgr = userPositions.find((p) => p.is_manager);

  try {
    if (selectedPositionId.value) {
      // Remove old manager position-user if it's different
      if (currentMgr && currentMgr.position_id !== selectedPositionId.value) {
        await PositionUserServices.delete(currentMgr.position_user_id);
      }
      // Add new manager assignment if not already assigned
      if (!currentMgr || currentMgr.position_id !== selectedPositionId.value) {
        await PositionUserServices.create({
          position_id: selectedPositionId.value,
          user_id: userId,
        });
      }
    } else {
      // Remove manager role
      if (currentMgr) {
        await PositionUserServices.delete(currentMgr.position_user_id);
      }
    }
    await fetchAll();
    closeManager();
  } catch (err) {
    console.error("Error updating manager role:", err);
  }
};

const close = () => {
  dialog.value = false;
  editedIndex.value = -1;
  editedItem.value = { ...defaultItem };
};

const closeDelete = () => {
  dialogDelete.value = false;
  editedItem.value = { ...defaultItem };
};

const closeManager = () => {
  managerDialog.value = false;
  managerUser.value = null;
  selectedPositionId.value = null;
};

onMounted(() => {
  currentUser.value = Utils.getStore("user");
  if (!currentUser.value || !currentUser.value.is_super_admin) {
    router.push({ name: "dashboard" });
    return;
  }
  fetchAll();
});
</script>

<template>
  <v-container class="users-page" fluid>
    <!-- Header -->
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4 font-weight-bold" style="color: #80162B">
          <v-icon size="36" color="primary" class="mr-2">mdi-account-group</v-icon>
          User Management
        </h1>
        <p class="text-subtitle-1 text-grey mt-1">View, edit, and manage all users and their roles</p>
      </v-col>
    </v-row>

    <!-- Toolbar -->
    <v-row class="mb-2">
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search users..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        ></v-text-field>
      </v-col>
      <v-spacer></v-spacer>
      <v-col cols="auto">
        <v-btn color="primary" @click="openNew" prepend-icon="mdi-plus">
          New User
        </v-btn>
      </v-col>
    </v-row>

    <!-- Users Table -->
    <v-card elevation="2" rounded="lg">
      <v-table>
        <thead>
          <tr style="background-color: #80162B">
            <th class="text-white">Name</th>
            <th class="text-white">Email</th>
            <th class="text-white">Phone</th>
            <th class="text-white text-center">Manager</th>
            <th class="text-white text-center">Super Admin</th>
            <th class="text-white text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="7" class="text-center pa-6">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </td>
          </tr>
          <tr v-else-if="filteredUsers.length === 0">
            <td colspan="7" class="text-center pa-6 text-grey">
              No users found
            </td>
          </tr>
          <tr v-for="u in filteredUsers" :key="u.user_id" class="user-row">
            <td class="font-weight-medium">{{ u.fName }} {{ u.lName }}</td>
            <td>{{ u.email }}</td>
            <td>{{ u.phone || "—" }}</td>
            <td class="text-center">
              <v-chip
                v-if="isManager(u.user_id)"
                size="small"
                color="teal"
                variant="flat"
                class="cursor-pointer"
                @click="openManagerDialog(u)"
              >
                <v-icon size="14" start>mdi-shield-crown</v-icon>
                {{ getManagerPosition(u.user_id) }}
              </v-chip>
              <v-btn
                v-else
                size="x-small"
                variant="outlined"
                color="grey"
                @click="openManagerDialog(u)"
              >
                Assign
              </v-btn>
            </td>
            <td class="text-center">
              <v-icon v-if="u.is_super_admin" color="primary" size="20">mdi-check-circle</v-icon>
              <v-icon v-else color="grey-lighten-1" size="20">mdi-close-circle-outline</v-icon>
            </td>
            <td class="text-center">
              <v-btn icon size="small" variant="text" color="blue" @click="editUser(u)" class="mr-1">
                <v-icon size="20">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" @click="deleteUser(u)">
                <v-icon size="20">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create / Edit User Dialog -->
    <v-dialog v-model="dialog" max-width="550px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4" style="background-color: #80162B; color: white">
          <v-icon color="white" class="mr-2">
            {{ editedIndex === -1 ? 'mdi-account-plus' : 'mdi-account-edit' }}
          </v-icon>
          {{ formTitle }}
        </v-card-title>
        <v-card-text class="pa-6">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="editedItem.fName"
                label="First Name"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'First name is required']"
              ></v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="editedItem.lName"
                label="Last Name"
                variant="outlined"
                density="comfortable"
                :rules="[v => !!v || 'Last name is required']"
              ></v-text-field>
            </v-col>
          </v-row>
          <v-text-field
            v-model="editedItem.email"
            label="Email"
            variant="outlined"
            density="comfortable"
            class="mb-2"
            :rules="[v => !!v || 'Email is required']"
          ></v-text-field>
          <v-text-field
            v-model="editedItem.phone"
            label="Phone"
            variant="outlined"
            density="comfortable"
            class="mb-2"
            placeholder="Optional"
          ></v-text-field>
          <v-row>
            <v-col cols="6">
              <v-switch
                v-model="editedItem.is_super_admin"
                label="Super Admin"
                color="primary"
                hide-details
              ></v-switch>
            </v-col>
            <v-col cols="6">
              <v-switch
                v-model="editedItem.is_active"
                label="Active"
                color="success"
                hide-details
              ></v-switch>
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="close">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="save"
            :disabled="!editedItem.fName || !editedItem.lName || !editedItem.email"
          >
            {{ editedIndex === -1 ? 'Create' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="dialogDelete" max-width="400px">
      <v-card rounded="lg">
        <v-card-title class="pa-4 text-center" style="background-color: #EE5044; color: white">
          <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>
          Confirm Delete
        </v-card-title>
        <v-card-text class="pa-6 text-center">
          <p class="text-body-1">
            Are you sure you want to delete
            <strong>{{ editedItem.fName }} {{ editedItem.lName }}</strong>?
          </p>
          <p class="text-caption text-grey mt-2">This action cannot be undone.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeDelete">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Manager Role Dialog -->
    <v-dialog v-model="managerDialog" max-width="450px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4" style="background-color: #032F45; color: white">
          <v-icon color="white" class="mr-2">mdi-shield-crown</v-icon>
          Manager Role
        </v-card-title>
        <v-card-text class="pa-6" v-if="managerUser">
          <p class="text-body-1 mb-4">
            Assign or remove a manager position for
            <strong>{{ managerUser.fName }} {{ managerUser.lName }}</strong>
          </p>
          <v-select
            v-model="selectedPositionId"
            :items="managerPositions"
            item-title="position_name"
            item-value="position_id"
            label="Manager Position"
            variant="outlined"
            density="comfortable"
            clearable
            placeholder="None (remove manager role)"
          ></v-select>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeManager">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveManagerRole">Save</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.users-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-top: 24px;
}

.user-row:hover {
  background-color: #f9f5f6;
}

.text-white {
  color: white !important;
  font-weight: 600;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
