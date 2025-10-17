import React from "react";
import { Row, Col, Card, Statistic } from "antd";
import {
  LoginOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";

const AttendanceDashboard = ({ metrics, isTodayView, usersInScope, filteredRows }) => {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic title="Checked In" value={metrics.checkedIn} prefix={<LoginOutlined />} />
          {isTodayView && metrics.notIn !== undefined && (
            <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>
              Not In: <strong>{metrics.notIn}</strong> / {usersInScope.length}
            </div>
          )}
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic title="On Break" value={metrics.onBreak} prefix={<PauseCircleOutlined />} />
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic title="Hours Worked" value={metrics.totalHours} suffix="h" prefix={<ClockCircleOutlined />} />
          <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>Avg {metrics.avgHours} h / record</div>
        </Card>
      </Col>
      <Col xs={12} sm={12} md={6}>
        <Card>
          <Statistic title="Break Time" value={metrics.breakHours} suffix="h" />
          <div style={{ color: "rgba(0,0,0,.45)", marginTop: 8 }}>
            {filteredRows.reduce((a, r) => a + (r.breaks?.length || 0), 0)} total breaks
          </div>
        </Card>
      </Col>
    </Row>
  );
};

export default AttendanceDashboard;
