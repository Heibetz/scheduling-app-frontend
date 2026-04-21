<script setup>
import ocLogo from "/oc-logo-white.png";

import { ref, onMounted, watch } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import NotificationServices from "../services/notificationServices";
import AreaServices from "../services/areaServices";
import PositionServices from "../services/positionServices";
import PositionUserServices from "../services/positionUserServices";
import { useRouter } from 'vue-router'

const notifications = ref([]);
const showNotifications = ref(false);
const managedAreas = ref([]);

const fetchNotifications = () => {
  if (user.value && user.value.userId) {
    NotificationServices.getForUser(user.value.userId)
      .then(res => {
        notifications.value = res.data.map(n => ({
          id: n.notification_id,
          message: n.message,
          read: n.is_read,
          type: n.type || '',
          created_at: n.created_at || null,
        }));
      })
      .catch(() => {
        notifications.value = [];
      });
  }
};

const markAllAsRead = () => {
  const unread = notifications.value.filter(n => !n.read);
  Promise.all(unread.map(n => NotificationServices.markAsRead(n.id)))
    .then(() => fetchNotifications());
};

const clearReadNotifications = () => {
  if (!user.value) return;
  NotificationServices.clearRead(user.value.userId)
    .then(() => fetchNotifications());
};

const formatNotifTime = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const notifIcon = (type) => {
  switch (type) {
    case 'shift_confirmed': return { icon: 'mdi-check-circle', color: '#28a745' };
    case 'shift_cancelled': return { icon: 'mdi-close-circle', color: '#dc3545' };
    case 'shift_changed': return { icon: 'mdi-pencil-circle', color: '#ffc107' };
    case 'shift_unassigned': return { icon: 'mdi-account-minus', color: '#6c757d' };
    default: return { icon: 'mdi-calendar-clock', color: '#007bff' };
  }
};

const router = useRouter()
const user = ref(null);
const title = ref("Scheduling App");
const initials = ref("");
const name = ref("");
const logoURL = ref("");

const resetMenu = () => {
  user.value = null;
  user.value = Utils.getStore("user");
  if (user.value) {
    initials.value = user.value.fName[0] + user.value.lName[0];
    name.value = user.value.fName + " " + user.value.lName;
  }
  title.value = "Campus Scheduler";
};

const logout = () => {
  AuthServices.logoutUser(user.value)
    .then((response) => {
      
      Utils.removeItem("user");
      router.push({ name: "login" });
    })
    .catch((error) => {
      console.log("error", error);
    });
};


const fetchManagerStatus = async () => {
  if (!user.value) return;
  try {
    const [areaRes, posRes, puRes] = await Promise.all([
      AreaServices.getAll(),
      PositionServices.getAll(),
      PositionUserServices.getAll(),
    ]);
    const managerPositions = posRes.data.filter((p) => p.is_manager);
    const userId = user.value.userId || user.value.user_id;
    const myManagerPositionIds = puRes.data
      .filter((pu) => Number(pu.user_id) === Number(userId))
      .map((pu) => Number(pu.position_id));
    const myManagerPositions = managerPositions.filter((p) =>
      myManagerPositionIds.includes(Number(p.position_id))
    );
    const areaMap = Object.fromEntries(
      areaRes.data.map((a) => [a.area_id, a])
    );
    managedAreas.value = myManagerPositions.map((p) => ({
      area_id: p.area_id,
      area_code: areaMap[p.area_id]?.area_code || "Unknown",
      area_name: areaMap[p.area_id]?.area_name || "Unknown",
      position_name: p.position_name,
    }));
  } catch (err) {
    console.error("Error fetching manager status:", err);
    managedAreas.value = [];
  }
};

onMounted(() => {
  logoURL.value = ocLogo;
  resetMenu();
  fetchNotifications();
  fetchManagerStatus();
});

// Refetch notifications when menu is opened
watch(showNotifications, (val) => {
  if (val) fetchNotifications();
});
</script>

