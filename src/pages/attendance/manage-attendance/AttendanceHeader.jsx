import React from "react";
import { Row, Col, Space, Button, Switch, Segmented, Tag } from "antd";
import { ReloadOutlined, FileExcelOutlined } from "@ant-design/icons";

const AttendanceHeader = ({
  autoRefresh,
  setAutoRefresh,
  refreshEvery,
  setRefreshEvery,
  hardRefresh,
  exportCSV,
}) => {
  return (
    <Row align="middle" justify="space-between" gutter={[16, 16]}>
      <Col>
        <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
          <h2 style={{ margin: 0 }}>Attendance</h2>
          <Tag color="blue">Live</Tag>
        </div>
        <div style={{ color: "rgba(0,0,0,.45)", marginTop: 4 }}>
          Clean, real-time view of check-ins, breaks, and hours.
        </div>
      </Col>
      <Col>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={hardRefresh}>Refresh</Button>
          <Switch checkedChildren="Auto" unCheckedChildren="Auto" checked={autoRefresh} onChange={setAutoRefresh} />
          <Segmented
            value={refreshEvery}
            onChange={setRefreshEvery}
            options={[
              { label: "15s", value: 15 },
              { label: "30s", value: 30 },
              { label: "60s", value: 60 },
            ]}
          />
          <Button icon={<FileExcelOutlined />} onClick={exportCSV}>Export CSV</Button>
        </Space>
      </Col>
    </Row>
  );
};

export default AttendanceHeader;
