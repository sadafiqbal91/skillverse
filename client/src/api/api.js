import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("sv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config.url.includes("/auth/login")) {
      localStorage.removeItem("sv_token");
      localStorage.removeItem("sv_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const errMsg = (e) =>
  e.response?.data?.message || (e.response ? "Something went wrong" : "Cannot reach the server. Is the backend running?");

export default api;