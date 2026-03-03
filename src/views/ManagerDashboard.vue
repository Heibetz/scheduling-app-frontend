<script setup>
import { ref, onMounted } from "vue";
import Utils from "../config/utils";
import { useRouter } from "vue-router";

const router = useRouter();
const user = ref(null);

onMounted(() => {
  user.value = Utils.getStore("user");
  if (!user.value) {
    router.push({ name: "login" });
  }
});
</script>

<template>
  <v-container class="manager-dashboard-page" fluid>
    <v-row class="mb-4">
      <v-col>
        <h1 class="text-h4 font-weight-bold" style="color: #80162B">
          <v-icon size="36" color="primary" class="mr-2">mdi-shield-crown</v-icon>
          Manager Dashboard
        </h1>
        <p class="text-subtitle-1 text-grey mt-1">Coming soon</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
.manager-dashboard-page {
  max-width: 1100px;
  margin: 0 auto;
  padding-top: 24px;
}
</style>
