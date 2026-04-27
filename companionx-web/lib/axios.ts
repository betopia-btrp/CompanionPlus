import axios from "axios";

const defaultApiBaseUrl = "http://companionx-api.test/api";

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL;

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ??
    process.env.BACKEND_URL ??
    "http://localhost:8000",
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
