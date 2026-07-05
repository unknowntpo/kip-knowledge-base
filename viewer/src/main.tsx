import React from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import BrowseView from "./components/BrowseView";
import AskView from "./components/AskView";
import DetailView from "./components/DetailView";
import "./styles/tokens.css";
import "./styles/global.css";

const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <BrowseView /> },
      { path: "ask", element: <AskView /> },
      { path: "kip/:id", element: <DetailView /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
