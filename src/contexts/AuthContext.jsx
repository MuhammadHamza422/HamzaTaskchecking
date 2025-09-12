import React, { createContext, useState, useContext, useEffect } from "react";
import apiClient, { setLogoutCallback } from "../api/client";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;
    return parsedUser;
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem("token");
    return savedToken;
  });

  useEffect(() => {
    if (!token) {
      // Clear user data if no token
      setUser(null);
      localStorage.removeItem("user");
    }
  }, [token]);

  // Update user Info
  const fetchUserInfo = async () => {
    if (!user?.id) return;
    try {
      const { data } = await apiClient.get(`/api/v1/auth/userInfo/${user?.id}`);
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
    } catch (error) {
      console.error("Error updating user info:", error);
    }
  };

  useEffect(() => {
    fetchUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const login = async (newToken, userData) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(userData));
    setToken(newToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    delete apiClient.defaults.headers.common["Authorization"];
  };

  // Register logout callback with API client
  useEffect(() => {
    setLogoutCallback(logout);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
