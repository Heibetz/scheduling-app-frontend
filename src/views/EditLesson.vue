<template>
  <div>
    <v-container>
      <v-toolbar>
        <v-toolbar-title>Lesson Edit</v-toolbar-title>
        <!-- <v-spacer></v-spacer>
        <v-toolbar-title>{{this.message}}</v-toolbar-title> -->
      </v-toolbar>
      <br />
      <h4>{{ message }}</h4>
      <br />
      <h4>Tutorial: {{ tutorialId }} Lesson: {{ lessonId }}</h4>
      <br />
      <v-form ref="form" v-model="valid" lazy validation>
        <v-text-field
          id="title"
          v-model="lesson.title"
          :counter="50"
          label="Title"
          required
        ></v-text-field>
        <v-text-field
          id="description"
          v-model="lesson.description"
          :counter="50"
          label="Description"
          required
        ></v-text-field>

        <v-btn
          :disabled="!valid"
          color="success"
          class="mr-4"
          @click="saveLesson()"
        >
          Save
        </v-btn>

        <v-btn color="error" class="mr-4" @click="cancel()"> Cancel </v-btn>
      </v-form>
    </v-container>
  </div>
</template>

<script>
import LessonServices from "../services/lessonServices";

export default {
  name: "EditLesson",
  props: {
    tutorialId: {
      type: [Number, String],
      default: 0,
    },
    lessonId: {
      type: [Number, String],
      default: 0,
    },
  },
  data() {
    return {
      valid: false,
      lesson: {},
      message: "Enter data and click save",
    };
  },
  mounted() {
    this.retrieveLesson();
  },
  methods: {
    retrieveLesson() {
      LessonServices.getLesson(this.tutorialId, this.lessonId)
        .then((response) => {
          this.lesson = response.data;
        })
        .catch((e) => {
          this.message = e.response.data.message;
        });
    },
    saveLesson() {
      var data = {
        title: this.lesson.title,
        description: this.lesson.description,
        tutorialId: this.lesson.tutorialId,
      };
      LessonServices.updateLesson(this.lesson.tutorialId, this.lesson.id, data)
        .then((response) => {
          this.lesson.id = response.data.id;

          this.$router.push({
            name: "view",
            params: { id: this.lesson.tutorialId },
          });
        })
        .catch((e) => {
          this.message = e.response.data.message;
        });
    },
    cancel() {
      this.$router.push({
        name: "view",
        params: { id: this.lesson.tutorialId },
      });
    },
  },
};
</script>
<style></style>
