import React from "react";
import { Card, Row, Col, Select, DatePicker, Input, Button, message } from "antd";
import { manualCreateAttendance } from "../../../api/attendance";
import dayjs from "dayjs";

const ManualRecordForm = ({ canEdit, users, manual, setManual, fetchData }) => {
  const handleManualCreate = async () => {
    if (!manual.userId || !manual.checkInAt) {
      return message.error("Employee and check-in time required");
    }
    try {
      await manualCreateAttendance({
        userId: manual.userId,
        checkInAt: manual.checkInAt,
        checkOutAt: manual.checkOutAt || null,
        note: manual.note || "",
      });
      message.success("Record added");
      setManual({ userId: "", checkInAt: "", checkOutAt: "", note: "" });
      fetchData();
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to add record");
    }
  };

  if (!canEdit) return null;

  return (
    <Card title="Manual Record (Admin)" size="small">
      <Row gutter={[12, 12]}>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Employee</div>
          <Select
            showSearch
            placeholder="Select"
            value={manual.userId || undefined}
            onChange={(v) => setManual({ ...manual, userId: v })}
            style={{ width: "100%" }}
            options={users.map((u) => ({ value: u._id, label: `${u.firstName} ${u.lastName}` }))}
          />
        </Col>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Check-In At</div>
          <DatePicker
            showTime
            value={manual.checkInAt ? dayjs(manual.checkInAt) : null}
            onChange={(v) => setManual({ ...manual, checkInAt: v ? v.toISOString() : "" })}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Check-Out At (optional)</div>
          <DatePicker
            showTime
            value={manual.checkOutAt ? dayjs(manual.checkOutAt) : null}
            onChange={(v) => setManual({ ...manual, checkOutAt: v ? v.toISOString() : "" })}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} md={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note</div>
          <Input value={manual.note} onChange={(e) => setManual({ ...manual, note: e.target.value })} />
        </Col>
      </Row>
      <div style={{ marginTop: 12 }}>
        <Button type="primary" onClick={handleManualCreate}>Add Record</Button>
      </div>
    </Card>
  );
};

export default ManualRecordForm;
