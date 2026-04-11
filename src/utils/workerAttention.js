import { ref } from "vue";
import Utils from "../config/utils.js";
import ShiftServices from "../services/shiftServices.js";

/** Total items for Open Shifts nav badge (open shifts + pending trade requests). */
export const workerAttentionTotal = ref(0);

/**
 * Fetches combined attention counts for the signed-in worker and updates {@link workerAttentionTotal}.
 */
export async function refreshWorkerAttention() {
  const u = Utils.getStore("user");
  const userId = u?.userId ?? u?.user_id ?? u?.id;
  if (userId == null || u?.is_super_admin) {
    workerAttentionTotal.value = 0;
    return;
  }
  try {
    const res = await ShiftServices.getAttentionSummary(userId);
    const d = res?.data ?? res ?? {};
    const total = d.total ?? (Number(d.openShiftsCount) || 0) + (Number(d.pendingTradeRequestsCount) || 0);
    workerAttentionTotal.value = Number(total) || 0;
  } catch {
    workerAttentionTotal.value = 0;
  }
}
