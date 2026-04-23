import axios from "axios";

const defaultApiBaseUrl = "http://companionx-api.test/api";

const configuredApiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL ?? process.env.BACKEND_URL;

const api = axios.create({
  baseURL: configuredApiBaseUrl ?? defaultApiBaseUrl,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

if (!configuredApiBaseUrl && typeof window !== "undefined") {
  console.warn(
    `NEXT_PUBLIC_API_URL is not set. Falling back to ${defaultApiBaseUrl}.`,
  );
}

api.interceptors.request.use((config) => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
