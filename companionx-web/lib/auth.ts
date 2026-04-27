import api from "@/lib/axios";

export type AuthUser = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  system_role: string;
  onboarding_completed?: boolean;
  subscription_plan?: {
    id: number;
    name: string;
    price: number;
    features: Record<string, boolean | number | null>;
  } | null;
  active_subscription?: boolean;
  free_sessions_remaining?: number;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  dob: string;
  gender: string;
  guardian_contact?: string;
};

export async function ensureCsrfCookie() {
  await api.get("/sanctum/csrf-cookie");
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await api.get("/api/me");
    return response.data as AuthUser;
  } catch {
    return null;
  }
}

export async function login(payload: LoginPayload) {
  await ensureCsrfCookie();
  const response = await api.post("/api/login", payload);
  return response.data as { user: AuthUser };
}

export async function register(payload: RegisterPayload) {
  await ensureCsrfCookie();
  const response = await api.post("/api/register", payload);
  return response.data as { user: AuthUser };
}

export async function logout() {
  await ensureCsrfCookie();
  await api.post("/api/logout");
}
