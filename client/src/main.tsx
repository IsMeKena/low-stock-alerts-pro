import React from "react";
import ReactDOM from "react-dom/client";
import { AppProvider } from "@shopify/polaris";
import { BrowserRouter } from "react-router-dom";
import "@shopify/polaris/build/esm/styles.css";
import App from "./App";
import "./index.css";
// @ts-ignore - Polaris locales don't have type definitions
import en from "@shopify/polaris/locales/en.json";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ui-nav-menu": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      >;
    }
  }
  interface Window {
    shopify?: {
      idToken(): Promise<string>;
      toast: {
        show(message: string, options?: { isError?: boolean; duration?: number }): void;
      };
    };
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProvider i18n={en}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppProvider>
  </React.StrictMode>
);
