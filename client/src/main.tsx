import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "@shopify/polaris";
import "@shopify/polaris/build/esm/styles.css";
import App from "./App";
import "./index.css";
// @ts-ignore - Polaris locales don't have type definitions
import en from "@shopify/polaris/locales/en.json";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider i18n={en}>
      <App />
    </AppProvider>
  </React.StrictMode>
);
