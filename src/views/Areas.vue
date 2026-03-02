<script setup>
import { ref, onMounted, computed } from "vue";
import AreaServices from "../services/areaServices";
import PositionServices from "../services/positionServices";
import PositionUserServices from "../services/positionUserServices";
import UserServices from "../services/userServices";
import Utils from "../config/utils";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const areas = ref([]);
const loading = ref(false);
const search = ref("");

// Area CRUD dialog state
const dialog = ref(false);
const dialogDelete = ref(false);
const editedIndex = ref(-1);
const editedItem = ref({ area_code: "", area_name: "" });
const defaultItem = { area_code: "", area_name: "" };

const isSuperAdmin = computed(() => user.value && user.value.is_super_admin);

const formTitle = computed(() =>
  editedIndex.value === -1 ? "New Area" : "Edit Area"
);

const filteredAreas = computed(() => {
  if (!search.value) return areas.value;
  const s = search.value.toLowerCase();
  return areas.value.filter(
    (a) =>
      a.area_code.toLowerCase().includes(s) ||
      a.area_name.toLowerCase().includes(s)
  );
});

const fetchAreas = () => {
  loading.value = true;
  AreaServices.getAll()
    .then((res) => {
      areas.value = res.data;
    })
    .catch((err) => {
      console.error("Error fetching areas:", err);
    })
    .finally(() => {
      loading.value = false;
    });
};

const openNew = () => {
  editedIndex.value = -1;
  editedItem.value = { ...defaultItem };
  dialog.value = true;
};

const editArea = (area, event) => {
  event.stopPropagation();
  editedIndex.value = areas.value.indexOf(area);
  editedItem.value = { ...area };
  dialog.value = true;
};

const save = () => {
  if (!editedItem.value.area_code || !editedItem.value.area_name) return;

  if (editedIndex.value > -1) {
    AreaServices.update(editedItem.value.area_id, {
      area_code: editedItem.value.area_code,
      area_name: editedItem.value.area_name,
    })
      .then(() => {
        fetchAreas();
        close();
      })
      .catch((err) => console.error("Error updating area:", err));
  } else {
    AreaServices.create({
      area_code: editedItem.value.area_code,
      area_name: editedItem.value.area_name,
    })
      .then(() => {
        fetchAreas();
        close();
      })
      .catch((err) => console.error("Error creating area:", err));
  }
};

const deleteArea = (area, event) => {
  event.stopPropagation();
  editedItem.value = { ...area };
  dialogDelete.value = true;
};

