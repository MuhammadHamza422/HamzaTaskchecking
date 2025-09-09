// src/pages/attendance/AttendancePage.jsx
import useAuth from "../../hooks/useAuth";
import MyAttendance from "./MyAttendance";
import ManageAttendance from "./ManageAttendance";
import AttendanceKiosk from "../AttendanceKiosk";

export default function AttendancePage() {
  const { user } = useAuth();
  const role = user?.roles.role;
  console.log('User role in AttendancePage:', role);

  if (role === "admin") {
    return <ManageAttendance canEdit={true} canKiosk />;
  }
  
  if (role === "Attendance") {
    return <AttendanceKiosk />;
  }
  
  return <MyAttendance />;
}