<template>
  <div>
    <v-app-bar app class="modern-navbar" elevation="1">
      <router-link :to="{ name: 'dashboard' }" class="logo-link">
        <v-img
          class="logo-img"
          :src="logoURL"
          height="40"
          width="40"
          contain
        ></v-img>
      </router-link>
      
      <div class="app-title">
        <span class="title-text">{{ title }}</span>
      </div>
      
      <v-spacer></v-spacer>
      
      <!-- Navigation Links -->
      <div v-if="user" class="nav-links">
        <v-btn 
          v-if="!user.is_super_admin" 
          :to="{ name: 'dashboard' }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-view-dashboard</v-icon>
          Dashboard
        </v-btn>

        <v-btn
          v-if="!user.is_super_admin"
          :to="{ name: 'open-shifts' }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-briefcase-outline</v-icon>
          Open shifts
        </v-btn>
        
        <v-btn 
          v-if="!user.is_super_admin" 
          :to="{ name: 'availability' }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-clock-outline</v-icon>
          Unavailability
        </v-btn>
        
        <v-btn 
          v-if="user.is_super_admin" 
          :to="{ name: 'areas' }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-map-marker-multiple</v-icon>
          Areas
        </v-btn>
        
        <v-btn 
          v-if="user.is_super_admin" 
          :to="{ name: 'users' }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-account-group</v-icon>
          Users
        </v-btn>
        
        <v-btn
          v-for="ma in managedAreas"
          :key="ma.area_id"
          :to="{ name: 'manager-dashboard', query: { area: ma.area_id } }"
          class="nav-btn"
          variant="text"
          rounded="lg"
        >
          <v-icon class="nav-icon">mdi-office-building</v-icon>
          {{ ma.area_name }} Dashboard
        </v-btn>
      </div>

      <!-- Notification Icon -->
      <div v-if="user" class="notification-section">
        <v-menu
          v-model="showNotifications"
          :close-on-content-click="false"
          offset-y
          location="bottom end"
          min-width="400px"
          max-width="420px"
        >
          <template v-slot:activator="{ props }">
            <v-btn 
              icon 
              v-bind="props" 
              class="notification-btn"
              variant="text"
              size="large"
            >
              <v-badge 
                :content="notifications.filter(n => !n.read).length" 
                color="#dc3545" 
                v-if="notifications.filter(n => !n.read).length > 0"
              >
                <v-icon color="#495057">mdi-bell</v-icon>
              </v-badge>
              <template v-else>
                <v-icon color="#495057">mdi-bell-outline</v-icon>
              </template>
            </v-btn>
          </template>
          
          <v-card class="notification-card" rounded="lg" elevation="3">
            <v-card-title class="notification-header">
              <span class="notification-title">Notifications</span>
              <v-btn 
                size="small"
                variant="text"
                color="#6c757d"
                @click="markAllAsRead"
                class="mark-read-btn"
              >
                Mark all as read
              </v-btn>
              <v-btn 
                size="small"
                variant="text"
                color="#d32f2f"
                @click="clearReadNotifications"
                class="mark-read-btn"
              >
                Clear read
              </v-btn>
            </v-card-title>
            
            <v-divider></v-divider>
            
            <v-list class="notification-list">
              <v-list-item 
                v-for="notif in notifications" 
                :key="notif.id"
                :class="{'unread-notification': !notif.read}"
                class="notification-item"
              >
                <template v-slot:prepend>
                  <v-icon 
                    :color="notifIcon(notif.type).color" 
                    size="22" 
                    class="notif-icon"
                  >
                    {{ notifIcon(notif.type).icon }}
                  </v-icon>
                </template>
                <div class="notification-content">
                  <div class="notification-text">{{ notif.message }}</div>
                  <div class="notification-time" v-if="notif.created_at">
                    {{ formatNotifTime(notif.created_at) }}
                  </div>
                </div>
              </v-list-item>
              
              <v-list-item v-if="notifications.length === 0" class="empty-notifications">
                <v-list-item-content>
                  <v-list-item-title class="empty-text">No notifications</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>

      <!-- User Profile Menu -->
      <v-menu 
        v-if="user"
        bottom 
        min-width="240px" 
        rounded="lg" 
        offset-y
        location="bottom end"
      >
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon class="profile-btn" variant="text">
            <v-avatar class="user-avatar" size="36">
              <span class="avatar-text">{{ initials }}</span>
            </v-avatar>
          </v-btn>
        </template>
        
        <v-card class="profile-card" rounded="lg" elevation="3">
          <v-card-text class="profile-content">
            <div class="profile-header">
              <v-avatar class="profile-avatar" size="48">
                <span class="profile-avatar-text">{{ initials }}</span>
              </v-avatar>
              <div class="profile-info">
                <h3 class="profile-name">{{ name }}</h3>
                <p class="profile-email">{{ user.email }}</p>
              </div>
            </div>
            
            <v-divider class="profile-divider"></v-divider>
            
            <div class="profile-actions">
              <v-btn 
                variant="text"
                rounded="lg"
                @click="router.push({ name: 'profile' })"
                class="profile-action-btn"
                block
              > 
                <v-icon class="mr-2">mdi-account</v-icon>
                Profile 
              </v-btn>
              
              <v-btn 
                variant="text"
                rounded="lg"
                @click="logout"
                class="profile-action-btn logout-btn"
                color="#dc3545"
                block
              >
                <v-icon class="mr-2">mdi-logout</v-icon>
                Logout 
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>
  </div>
