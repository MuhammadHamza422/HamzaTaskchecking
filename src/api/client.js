import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

// Store logout callback to be set by AuthContext
let logoutCallback = null;

// Function to set logout callback from AuthContext
export const setLogoutCallback = (callback) => {
  logoutCallback = callback;
};

// ✅ Automatically attach token from localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ✅ Handle token expiration - automatically logout on 401
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.log("API Error:", error.response?.status, error.response?.data);

    if (error.response?.status === 401) {
      console.log("Token expired - triggering logout");

      // Clear auth data
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      delete apiClient.defaults.headers.common["Authorization"];

      // Call logout callback if available (from AuthContext)
      if (logoutCallback && typeof logoutCallback === "function") {
        logoutCallback();
      }

      // Redirect to login page
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default apiClient;
