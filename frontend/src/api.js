import axios from "axios";
import { auth } from "./firebase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
});

// Attaches the current Firebase ID token to every request. Public GETs work
// fine without one (the backend treats a missing token as "anonymous viewer"
// via get_optional_user) — this just makes sure logged-in actions never forget it.
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
