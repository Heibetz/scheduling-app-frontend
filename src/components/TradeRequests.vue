<template>
  <div>
    <div v-if="loading" class="d-flex align-center pa-4">
      <v-progress-circular indeterminate size="24" class="mr-3" color="primary" />
      <span>Loading trade requests...</span>
    </div>

    <div v-else-if="requests.length" class="trade-grid">
      <v-card
        v-for="req in requests"
        :key="'tr-' + req.trade_request_id"
        class="trade-card"
        variant="outlined"
        rounded="lg"
      >
        <v-card-text>
          <div class="trade-card__header">
            <div class="trade-card__title">
              From {{ formatPersonName(req.from_user) }}
            </div>
            <div v-if="req.message" class="trade-card__message text-body-2 text-medium-emphasis">
              {{ req.message }}
            </div>
          </div>
          <div v-if="req.shift" class="trade-card__shift mt-3">
            <div class="text-subtitle-2">Offered shift</div>
            <div class="text-body-2">
              {{ formatDay(req.shift.shift_date) }}, {{ formatDate(req.shift.shift_date) }}
              · {{ formatTimeRange(req.shift.start_time, req.shift.end_time) }}
            </div>
            <div class="text-body-2 text-medium-emphasis">
              {{ req.shift.area_name || "—" }} · {{ req.shift.position_name || "—" }}
            </div>
          </div>
          <div class="trade-card__actions mt-4 d-flex flex-wrap">
            <v-btn
              color="primary"
              variant="flat"
              size="small"
              class="text-none"
              :loading="actingId === req.trade_request_id && actionKind === 'accept'"
              :disabled="actingId != null"
              @click="onAccept(req)"
            >
              Accept
            </v-btn>
            <v-btn
              variant="outlined"
              color="grey-darken-1"
              size="small"
              class="text-none"
              :loading="actingId === req.trade_request_id && actionKind === 'decline'"
              :disabled="actingId != null"
              @click="onDecline(req)"
            >
              Decline
            </v-btn>
          </div>
        </v-card-text>
      </v-card>
    </div>

    <div v-else class="empty-trade">
      <v-icon size="48" color="grey-lighten-1">mdi-swap-horizontal</v-icon>
      <p class="mt-4 text-grey-darken-1">No pending trade requests right now</p>
      <p class="text-body-2 text-medium-emphasis mt-1">
        When a coworker sends you a private trade request, it will appear here.
      </p>
    </div>

    <v-snackbar v-model="toastOpen" :color="toastColor" timeout="2600">
      {{ toastMessage }}
    </v-snackbar>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Utils from "../config/utils.js";
import TradeRequestServices from "../services/tradeRequestServices.js";
import { refreshWorkerAttention } from "../utils/workerAttention.js";

const emit = defineEmits(["updated"]);

const loading = ref(false);
const requests = ref([]);
const actingId = ref(null);
const actionKind = ref(null);
const toastOpen = ref(false);
const toastMessage = ref("");
const toastColor = ref("success");

function formatPersonName(u) {
  if (!u) return "Unknown";
  const fn = u.fName || "";
  const ln = u.lName || "";
  const name = `${fn} ${ln}`.trim();
  return name || u.email || "Unknown";
}

function formatDay(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", { weekday: "short" });
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return "--";
  const format = (time) => {
    const timeParts = time.split(":");
    const hour = parseInt(timeParts[0], 10);
    const minute = timeParts[1] || "00";
    const period = hour >= 12 ? "PM" : "AM";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minute} ${period}`;
  };
  return `${format(startTime)} - ${format(endTime)}`;
}

async function load() {
  const currentUser = Utils.getStore("user");
  const userId = currentUser?.userId ?? currentUser?.user_id ?? currentUser?.id;
  if (!userId) {
    requests.value = [];
    return;
  }
  loading.value = true;
  try {
    const res = await TradeRequestServices.getIncomingForUser(userId);
    const body = res?.data ?? res ?? {};
    requests.value = Array.isArray(body.tradeRequests) ? body.tradeRequests : [];
  } catch (e) {
    console.error("Error loading trade requests:", e);
    requests.value = [];
  } finally {
    loading.value = false;
  }
}

async function onAccept(req) {
  actingId.value = req.trade_request_id;
  actionKind.value = "accept";
  try {
    await TradeRequestServices.accept(req.trade_request_id);
    toastColor.value = "success";
    toastMessage.value = "Trade request accepted.";
    toastOpen.value = true;
    await load();
    await refreshWorkerAttention();
    emit("updated");
  } catch (e) {
    toastColor.value = "error";
    toastMessage.value = e.response?.data?.message || e.message || "Could not accept request";
    toastOpen.value = true;
  } finally {
    actingId.value = null;
    actionKind.value = null;
  }
}

async function onDecline(req) {
  actingId.value = req.trade_request_id;
  actionKind.value = "decline";
  try {
    await TradeRequestServices.decline(req.trade_request_id);
    toastColor.value = "success";
    toastMessage.value = "Trade request declined.";
    toastOpen.value = true;
    await load();
    await refreshWorkerAttention();
    emit("updated");
  } catch (e) {
    toastColor.value = "error";
    toastMessage.value = e.response?.data?.message || e.message || "Could not decline request";
    toastOpen.value = true;
  } finally {
    actingId.value = null;
    actionKind.value = null;
  }
}

onMounted(() => {
  load();
});

defineExpose({ load });
</script>

<style scoped>
.trade-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trade-card__title {
  font-weight: 600;
  color: #1a202c;
}

.trade-card__message {
  margin-top: 4px;
}

.trade-card__actions {
  gap: 8px;
}

.empty-trade {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  text-align: center;
  color: #64748b;
}
</style>
