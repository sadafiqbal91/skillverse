import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// 🍞 Screen ke kone mein chhota message (page par kahin bhi ho, nazar aaye)
export const toast = (text, tone = "info") =>
  window.dispatchEvent(new CustomEvent("sv-toast", { detail: { text, tone } }));

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
      window.location.href = "/login";
    }
    // 🔒 Demo Lock ka message: scroll kiye baghair nazar aaye
    const msg = err.response?.data?.message || "";
    if (err.response?.status === 403 && msg.includes("This is a demo")) toast(msg, "lock");
    return Promise.reject(err);
  }
);

export const errMsg = (e) =>
  e.response?.data?.message || (e.response ? "Something went wrong" : "Cannot reach the server. Is the backend running?");

export default api;