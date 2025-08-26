// src/pages/attendance/AttendancePage.jsx
import useAuth from "../../hooks/useAuth";
import MyAttendance from "./MyAttendance";
import ManageAttendance from "./ManageAttendance";

export default function AttendancePage() {
  const { user } = useAuth();
  const role = user?.role;

  if (role === "admin" || role === "attendance") {
    return <ManageAttendance canEdit={role === "admin"} canKiosk />;
  }
  return <MyAttendance />;
}
