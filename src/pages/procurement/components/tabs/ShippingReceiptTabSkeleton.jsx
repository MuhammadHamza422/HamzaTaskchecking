import React from "react";
import { Card, Row, Col } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Shipping & Receipt Tab
 */
const ShippingReceiptTabSkeleton = () => {
  return (
    <div className="space-y-6">
      {/* Shipping Details Section */}
      <Card size="small" title="Shipping Details">
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col xs={24} sm={12} key={i}>
              <div className="mb-2">
                <Skeleton height={14} width={120} style={{ marginBottom: 4 }} />
                <Skeleton height={32} width="100%" />
              </div>
            </Col>
          ))}
        </Row>
        <div className="mt-4">
          <Skeleton height={32} width={120} />
        </div>
      </Card>

      {/* Costs Section */}
      <Card size="small" title="Costs">
        <div className="mb-4">
          <Skeleton height={32} width={120} />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card size="small" key={i}>
              <Row gutter={16}>
                <Col span={8}>
                  <Skeleton height={20} />
                </Col>
                <Col span={8}>
                  <Skeleton height={20} />
                </Col>
                <Col span={8}>
                  <Skeleton height={20} />
                </Col>
              </Row>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default ShippingReceiptTabSkeleton;

