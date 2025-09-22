// src/hooks/useCurrentUser.js
import { useSelector } from "react-redux";

export default function useCurrentUser() {
  return useSelector((state) => state.auth?.user);
}
