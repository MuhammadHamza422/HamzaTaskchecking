import React from "react";
import { Card, Row, Col } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Documents Tab
 */
const DocumentsTabSkeleton = () => {
  return (
    <div>
      <div className="mb-4">
        <Skeleton height={32} width={150} />
      </div>
      <Row gutter={[16, 16]}>
        {Array.from({ length: 6 }).map((_, i) => (
          <Col xs={24} sm={12} md={8} lg={6} key={i}>
            <Card size="small" hoverable>
              <Skeleton height={120} style={{ marginBottom: 8 }} />
              <Skeleton height={16} width="80%" />
              <Skeleton height={14} width="60%" style={{ marginTop: 4 }} />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default DocumentsTabSkeleton;

