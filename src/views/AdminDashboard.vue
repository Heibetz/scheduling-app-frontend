<template>
  <v-container fluid class="pa-4">
    <div class="mb-6">
      <h1 class="text-h4 font-weight-bold mb-1">Admin Dashboard</h1>
      <p class="text-subtitle-1 text-grey-darken-1">Manage all users in the system</p>
    </div>
    <v-row class="mb-4">
      <v-col cols="12" class="d-flex justify-end">
        <v-btn color="primary" @click="showAddUser = true">
          <v-icon class="mr-2">mdi-account-plus</v-icon>
          Add User
        </v-btn>
      </v-col>
    </v-row>
    <v-card class="pa-2" elevation="2" style="max-height: 400px; overflow-y: auto;">
      <v-table dense>
        <thead>
          <tr>
            <th>ID</th>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Roles</th>
            <th>Super Admin</th>
            <th>Active</th>
            <th>Created At</th>
            <th>Updated At</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.user_id">
            <td>{{ user.user_id }}</td>
            <td>{{ user.fName }}</td>
            <td>{{ user.lName }}</td>
            <td>{{ user.email }}</td>
            <td>{{ user.phone }}</td>
            <td>{{ user.roles || '' }}</td>
            <td>{{ user.is_super_admin ? 'Yes' : 'No' }}</td>
            <td>{{ user.is_active ? 'Yes' : 'No' }}</td>
            <td>{{ formatDate(user.created_at) }}</td>
            <td>{{ formatDate(user.updated_at) }}</td>
            <td>
              <v-btn icon @click="editUser(user)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn icon @click="deactivateUser(user)"><v-icon>mdi-account-off</v-icon></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <v-dialog v-model="showAddUser" max-width="500px">
      <v-card>
        <v-card-title>Add New User</v-card-title>
        <v-card-text>
          <v-form ref="addUserForm" @submit.prevent="addUser">
            <v-text-field v-model="newUser.fName" label="First Name" required></v-text-field>
            <v-text-field v-model="newUser.lName" label="Last Name" required></v-text-field>
            <v-text-field v-model="newUser.email" label="Email" required></v-text-field>
            <v-text-field v-model="newUser.phone" label="Phone"></v-text-field>
            <v-text-field v-model="newUser.roles" label="Roles"></v-text-field>
            <v-checkbox v-model="newUser.is_super_admin" label="Super Admin"></v-checkbox>
            <v-checkbox v-model="newUser.is_active" label="Active"></v-checkbox>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="addUser">Save</v-btn>
          <v-btn text @click="showAddUser = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Edit User Dialog (for future expansion) -->
  </v-container>

  <v-divider class="my-8"></v-divider>

  <div>
    <h2 class="text-h5 font-weight-bold mb-2">Campus Areas</h2>
    <v-row class="mb-2">
      <v-col cols="12" class="d-flex justify-end">
        <v-btn color="primary" @click="openNewAreaDialog">
          <v-icon class="mr-2">mdi-plus</v-icon>
          Add Area
        </v-btn>
      </v-col>
    </v-row>
    <v-card class="pa-2 mb-4" elevation="2" style="max-height: 300px; overflow-y: auto;">
      <v-table dense>
        <thead>
          <tr>
            <th>Area Code</th>
            <th>Area Name</th>
            <th>Manager</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="area in areas" :key="area.area_id">
            <td>{{ area.area_code }}</td>
            <td>{{ area.area_name }}</td>
            <td>{{ getAreaManagerName(area.area_id) }}</td>
            <td>
              <v-btn icon @click="editArea(area)"><v-icon>mdi-pencil</v-icon></v-btn>
              <v-btn icon @click="deleteArea(area)"><v-icon>mdi-delete</v-icon></v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>
    <!-- Area Create/Edit Dialog -->
    <v-dialog v-model="showAreaDialog" max-width="500px">
      <v-card>
        <v-card-title>{{ areaDialogTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="areaForm" @submit.prevent="saveArea">
            <v-text-field v-model="areaFormData.area_code" label="Area Code" required></v-text-field>
            <v-text-field v-model="areaFormData.area_name" label="Area Name" required></v-text-field>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn color="primary" @click="saveArea">Save</v-btn>
          <v-btn text @click="showAreaDialog = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>

</template>

<script>
import { ref, onMounted } from "vue";
import UserServices from "../services/userServices";
import AreaServices from "../services/areaServices";
import PositionServices from "../services/positionServices";
import PositionUserServices from "../services/positionUserServices";

export default {
  setup() {
    const users = ref([]);
    const showAddUser = ref(false);
    const newUser = ref({
      fName: '',
      lName: '',
      email: '',
      phone: '',
      roles: '',
      is_super_admin: false,
      is_active: true
    });

    // AREAS state and logic
    const areas = ref([]);
    const showAreaDialog = ref(false);
    const areaFormData = ref({ area_id: null, area_code: '', area_name: '' });
    const areaDialogTitle = ref('Add Area');
    let editingAreaIndex = null;

    // Manager logic
    const positions = ref([]);
    const positionUsers = ref([]);

    const fetchUsers = async () => {
      try {
        const res = await UserServices.getAll();
        users.value = res.data;
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };
    const fetchAreas = async () => {
      try {
        const res = await AreaServices.getAll();
        areas.value = res.data;
      } catch (err) {
        console.error("Error fetching areas:", err);
      }
    };
    const fetchPositions = async () => {
      try {
        const res = await PositionServices.getAll();
        positions.value = res.data;
      } catch (err) {
        console.error("Error fetching positions:", err);
      }
    };
    const fetchPositionUsers = async () => {
      try {
        const res = await PositionUserServices.getAll();
        positionUsers.value = res.data;
      } catch (err) {
        console.error("Error fetching position-users:", err);
      }
    };

    // Get the first manager's name for an area
    const getAreaManagerName = (areaId) => {
      // Find all positions for this area that are manager positions
      const managerPositions = positions.value.filter(
        (p) => p.area_id === areaId && p.is_manager
      );
      // Find the first position-user for a manager position
      for (const pos of managerPositions) {
        const pu = positionUsers.value.find((pu) => pu.position_id === pos.position_id);
        if (pu) {
          const user = users.value.find((u) => u.user_id === pu.user_id);
          if (user) return user.fName + ' ' + user.lName;
        }
      }
      return '';
    };

    const openNewAreaDialog = () => {
      areaDialogTitle.value = 'Add Area';
      areaFormData.value = { area_id: null, area_code: '', area_name: '' };
      editingAreaIndex = null;
      showAreaDialog.value = true;
    };
    const editArea = (area) => {
      areaDialogTitle.value = 'Edit Area';
      areaFormData.value = { ...area };
      editingAreaIndex = areas.value.findIndex(a => a.area_id === area.area_id);
      showAreaDialog.value = true;
    };
    const saveArea = async () => {
      if (!areaFormData.value.area_code || !areaFormData.value.area_name) return;
      try {
        if (areaFormData.value.area_id) {
          await AreaServices.update(areaFormData.value.area_id, {
            area_code: areaFormData.value.area_code,
            area_name: areaFormData.value.area_name
          });
        } else {
          await AreaServices.create({
            area_code: areaFormData.value.area_code,
            area_name: areaFormData.value.area_name
          });
        }
        showAreaDialog.value = false;
        fetchAreas();
      } catch (err) {
        console.error("Error saving area:", err);
      }
    };
    const deleteArea = async (area) => {
      if (!confirm('Are you sure you want to delete this area?')) return;
      try {
        await AreaServices.delete(area.area_id);
        fetchAreas();
      } catch (err) {
        console.error("Error deleting area:", err);
      }
    };

    const addUser = async () => {
      await UserServices.create(newUser.value);
      showAddUser.value = false;
      fetchUsers();
    };
    const editUser = (user) => {
      alert('Edit user: ' + user.user_id);
    };
    const deactivateUser = (user) => {
      alert('Deactivate user: ' + user.user_id);
    };
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    onMounted(() => {
      fetchUsers();
      fetchAreas();
      fetchPositions();
      fetchPositionUsers();
    });

    return {
      users,
      showAddUser,
      newUser,
      fetchUsers,
      addUser,
      editUser,
      deactivateUser,
      formatDate,
      // Areas
      areas,
      showAreaDialog,
      areaFormData,
      areaDialogTitle,
      openNewAreaDialog,
      editArea,
      saveArea,
      deleteArea,
      // Manager logic
      getAreaManagerName
    };
  }
};
</script>
