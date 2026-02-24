<script setup>
import SocialLogin from "../components/SocialLogin.vue";
import ocLogo from "/oc-logo-white.png";
</script>

<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="bg-shape shape-1"></div>
      <div class="bg-shape shape-2"></div>
      <div class="bg-shape shape-3"></div>
    </div>

    <v-container class="login-container" fluid>
      <v-row justify="center" align="center" class="fill-height">
        <v-col cols="12" sm="8" md="5" lg="4">
          <v-card class="login-card" elevation="12" rounded="xl">
            <!-- Header with logo -->
            <div class="login-header">
              <v-img
                :src="ocLogo"
                height="72"
                width="72"
                contain
                class="mx-auto mb-3"
              ></v-img>
              <h1 class="header-title">Scheduling App</h1>
              <p class="header-subtitle">Oklahoma Christian University</p>
            </div>

            <!-- Body -->
            <v-card-text class="login-body">
              <div class="feature-icons">
                <div class="feature-item">
                  <v-icon color="primary" size="28">mdi-calendar-clock</v-icon>
                  <span>Manage Shifts</span>
                </div>
                <div class="feature-item">
                  <v-icon color="teal" size="28">mdi-account-group</v-icon>
                  <span>Team Scheduling</span>
                </div>
                <div class="feature-item">
                  <v-icon color="blue" size="28">mdi-clock-check-outline</v-icon>
                  <span>Availability</span>
                </div>
              </div>

              <v-divider class="my-5"></v-divider>

              <SocialLogin />
            </v-card-text>
          </v-card>

          <p class="footer-text">&copy; 2026 OC Worker Scheduling</p>
        </v-col>
      </v-row>
    </v-container>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #47121D 0%, #80162B 50%, #032F45 100%);
}

.login-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.bg-shape {
  position: absolute;
  border-radius: 50%;
  opacity: 0.08;
  background: #fff;
}

.shape-1 {
  width: 500px;
  height: 500px;
  top: -120px;
  right: -100px;
}

.shape-2 {
  width: 300px;
  height: 300px;
  bottom: -60px;
  left: -80px;
}

.shape-3 {
  width: 200px;
  height: 200px;
  bottom: 30%;
  right: 15%;
}

.login-container {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.fill-height {
  min-height: 100vh;
}

.login-card {
  overflow: hidden;
  border: none;
}

.login-header {
  background: linear-gradient(135deg, #80162B, #47121D);
  padding: 36px 24px 28px;
  text-align: center;
}

.header-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.5px;
}

.header-subtitle {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
}

.login-body {
  padding: 28px 32px 32px;
}

.feature-icons {
  display: flex;
  justify-content: space-around;
  gap: 8px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 0.8rem;
  color: #555;
  font-weight: 500;
}

.sign-in-text {
  text-align: center;
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 16px;
}

.footer-text {
  text-align: center;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.8rem;
  margin-top: 20px;
}
</style>
