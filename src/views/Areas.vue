<script setup>
import { ref, onMounted, computed } from "vue";
import AreaServices from "../services/areaServices";
import Utils from "../config/utils";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);
const areas = ref([]);
const loading = ref(false);
const search = ref("");

// Dialog state
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

const editArea = (area) => {
  editedIndex.value = areas.value.indexOf(area);
  editedItem.value = { ...area };
  dialog.value = true;
};

const save = () => {
  if (!editedItem.value.area_code || !editedItem.value.area_name) return;

  if (editedIndex.value > -1) {
    // Update
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
    // Create
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

const deleteArea = (area) => {
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
            <th class="text-white">ID</th>
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
          <tr v-for="area in filteredAreas" :key="area.area_id" class="area-row">
            <td>{{ area.area_id }}</td>
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
              <v-btn icon size="small" variant="text" color="blue" @click="editArea(area)" class="mr-1">
                <v-icon size="20">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="small" variant="text" color="error" @click="deleteArea(area)">
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

.text-white {
  color: white !important;
  font-weight: 600;
}
</style>
