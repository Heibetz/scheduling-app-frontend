<script setup>
import ocLogo from "/oc-logo-white.png";

import { ref, onMounted, watch } from "vue";
import Utils from "../config/utils";
import AuthServices from "../services/authServices";
import NotificationServices from "../services/notificationServices";
import { useRouter, useRoute } from 'vue-router'

const notifications = ref([]);
const showNotifications = ref(false);

const fetchNotifications = () => {
  if (user.value && user.value.userId) {
    NotificationServices.getForUser(user.value.userId)
      .then(res => {
        notifications.value = res.data.map(n => ({
          id: n.notification_id,
          message: n.message,
          read: n.is_read,
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


onMounted(() => {
  logoURL.value = ocLogo;
  resetMenu();
  fetchNotifications();
});

// Refetch notifications when menu is opened
watch(showNotifications, (val) => {
  if (val) fetchNotifications();
});
</script>

<template>
  <div>
    <v-app-bar app>
      <router-link :to="{ name: 'profile' }">
        <v-img
          class="mx-2"
          :src="logoURL"
          height="50"
          width="50"
          contain
        ></v-img>
      </router-link>
      <v-toolbar-title class="title">
        {{ title }}
      </v-toolbar-title>
      <v-spacer></v-spacer>
      <!-- Notification Icon -->
      <div v-if="user">
        <v-menu
          v-model="showNotifications"
          :close-on-content-click="false"
          offset-y
          right
          min-width="300px"
          location="top end"
        >
          <template v-slot:activator="{ props }">
            <v-btn icon v-bind="props" class="mx-2">
              <v-badge :content="notifications.filter(n => !n.read).length" color="red" v-if="notifications.filter(n => !n.read).length > 0">
                <v-icon>mdi-bell</v-icon>
              </v-badge>
              <template v-else>
                <v-icon>mdi-bell-outline</v-icon>
              </template>
            </v-btn>
          </template>
          <v-card>
            <v-card-title class="d-flex justify-space-between align-center">
              Notifications
              <v-btn text small @click="markAllAsRead">Mark all as read</v-btn>
            </v-card-title>
            <v-divider></v-divider>
            <v-list>
              <v-list-item v-for="notif in notifications" :key="notif.id" :class="{'bg-grey-lighten-3': !notif.read}">
                <v-list-item-content>
                  <v-list-item-title v-text="notif.message"></v-list-item-title>
                </v-list-item-content>
              </v-list-item>
              <v-list-item v-if="notifications.length === 0">
                <v-list-item-content>
                  <v-list-item-title>No notifications</v-list-item-title>
                </v-list-item-content>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </div>
      <div v-if="user">
        <v-btn class="mx-2" :to="{ name: 'profile' }"> Profile </v-btn>
        <v-btn class="mx-2" :to="{ name: '' }"> Schedule </v-btn>
        <v-btn class="mx-2" :to="{ name: '' }"> Availability </v-btn>
      </div>
      <v-menu bottom min-width="200px" rounded offset-y v-if="user">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon x-large>
            <v-avatar v-if="user" color="secondary">
              <span class="accent--text font-weight-bold">{{ initials }}</span>
            </v-avatar>
          </v-btn>
        </template>
        <v-card>
          <v-card-text>
            <div class="mx-auto text-center">
              <v-avatar color="secondary" class="mt-2 mb-2">
                <span class="accent--text font-weight-bold">{{
                  initials
                }}</span>
              </v-avatar>
              <h3>{{ name }}</h3>
              <p class="text-caption mt-1">
                {{ user.email }}
              </p>
              <v-divider class="my-3"></v-divider>
              <v-btn 
                depressed 
                rounded 
                text 
                @click="router.push({ name: 'profile' })" 
                class="mb-2"
              > 
                Profile 
              </v-btn>
              <v-btn depressed rounded text @click="logout"> Logout </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
    </v-app-bar>
  </div>
</template>
