import { createRouter, createWebHistory } from "vue-router";
import Utils from "./config/utils";

import Login from "./views/Login.vue";
import Dashboard from "./views/Dashboard.vue";

import TutorialsList from "./views/TutorialsList.vue";
import EditTutorial from "./views/EditTutorial.vue";
import AddTutorial from "./views/AddTutorial.vue";
import ViewTutorial from "./views/ViewTutorial.vue";
import AddLesson from "./views/AddLesson.vue";
import EditLesson from "./views/EditLesson.vue";
import Profile from "./views/Profile.vue";
import Areas from "./views/Areas.vue";
import Users from "./views/Users.vue";
import Schedule from "./views/ScheduleView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      alias: "/login",
      name: "login",
      component: Login,
    },
    {
      path: "/dashboard",
      name: "dashboard",
      component: Dashboard,
    },
    {
      path: "/tutorials",
      name: "tutorials",
      component: TutorialsList,
    },
    {
      path: "/edit/:id",
      name: "edit",
      component: EditTutorial,
      props: true,
    },
    {
      path: "/add",
      name: "add",
      component: AddTutorial,
    },
    {
      path: "/view/:id",
      name: "view",
      component: ViewTutorial,
      props: true,
    },
    {
      path: "/addLesson/:tutorialId",
      name: "addLesson",
      component: AddLesson,
      props: true,
    },
    {
      path: "/editLesson/:tutorialId/:lessonId",
      name: "editLesson",
      component: EditLesson,
      props: true,
    },
    {
      path: "/profile",
      name: "profile",
      component: Profile,
    },
    {
      path: "/areas",
      name: "areas",
      component: Areas,
    },
    {
      path: "/users",
      name: "users",
      component: Users,
    },
    {
      path: "/schedule", 
      name: "schedule", 
      component: Schedule,
    }
  ],
});

// Route guard: redirect to login if not authenticated
router.beforeEach((to, from, next) => {
  const user = Utils.getStore("user");
  if (to.name !== "login" && !user) {
    next({ name: "login" });
  } else if (to.name === "login" && user) {
    next({ name: "dashboard" });
  } else {
    next();
  }
});

export default router;
