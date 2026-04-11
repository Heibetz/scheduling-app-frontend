<template>
  <v-container fluid class="pa-6">
    <h1 class="text-h5 font-weight-bold mb-6">Open shifts</h1>

    <v-card class="mb-8 section-card" elevation="0" rounded="lg">
      <v-card-title class="section-card__title">Open Shifts</v-card-title>
      <v-card-subtitle class="pb-2">
        Public shifts you can claim for positions you are assigned to. Use the filters to narrow by position.
      </v-card-subtitle>
      <v-card-text>
        <OpenShifts embedded hide-heading @shift-claimed="onShiftClaimed" />
      </v-card-text>
    </v-card>

    <v-card class="section-card" elevation="0" rounded="lg">
      <v-card-title class="section-card__title">Trade Requests</v-card-title>
      <v-card-subtitle class="pb-2">
        Private requests from coworkers who want to trade a shift with you.
      </v-card-subtitle>
      <v-card-text>
        <TradeRequests ref="tradeRequestsRef" @updated="onTradeUpdated" />
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref, onMounted } from "vue";
import OpenShifts from "../components/OpenShifts.vue";
import TradeRequests from "../components/TradeRequests.vue";
import { refreshWorkerAttention } from "../utils/workerAttention.js";

const tradeRequestsRef = ref(null);

function onShiftClaimed() {
  refreshWorkerAttention();
}

function onTradeUpdated() {
  refreshWorkerAttention();
}

onMounted(() => {
  refreshWorkerAttention();
});
</script>

<style scoped>
.section-card {
  border: 1px solid #e2e8f0;
  background: #fff;
}

.section-card__title {
  font-size: 1.125rem;
  font-weight: 600;
  padding-bottom: 0;
}
</style>
