import { createContext, useContext, useState } from "react";
import api from "../api/api";

const AuthContext = createContext(null);

const readSaved = () => {
  try {
    return JSON.parse(localStorage.getItem("sv_user"));
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readSaved); // { user, organization }

  const saveSession = (data) => {
    localStorage.setItem("sv_token", data.token);
    const value = { user: data.user, organization: data.organization };
    localStorage.setItem("sv_user", JSON.stringify(value));
    setAuth(value);
    return value;
  };

  const login = async (slug, email, password) => {
    const { data } = await api.post("/auth/login", { slug, email, password });
    return saveSession(data);
  };

  const register = async (slug, name, email, password) => {
    const { data } = await api.post("/auth/register", { slug, name, email, password });
    return saveSession(data);
  };

  // 🏫 Naya institute register hote hi admin login
  const startSession = (data) => saveSession(data);

  // 🧒 Parent → bachche ki screen (parent ka session sambhal ke rakho)
  const enterChildMode = (data) => {
    localStorage.setItem("sv_parent_token", localStorage.getItem("sv_token"));
    localStorage.setItem("sv_parent_user", localStorage.getItem("sv_user"));
    return saveSession({ ...data, user: { ...data.user, childMode: true } });
  };

  // 👨‍👩‍👦 Wapas parent
  const exitChildMode = () => {
    const t = localStorage.getItem("sv_parent_token");
    const u = localStorage.getItem("sv_parent_user");
    localStorage.removeItem("sv_parent_token");
    localStorage.removeItem("sv_parent_user");
    if (!t || !u) {
      logout();
      return null;
    }
    localStorage.setItem("sv_token", t);
    localStorage.setItem("sv_user", u);
    const value = JSON.parse(u);
    setAuth(value);
    return value;
  };

  const logout = () => {
    ["sv_token", "sv_user", "sv_parent_token", "sv_parent_user"].forEach((k) => localStorage.removeItem(k));
    setAuth(null);
  };

  return (
    <AuthContext.Provider
      value={{ user: auth?.user, organization: auth?.organization, login, register, logout, enterChildMode, exitChildMode, startSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

// Har role ka apna ghar 🏠
export const homeFor = (role) =>
  ({ student: "/student", instructor: "/teacher", orgadmin: "/admin", parent: "/parent" }[role] || "/login");