// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.js";
import LoginPage from "./LoginPage.js";

const AUTH_KEY = "pl_dir_auth";
const AUTH_TTL_MS = 12 * 60 * 60 * 1000;

function authed() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const { t } = JSON.parse(raw);
    return Date.now() - Number(t) < AUTH_TTL_MS;
  } catch {
    return false;
  }
}

const container = document.getElementById("root");
const root = createRoot(container);
root.render(authed() ? <App /> : <LoginPage />);
