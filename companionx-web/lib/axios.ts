import axios from "axios";

const configuredApiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL;

function getDefaultApiBaseUrl() {
  if (typeof window === "undefined") {
    return "http://localhost:8000";
  }

  return `${window.location.protocol}//${window.location.hostname}:8000`;
}

const api = axios.create({
  baseURL: configuredApiBaseUrl ?? getDefaultApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-Requested-With": "XMLHttpRequest",
  },
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: "XSRF-TOKEN",
  xsrfHeaderName: "X-XSRF-TOKEN",
});

export default api;