const confirmDelete = () => {
  AreaServices.delete(editedItem.value.area_id)
    .then(() => {
      fetchAreas();
      closeDelete();
    })
    .catch((err) => console.error("Error deleting area:", err));
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

// ========== AREA DETAIL DIALOG ==========
const detailDialog = ref(false);
const selectedArea = ref(null);
const detailTab = ref("positions");

// Positions for this area
const areaPositions = ref([]);
const positionLoading = ref(false);

// Position CRUD
const positionDialog = ref(false);
const positionDeleteDialog = ref(false);
const editedPositionIndex = ref(-1);
const editedPosition = ref({ position_name: "", is_manager: false });
const defaultPosition = { position_name: "", is_manager: false };

const positionFormTitle = computed(() =>
  editedPositionIndex.value === -1 ? "New Position" : "Edit Position"
);

// Users assigned to this area (via PositionUser)
const allUsers = ref([]);
const allPositionUsers = ref([]);
const userLoading = ref(false);

// User assignment CRUD
const assignDialog = ref(false);
const assignDeleteDialog = ref(false);
const selectedUserId = ref(null);
const selectedPositionId = ref(null);
const editedAssignment = ref(null);

// Computed: users assigned to positions in this area
const areaAssignments = computed(() => {
  const posIds = areaPositions.value.map((p) => p.position_id);
  return allPositionUsers.value
    .filter((pu) => posIds.includes(pu.position_id))
    .map((pu) => {
      const u = allUsers.value.find((u) => u.user_id === pu.user_id);
      const p = areaPositions.value.find((p) => p.position_id === pu.position_id);
      return {
        ...pu,
        userName: u ? `${u.fName} ${u.lName}` : "Unknown",
        userEmail: u ? u.email : "",
        positionName: p ? p.position_name : "Unknown",
        isManager: p ? p.is_manager : false,
      };
    });
});

// Users not yet assigned to any position in this area
const availableUsers = computed(() => {
  const assignedUserIds = areaAssignments.value.map((a) => a.user_id);
  return allUsers.value.filter((u) => !assignedUserIds.includes(u.user_id));
});

const openAreaDetail = async (area) => {
  selectedArea.value = { ...area };
  detailTab.value = "positions";
  detailDialog.value = true;
  await fetchAreaDetail();
};

const fetchAreaDetail = async () => {
  positionLoading.value = true;
  userLoading.value = true;
  try {
    const [posRes, puRes, usersRes] = await Promise.all([
      PositionServices.getAll(),
      PositionUserServices.getAll(),
      UserServices.getAll(),
    ]);
    // Filter positions to this area
    areaPositions.value = posRes.data.filter(
      (p) => p.area_id === selectedArea.value.area_id
    );
    allPositionUsers.value = puRes.data;
    allUsers.value = usersRes.data;
  } catch (err) {
    console.error("Error fetching area detail:", err);
  } finally {
    positionLoading.value = false;
    userLoading.value = false;
  }
};

const closeDetail = () => {
  detailDialog.value = false;
  selectedArea.value = null;
};

// -- Position CRUD within area --
const openNewPosition = () => {
  editedPositionIndex.value = -1;
  editedPosition.value = { ...defaultPosition };
  positionDialog.value = true;
};

const editPositionItem = (pos) => {
  editedPositionIndex.value = areaPositions.value.indexOf(pos);
  editedPosition.value = { ...pos };
  positionDialog.value = true;
};

const savePosition = async () => {
  if (!editedPosition.value.position_name) return;
  try {
    if (editedPositionIndex.value > -1) {
      await PositionServices.update(editedPosition.value.position_id, {
        position_name: editedPosition.value.position_name,
        is_manager: editedPosition.value.is_manager,
      });
    } else {
      await PositionServices.create({
        area_id: selectedArea.value.area_id,
        position_name: editedPosition.value.position_name,
        is_manager: editedPosition.value.is_manager,
      });
    }
    await fetchAreaDetail();
    closePositionDialog();
  } catch (err) {
    console.error("Error saving position:", err);
  }
};

const deletePositionItem = (pos) => {
  editedPosition.value = { ...pos };
  positionDeleteDialog.value = true;
};

const confirmDeletePosition = async () => {
  try {
    await PositionServices.delete(editedPosition.value.position_id);
    await fetchAreaDetail();
    positionDeleteDialog.value = false;
    editedPosition.value = { ...defaultPosition };
  } catch (err) {
    console.error("Error deleting position:", err);
  }
};

const closePositionDialog = () => {
  positionDialog.value = false;
  editedPositionIndex.value = -1;
  editedPosition.value = { ...defaultPosition };
};

// -- User assignment CRUD within area --
const openAssignUser = () => {
  selectedUserId.value = null;
  selectedPositionId.value = null;
  assignDialog.value = true;
};

const saveAssignment = async () => {
  if (!selectedUserId.value || !selectedPositionId.value) return;
  try {
    await PositionUserServices.create({
      user_id: selectedUserId.value,
      position_id: selectedPositionId.value,
    });
    await fetchAreaDetail();
    closeAssignDialog();
  } catch (err) {
    console.error("Error assigning user:", err);
  }
};

const removeAssignment = (assignment) => {
  editedAssignment.value = assignment;
  assignDeleteDialog.value = true;
};

const confirmRemoveAssignment = async () => {
  try {
    await PositionUserServices.delete(editedAssignment.value.position_user_id);
    await fetchAreaDetail();
    assignDeleteDialog.value = false;
    editedAssignment.value = null;
  } catch (err) {
    console.error("Error removing assignment:", err);
  }
};

const closeAssignDialog = () => {
  assignDialog.value = false;
  selectedUserId.value = null;
  selectedPositionId.value = null;
};

onMounted(() => {
  user.value = Utils.getStore("user");
  if (!user.value || !user.value.is_super_admin) {
    router.push({ name: "dashboard" });
    return;
  }
  fetchAreas();
});
</script>

<template>
  <v-container class="areas-page" fluid>
    <!-- Header -->
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4 font-weight-bold" style="color: #80162B">
          <v-icon size="36" color="primary" class="mr-2">mdi-map-marker-multiple</v-icon>
          Area Management
        </h1>
        <p class="text-subtitle-1 text-grey mt-1">Create, edit, and manage scheduling areas</p>
      </v-col>
    </v-row>

    <!-- Toolbar -->
    <v-row class="mb-2">
      <v-col cols="12" sm="6" md="4">
        <v-text-field
          v-model="search"
          prepend-inner-icon="mdi-magnify"
          label="Search areas..."
          variant="outlined"
          density="compact"
          hide-details
          clearable
        ></v-text-field>
      </v-col>
      <v-spacer></v-spacer>
      <v-col cols="auto">
        <v-btn color="primary" @click="openNew" prepend-icon="mdi-plus">
          New Area
        </v-btn>
      </v-col>
    </v-row>

    <!-- Areas Table -->
    <v-card elevation="2" rounded="lg">
      <v-table>
        <thead>
          <tr style="background-color: #80162B">
            <th class="text-white">Area Code</th>
            <th class="text-white">Area Name</th>
            <th class="text-white">Created</th>
            <th class="text-white text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" class="text-center pa-6">
              <v-progress-circular indeterminate color="primary"></v-progress-circular>
            </td>
          </tr>
          <tr v-else-if="filteredAreas.length === 0">
            <td colspan="5" class="text-center pa-6 text-grey">
              No areas found
            </td>
          </tr>
          <tr v-for="area in filteredAreas" :key="area.area_id" class="area-row clickable-row" @click="openAreaDetail(area)">
            <td>
              <v-chip size="small" color="primary" variant="outlined">
                {{ area.area_code }}
              </v-chip>
            </td>
            <td class="font-weight-medium">{{ area.area_name }}</td>
            <td class="text-grey">
              {{ area.created_at ? new Date(area.created_at).toLocaleDateString() : "—" }}
            </td>
            <td class="text-center">
              <v-btn icon size="small" variant="text" color="blue" @click="editArea(area, $event)" class="mr-1">
                <v-icon size="20">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" @click="deleteArea(area, $event)">
                <v-icon size="20">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create / Edit Dialog -->
    <v-dialog v-model="dialog" max-width="500px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4" style="background-color: #80162B; color: white">
          <v-icon color="white" class="mr-2">
            {{ editedIndex === -1 ? 'mdi-plus-circle' : 'mdi-pencil-circle' }}
          </v-icon>
          {{ formTitle }}
        </v-card-title>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="editedItem.area_code"
            label="Area Code"
            variant="outlined"
            density="comfortable"
            placeholder="e.g. DUB"
            class="mb-4"
            :rules="[v => !!v || 'Area code is required']"
          ></v-text-field>
          <v-text-field
            v-model="editedItem.area_name"
            label="Area Name"
            variant="outlined"
            density="comfortable"
            placeholder="e.g. The Dub"
            :rules="[v => !!v || 'Area name is required']"
          ></v-text-field>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="close">Cancel</v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="save"
            :disabled="!editedItem.area_code || !editedItem.area_name"
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
            Are you sure you want to delete area
            <strong>{{ editedItem.area_name }}</strong> ({{ editedItem.area_code }})?
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

    <!-- ========== AREA DETAIL DIALOG ========== -->
    <v-dialog v-model="detailDialog" max-width="800px" persistent>
      <v-card rounded="lg" v-if="selectedArea">
        <v-card-title class="pa-4 d-flex align-center" style="background-color: #80162B; color: white">
          <v-icon color="white" class="mr-2">mdi-map-marker</v-icon>
          {{ selectedArea.area_name }}
          <v-chip size="small" variant="outlined" color="white" class="ml-3">{{ selectedArea.area_code }}</v-chip>
          <v-spacer></v-spacer>
          <v-btn icon variant="text" color="white" @click="closeDetail">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>

        <v-tabs v-model="detailTab" color="primary" class="px-4 pt-2">
          <v-tab value="positions">
            <v-icon start>mdi-briefcase</v-icon>
            Positions
          </v-tab>
          <v-tab value="users">
            <v-icon start>mdi-account-multiple</v-icon>
            Users
          </v-tab>
        </v-tabs>

        <v-divider></v-divider>

        <v-window v-model="detailTab">
          <!-- ===== POSITIONS TAB ===== -->
          <v-window-item value="positions">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <h3 class="text-h6">Positions in this Area</h3>
                <v-spacer></v-spacer>
                <v-btn size="small" color="primary" prepend-icon="mdi-plus" @click="openNewPosition">
                  Add Position
                </v-btn>
              </div>

              <v-table density="comfortable" v-if="!positionLoading">
                <thead>
                  <tr style="background-color: #032F45">
                    <th class="text-white">Position Name</th>
                    <th class="text-white text-center">Manager Role</th>
                    <th class="text-white text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="areaPositions.length === 0">
                    <td colspan="3" class="text-center pa-4 text-grey">No positions yet</td>
                  </tr>
                  <tr v-for="pos in areaPositions" :key="pos.position_id" class="area-row">
                    <td class="font-weight-medium">{{ pos.position_name }}</td>
                    <td class="text-center">
                      <v-chip v-if="pos.is_manager" size="small" color="teal" variant="flat">
                        <v-icon size="14" start>mdi-shield-crown</v-icon>
                        Manager
                      </v-chip>
                      <span v-else class="text-grey">—</span>
                    </td>
                    <td class="text-center">
                      <v-btn icon size="small" variant="text" color="blue" @click="editPositionItem(pos)" class="mr-1">
                        <v-icon size="20">mdi-pencil</v-icon>
                      </v-btn>
                      <v-btn icon size="small" variant="text" color="error" @click="deletePositionItem(pos)">
                        <v-icon size="20">mdi-delete</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div v-else class="text-center pa-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
            </v-card-text>
          </v-window-item>

          <!-- ===== USERS TAB ===== -->
          <v-window-item value="users">
            <v-card-text class="pa-4">
              <div class="d-flex align-center mb-3">
                <h3 class="text-h6">Users Assigned to this Area</h3>
                <v-spacer></v-spacer>
                <v-btn size="small" color="primary" prepend-icon="mdi-account-plus" @click="openAssignUser" :disabled="areaPositions.length === 0">
                  Assign User
                </v-btn>
              </div>

              <v-alert v-if="areaPositions.length === 0" type="info" variant="tonal" density="compact" class="mb-3">
                Create positions first before assigning users.
              </v-alert>

              <v-table density="comfortable" v-if="!userLoading">
                <thead>
                  <tr style="background-color: #032F45">
                    <th class="text-white">Name</th>
                    <th class="text-white">Email</th>
                    <th class="text-white">Position</th>
                    <th class="text-white text-center">Role</th>
                    <th class="text-white text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="areaAssignments.length === 0">
                    <td colspan="5" class="text-center pa-4 text-grey">No users assigned</td>
                  </tr>
                  <tr v-for="a in areaAssignments" :key="a.position_user_id" class="area-row">
                    <td class="font-weight-medium">{{ a.userName }}</td>
                    <td>{{ a.userEmail }}</td>
                    <td>{{ a.positionName }}</td>
                    <td class="text-center">
                      <v-chip v-if="a.isManager" size="small" color="teal" variant="flat">
                        <v-icon size="14" start>mdi-shield-crown</v-icon>
                        Manager
                      </v-chip>
                      <span v-else class="text-grey">Worker</span>
                    </td>
                    <td class="text-center">
                      <v-btn icon size="small" variant="text" color="error" @click="removeAssignment(a)">
                        <v-icon size="20">mdi-account-remove</v-icon>
                      </v-btn>
                    </td>
                  </tr>
                </tbody>
              </v-table>
              <div v-else class="text-center pa-6">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
              </div>
            </v-card-text>
          </v-window-item>
        </v-window>
      </v-card>
    </v-dialog>

    <!-- Position Create/Edit Dialog -->
    <v-dialog v-model="positionDialog" max-width="450px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4" style="background-color: #032F45; color: white">
          <v-icon color="white" class="mr-2">
            {{ editedPositionIndex === -1 ? 'mdi-plus-circle' : 'mdi-pencil-circle' }}
          </v-icon>
          {{ positionFormTitle }}
        </v-card-title>
        <v-card-text class="pa-6">
          <v-text-field
            v-model="editedPosition.position_name"
            label="Position Name"
            variant="outlined"
            density="comfortable"
            placeholder="e.g. Server, Host, Manager"
            class="mb-4"
            :rules="[v => !!v || 'Position name is required']"
          ></v-text-field>
          <v-switch
            v-model="editedPosition.is_manager"
            label="Manager Role"
            color="teal"
            hide-details
          ></v-switch>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closePositionDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="savePosition" :disabled="!editedPosition.position_name">
            {{ editedPositionIndex === -1 ? 'Create' : 'Save' }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Position Delete Confirmation -->
    <v-dialog v-model="positionDeleteDialog" max-width="400px">
      <v-card rounded="lg">
        <v-card-title class="pa-4 text-center" style="background-color: #EE5044; color: white">
          <v-icon color="white" class="mr-2">mdi-alert-circle</v-icon>
          Delete Position
        </v-card-title>
        <v-card-text class="pa-6 text-center">
          <p class="text-body-1">
            Delete position <strong>{{ editedPosition.position_name }}</strong>?
          </p>
          <p class="text-caption text-grey mt-2">All user assignments to this position will also be removed.</p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="positionDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDeletePosition">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Assign User Dialog -->
    <v-dialog v-model="assignDialog" max-width="450px" persistent>
      <v-card rounded="lg">
        <v-card-title class="pa-4" style="background-color: #032F45; color: white">
          <v-icon color="white" class="mr-2">mdi-account-plus</v-icon>
          Assign User to Position
        </v-card-title>
        <v-card-text class="pa-6">
          <v-select
            v-model="selectedUserId"
            :items="availableUsers"
            :item-title="(u) => `${u.fName} ${u.lName} (${u.email})`"
            item-value="user_id"
            label="Select User"
            variant="outlined"
            density="comfortable"
            class="mb-4"
          ></v-select>
          <v-select
            v-model="selectedPositionId"
            :items="areaPositions"
            item-title="position_name"
            item-value="position_id"
            label="Select Position"
            variant="outlined"
            density="comfortable"
          ></v-select>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="closeAssignDialog">Cancel</v-btn>
          <v-btn color="primary" variant="flat" @click="saveAssignment" :disabled="!selectedUserId || !selectedPositionId">
            Assign
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Remove Assignment Confirmation -->
    <v-dialog v-model="assignDeleteDialog" max-width="400px">
      <v-card rounded="lg">
        <v-card-title class="pa-4 text-center" style="background-color: #EE5044; color: white">
          <v-icon color="white" class="mr-2">mdi-account-remove</v-icon>
          Remove User
        </v-card-title>
        <v-card-text class="pa-6 text-center" v-if="editedAssignment">
          <p class="text-body-1">
            Remove <strong>{{ editedAssignment.userName }}</strong> from
            <strong>{{ editedAssignment.positionName }}</strong>?
          </p>
        </v-card-text>
        <v-card-actions class="pa-4 pt-0">
          <v-spacer></v-spacer>
          <v-btn variant="text" @click="assignDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="flat" @click="confirmRemoveAssignment">Remove</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<style scoped>
.areas-page {
  max-width: 960px;
  margin: 0 auto;
  padding-top: 24px;
}

.area-row:hover {
  background-color: #f9f5f6;
}

.clickable-row {
  cursor: pointer;
}

.text-white {
  color: white !important;
  font-weight: 600;
}
</style>
