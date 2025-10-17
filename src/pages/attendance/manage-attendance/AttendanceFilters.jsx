import React from "react";
import { Card, Row, Col, Select, DatePicker, Segmented, Input } from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

// Dynamic biweekly range based on current date
const getBiweeklyRange = () => {
  const today = dayjs();
  const currentDay = today.date();
  
  if (currentDay <= 15) {
    // First 15 days of the month (1-15)
    return [today.startOf("month"), today.startOf("month").add(14, "day")];
  } else {
    // Last 15 days of the month (16-31/30)
    const lastDayOfMonth = today.endOf("month").date();
    const startDay = Math.max(16, lastDayOfMonth - 14);
    return [today.startOf("month").add(startDay - 1, "day"), today.endOf("month")];
  }
};

const quickRanges = {
  "Biweekly (15 days)": getBiweeklyRange(),
  Today: [dayjs().startOf("day"), dayjs().endOf("day")],
  "This Week": [dayjs().startOf("week"), dayjs().endOf("week")],
  "This Month": [dayjs().startOf("month"), dayjs().endOf("month")],
};

const AttendanceFilters = ({
  users,
  loadingUsers,
  selectedUsers,
  setSelectedUsers,
  dateRange,
  setDateRange,
  status,
  setStatus,
  source,
  setSource,
  searchNote,
  setSearchNote,
}) => {
  return (
    <Card size="small">
      <Row gutter={[12, 12]} align="middle">
        <Col xs={24} md={10} lg={8}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Employees</div>
          <Select
            mode="multiple"
            allowClear
            placeholder="All employees"
            loading={loadingUsers}
            value={selectedUsers}
            onChange={setSelectedUsers}
            showSearch
            optionFilterProp="label"
            style={{ width: "100%" }}
            maxTagCount="responsive"
            maxTagTextLength={20}
            filterOption={(input, option) => {
              const searchText = input.toLowerCase();
              const label = option.label.toLowerCase();
              return label.includes(searchText);
            }}
            options={users.map((u) => ({
              value: u._id,
              label: `${u.firstName} ${u.lastName} ${u.email ? `(${u.email})` : ""}`,
            }))}
          />
        </Col>

        <Col xs={24} sm={12} md={7} lg={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Date Range</div>
          <RangePicker
            allowClear={false}
            value={dateRange}
            onChange={(v) => setDateRange(v)}
            presets={[
              { label: 'Biweekly (15 days)', value: quickRanges['Biweekly (15 days)'] },
              { label: 'Today', value: quickRanges.Today },
              { label: 'This Week', value: quickRanges['This Week'] },
              { label: 'This Month', value: quickRanges['This Month'] },
            ]}
            style={{ width: "100%" }}
          />
        </Col>

        <Col xs={12} sm={6} md={3}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Status</div>
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All" },
              { value: "in", label: "Checked In" },
              { value: "break", label: "On Break" },
              { value: "out", label: "Checked Out" },
            ]}
          />
        </Col>

        <Col xs={12} sm={6} md={3}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Source</div>
          <Select
            value={source}
            onChange={setSource}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All" },
              { value: "kiosk", label: "Kiosk" },
              { value: "manual", label: "Manual" },
              { value: "admin", label: "Admin" },
            ]}
          />
        </Col>

        <Col xs={24} md={6} lg={7}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note contains</div>
          <Input
            placeholder="Search notes…"
            allowClear
            value={searchNote}
            onChange={(e) => setSearchNote(e.target.value)}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default AttendanceFilters;
