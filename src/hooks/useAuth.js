// Simple shim so both imports work:
//  - import { useAuth } from "../contexts/AuthContext";
//  - import useAuth from "../hooks/useAuth";
import { useAuth as useAuthFromContext } from "../contexts/AuthContext.jsx";

export default function useAuth() {
  return useAuthFromContext();
}