</template>

<style scoped>
.modern-navbar {
  background-color: white !important;
  border-bottom: 1px solid #e9ecef;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06) !important;
}

.logo-link {
  text-decoration: none;
  margin-right: 1rem;
}

.logo-img {
  border-radius: 8px;
}

.app-title {
  margin-right: 2rem;
}

.title-text {
  font-size: 1.375rem;
  font-weight: 700;
  color: #2c3e50;
  letter-spacing: -0.025em;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-right: 1rem;
}

.nav-btn {
  color: #495057 !important;
  text-transform: none;
  font-weight: 500;
  font-size: 0.875rem;
  padding: 0.5rem 1rem;
  height: 40px;
}

.nav-btn:hover {
  background-color: #f8f9fa !important;
  color: #2c3e50 !important;
}

.nav-btn.router-link-active {
  background-color: #2c3e50 !important;
  color: white !important;
}

.nav-icon {
  margin-right: 0.5rem;
  font-size: 1.125rem;
}

.notification-section {
  margin-right: 0.5rem;
}

.notification-btn {
  background-color: transparent !important;
}

.notification-btn:hover {
  background-color: #f8f9fa !important;
}

.notification-card {
  min-width: 400px;
  max-width: 420px;
  border: 1px solid #e9ecef;
}

.notification-header {
  padding: 1rem 1.25rem 0.75rem 1.25rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notification-title {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
}

.mark-read-btn {
  font-size: 0.75rem;
  text-transform: none;
  padding: 0.25rem 0.5rem;
  height: auto;
  min-height: auto;
}

.notification-list {
  max-height: 500px;
  overflow-y: auto;
  padding: 0;
}

.notification-item {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid #f8f9fa;
}

.notification-item:last-child {
  border-bottom: none;
}

.unread-notification {
  background-color: #f0f7ff !important;
  border-left: 3px solid #007bff;
}

.notif-icon {
  margin-right: 0.75rem;
  flex-shrink: 0;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-text {
  font-size: 0.875rem;
  line-height: 1.5;
  color: #495057;
  white-space: normal;
  word-wrap: break-word;
}

.notification-time {
  font-size: 0.75rem;
  color: #adb5bd;
  margin-top: 0.25rem;
}

.empty-notifications {
  text-align: center;
  padding: 2rem 1.25rem;
}

.empty-text {
  color: #6c757d;
  font-size: 0.875rem;
  font-style: italic;
}

.profile-btn {
  background-color: transparent !important;
}

.profile-btn:hover {
  background-color: #f8f9fa !important;
}

.user-avatar {
  background-color: #2c3e50 !important;
  color: white;
}

.avatar-text {
  font-weight: 600;
  font-size: 0.875rem;
  letter-spacing: 0.025em;
}

.profile-card {
  border: 1px solid #e9ecef;
  min-width: 240px;
}

.profile-content {
  padding: 1.25rem;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.profile-avatar {
  background-color: #2c3e50 !important;
  color: white;
}

.profile-avatar-text {
  font-weight: 600;
  font-size: 1rem;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 1rem;
  font-weight: 600;
  color: #212529;
  margin: 0;
}

.profile-email {
  font-size: 0.75rem;
  color: #6c757d;
  margin: 0.25rem 0 0 0;
}

.profile-divider {
  margin: 0 -1.25rem 1rem -1.25rem;
}

.profile-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-action-btn {
  justify-content: flex-start;
  text-transform: none;
  font-weight: 500;
  color: #495057 !important;
  height: 40px;
}

.profile-action-btn:hover {
  background-color: #f8f9fa !important;
}

.logout-btn:hover {
  background-color: #fef2f2 !important;
  color: #dc3545 !important;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .nav-btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.8rem;
  }
  
  .nav-icon {
    margin-right: 0.25rem;
    font-size: 1rem;
  }
}

@media (max-width: 768px) {
  .nav-links {
    display: none;
  }
  
  .title-text {
    font-size: 1.125rem;
  }
  
  .app-title {
    margin-right: 1rem;
  }
}

/* Smooth transitions */
.nav-btn,
.notification-btn,
.profile-btn {
  transition: all 0.2s ease;
}

.notification-card,
.profile-card {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
