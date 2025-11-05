import React from "react";
import { Card, Row, Col } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Overview Tab
 */
const OverviewTabSkeleton = () => {
  return (
    <div className="space-y-4">
      {/* Basic Information Card */}
      <Card size="small" title="Basic Information">
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col xs={24} sm={12} key={i}>
              <div className="mb-2">
                <Skeleton height={14} width={100} style={{ marginBottom: 4 }} />
                <Skeleton height={20} width="100%" />
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Financial Information Card */}
      <Card size="small" title="Financial Information">
        <Row gutter={[16, 16]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col xs={24} sm={12} key={i}>
              <div className="mb-2">
                <Skeleton height={14} width={100} style={{ marginBottom: 4 }} />
                <Skeleton height={20} width="100%" />
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Shipping Information Card */}
      <Card size="small" title="Shipping Information">
        <Row gutter={[16, 16]}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Col xs={24} sm={12} key={i}>
              <div className="mb-2">
                <Skeleton height={14} width={100} style={{ marginBottom: 4 }} />
                <Skeleton height={20} width="100%" />
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default OverviewTabSkeleton;

