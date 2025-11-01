import React from "react";
import { Card, Row, Col, Select, DatePicker, Segmented, Input, Tag, Tooltip } from "antd";
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
    return [
      today.startOf("month").add(startDay - 1, "day"),
      today.endOf("month"),
    ];
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
  companies,
  loadingCompanies,
  company,
  setCompany,
}) => {
  // map selected ids -> full user objects for display under the select
  const selectedUserObjects = (users || []).filter((u) =>
    (selectedUsers || []).includes(u._id)
  );

  return (
    <Card size="small">
      <Row gutter={[12, 12]} align="middle" className="mb-4">
        <Col xs={24} md={10} lg={8}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>
            Employees
          </div>

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
            // hide tags inside the Select input
            tagRender={() => null}
            filterOption={(input, option) => {
              const searchText = input.toLowerCase();
              const label = option.label.toLowerCase();
              return label.includes(searchText);
            }}
            options={(users || []).map((u) => ({
              value: u._id,
              label: `${u.firstName} ${u.lastName} ${u.email ? `(${u.email})` : ""}`,
            }))}
          />

          {/* Selected items shown below the Select as full, closable tags */}
          <div style={{ marginTop: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {selectedUserObjects.map((u) => {
                const fullLabel = u.email
                  ? `${u.firstName} ${u.lastName} (${u.email})`
                  : `${u.firstName} ${u.lastName}`;
                return (
                  <Tag
                    key={u._id}
                    closable
                    onClose={(e) => {
                      // prevent default focus change behavior
                      e.preventDefault();
                      setSelectedUsers((prev = []) =>
                        prev.filter((id) => id !== u._id)
                      );
                    }}
                    style={{ whiteSpace: "nowrap", maxWidth: "100%" }}
                  >
                    <Tooltip title={fullLabel}>
                      <span style={{ userSelect: "none" }}>
                        {u.firstName} {u.lastName}
                        {u.email ? ` (${u.email})` : ""}
                      </span>
                    </Tooltip>
                  </Tag>
                );
              })}
            </div>
          </div>
        </Col>

        <Col xs={12} sm={6} md={6}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>
            Company
          </div>
          <Select
            allowClear
            placeholder="All companies"
            loading={loadingCompanies}
            value={company || undefined}
            onChange={(v) => setCompany(v || "")}
            showSearch
            optionFilterProp="label"
            style={{ width: "100%" }}
            options={(companies || []).map((c) => ({
              value: c._id,
              label: c.name,
            }))}
          />
        </Col>

        <Col xs={24} sm={12} md={7} lg={10}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>
            Date Range
          </div>
          <RangePicker
            allowClear
            value={dateRange}
            onChange={(v) => setDateRange(v)}
            presets={[
              {
                label: "Biweekly (15 days)",
                value: quickRanges["Biweekly (15 days)"],
              },
              { label: "Today", value: quickRanges.Today },
              { label: "This Week", value: quickRanges["This Week"] },
              { label: "This Month", value: quickRanges["This Month"] },
            ]}
            style={{ width: "100%" }}
          />
        </Col>

        {/* <Col xs={24} md={6} lg={7}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Note contains</div>
          <Input
            placeholder="Search notes…"
            allowClear
            value={searchNote}
            onChange={(e) => setSearchNote(e.target.value)}
          />
        </Col> */}
      </Row>
      <Row gutter={[12, 12]} align="middle" className="mb-4">
        <Col xs={12} sm={6} md={4}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Status</div>
          <Select
            value={status}
            onChange={setStatus}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All" },
              { value: "checked in", label: "Checked In" },
              { value: "checked out", label: "Checked Out" },
              { value: "on break", label: "On Break" },
            ]}
          />
        </Col>

        <Col xs={12} sm={6} md={4}>
          <div style={{ marginBottom: 6, color: "rgba(0,0,0,.6)" }}>Source</div>
          <Select
            value={source}
            onChange={setSource}
            style={{ width: "100%" }}
            options={[
              { value: "all", label: "All" },
              { value: "manual", label: "Manual" },
              { value: "kiosk", label: "Kiosk" },
            ]}
          />
        </Col>
      </Row>
    </Card>
  );
};

export default AttendanceFilters;
