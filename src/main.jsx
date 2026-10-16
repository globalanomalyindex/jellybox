import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
// The website consumes the complete library skin on the initial route, just as
// an installed consumer imports @jellybox/react/styles.css explicitly.
import "../packages/react/src/styles.css";
import "../packages/react/src/selection-motion.css";
import "../packages/react/src/controls.css";
import "../packages/react/src/data-components.css";
import "../packages/react/src/window-motion.css";
import "../packages/react/src/material-skin.css";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
