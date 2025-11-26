import { useQuery } from "@tanstack/react-query";
import apiClient from "../../../../../api/client";

const fetchUsers = async () => {
  try {
    const response = await apiClient.get("/api/v1/auth/all", {
      params: { page: 1, limit: 1000 },
    });
    
    const users = response?.data?.users || [];
    return users.map((user) => ({
      _id: user._id,
      name: user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.name || user.email?.split("@")[0] || "Unknown",
      email: user.email || "",
      avatar: user.avatar || null,
    }));
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return [];
  }
};

export function useUsers() {
  return useQuery({
    queryKey: ["activity-logs-users"],
    queryFn: fetchUsers,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });
}

