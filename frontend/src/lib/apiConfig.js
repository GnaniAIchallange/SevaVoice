export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export function getAuthToken() {
  try {
    const data = JSON.parse(sessionStorage.getItem("seva-auth") || "{}");
    return data.token || "";
  } catch {
    return "";
  }
}

export function getAuthHeaders() {
  const token = getAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
