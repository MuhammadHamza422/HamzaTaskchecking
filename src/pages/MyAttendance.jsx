// import { useState } from "react";
// import { Button, Table, DatePicker, message } from "antd";
// import { checkIn, checkOut, getMyAttendance } from "../api/attendance";
// import { useQuery, useQueryClient } from "@tanstack/react-query";
// import dayjs from "dayjs";

// export default function MyAttendance() {
//   const qc = useQueryClient();
//   const [range, setRange] = useState([]);

//   const { data, isLoading } = useQuery({
//     queryKey: ["my-attendance", range?.map(d => d?.format("YYYY-MM-DD")).join("_")],
//     queryFn: () =>
//       getMyAttendance({
//         page: 1,
//         limit: 50,
//         from: range?.[0]?.format("YYYY-MM-DD"),
//         to: range?.[1]?.format("YYYY-MM-DD"),
//       }),
//   });

//   const onCheckIn = async () => {
//     try { await checkIn(); message.success("Checked in"); qc.invalidateQueries({ queryKey:["my-attendance"] }); }
//     catch (e) { message.error(e?.response?.data?.message || "Check-in failed"); }
//   };
//   const onCheckOut = async () => {
//     try { await checkOut(); message.success("Checked out"); qc.invalidateQueries({ queryKey:["my-attendance"] }); }
//     catch (e) { message.error(e?.response?.data?.message || "Check-out failed"); }
//   };

//   const columns = [
//     { title: "Day", dataIndex: "day", key: "day" },
//     { title: "Check In", dataIndex: "checkInAt", render: v => dayjs(v).format("YYYY-MM-DD HH:mm") },
//     { title: "Check Out", dataIndex: "checkOutAt", render: v => v ? dayjs(v).format("YYYY-MM-DD HH:mm") : "-" },
//     { title: "Minutes", dataIndex: "minutesWorked" },
//     { title: "Note", dataIndex: "note" },
//   ];

//   return (
//     <div className="page-container">
//       <div className="header-actions">
//         <div className="flex items-center gap-3">
//           <Button type="primary" onClick={onCheckIn}>Check In</Button>
//           <Button danger onClick={onCheckOut}>Check Out</Button>
//         </div>
//         <DatePicker.RangePicker onChange={setRange} allowClear />
//       </div>
//       <Table
//         rowKey="_id"
//         loading={isLoading}
//         dataSource={data?.items || []}
//         columns={columns}
//         pagination={false}
//       />
//     </div>
//   );
// }
