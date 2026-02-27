<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://vuejs.org/api/sfc-script-setup.html#script-setup
import MenuBar from "./components/MenuBar.vue";
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();
const isLoginPage = computed(() => route.name === "login");
</script>

<template>
  <v-app>
    <MenuBar v-if="!isLoginPage" :key="$route.fullPath" />
    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
