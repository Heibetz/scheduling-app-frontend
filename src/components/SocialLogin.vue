<script setup>
import { ref, onMounted } from "vue";
import AuthServices from "../services/authServices";
import PositionServices from "../services/positionServices";
import PositionUserServices from "../services/positionUserServices";
import Utils from "../config/utils.js";
import { useRouter } from "vue-router";

const router = useRouter();
const fName = ref("");
const lName = ref("");
const user = ref({});

const loginWithGoogle = () => {
  window.handleCredentialResponse = handleCredentialResponse;
  const client = import.meta.env.VITE_APP_CLIENT_ID;
  console.log(client);
  window.google.accounts.id.initialize({
    client_id: client,
    cancel_on_tap_outside: false,
    auto_select: true,
    callback: window.handleCredentialResponse,
  });
  window.google.accounts.id.renderButton(document.getElementById("parent_id"), {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signup_with",
    width: 400,
  });
};

const handleCredentialResponse = async (response) => {
  let token = {
    credential: response.credential,
  };
  try {
    const loginRes = await AuthServices.loginUser(token);
    user.value = loginRes.data;
    Utils.setStore("user", user.value);
    fName.value = user.value.fName;
    lName.value = user.value.lName;

    const userId = user.value.userId || user.value.user_id;
    const [posRes, puRes] = await Promise.all([
      PositionServices.getAll(),
      PositionUserServices.getAll(),
    ]);
    const managerPositions = posRes.data.filter((p) => p.is_manager);
    const myManagerPositionIds = puRes.data
      .filter((pu) => Number(pu.user_id) === Number(userId))
      .map((pu) => Number(pu.position_id));
    const firstManagerPos = managerPositions.find((p) =>
      myManagerPositionIds.includes(Number(p.position_id))
    );

    if (user.value.is_super_admin) {
      router.push({ name: "users" });
    } else if (firstManagerPos) {
      router.push({ name: "manager-dashboard", query: { area: firstManagerPos.area_id } });
    } else {
      router.push({ name: "dashboard" });
    }
  } catch (error) {
    console.log("error", error);
  }
};

onMounted(() => {
  loginWithGoogle();
});
</script>

<template>
  <div class="signup-buttons">
    <v-row justify="center">
      <div display="flex" id="parent_id"></div>
    </v-row>
  </div>
</template>
