import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import App from "./App.vue";
import FeedView from "./views/FeedView.vue";
import FeedDetailView from "./views/FeedDetailView.vue";
import "../styles.css";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "feed", component: FeedView },
    { path: "/feed/:id", name: "detail", component: FeedDetailView, props: true },
    {
      path: "/search/:detailRef",
      name: "search-detail",
      component: FeedDetailView,
      props: true,
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
});

createApp(App).use(router).mount("#app");
