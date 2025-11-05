import React from "react";
import { Card, Row, Col, Space } from "antd";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

/**
 * Skeleton loader for Purchase Order Detail Page
 */
export const DetailPageHeaderSkeleton = () => (
  <div className="mb-4">
    <Skeleton height={24} width={60} style={{ marginBottom: 8 }} />
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Skeleton height={32} width={200} />
        <Skeleton height={24} width={24} circle />
      </div>
      <Space>
        <Skeleton height={32} width={120} />
        <Skeleton height={32} width={140} />
        <Skeleton height={24} width={80} />
        <Skeleton height={24} width={80} />
      </Space>
    </div>
  </div>
);

export const DetailPageStatusFlowSkeleton = () => (
  <Card size="small" className="mb-4">
    <div className="flex items-center justify-between">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <Skeleton height={40} width={40} circle />
            <Skeleton height={16} width={80} style={{ marginTop: 8 }} />
          </div>
          {i < 4 && (
            <Skeleton height={2} width="100%" style={{ margin: "0 8px" }} />
          )}
        </div>
      ))}
    </div>
  </Card>
);

export const DetailPageTabsSkeleton = () => (
  <Card size="small">
    <Skeleton height={40} style={{ marginBottom: 16 }} />
    <div className="space-y-4">
      <Skeleton height={100} />
      <Skeleton height={100} />
      <Skeleton height={100} />
    </div>
  </Card>
);

export const DetailPageActivitySkeleton = () => (
  <Card size="small" title="Activity Log">
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3">
          <Skeleton height={40} width={40} circle />
          <div className="flex-1">
            <Skeleton height={16} width="60%" style={{ marginBottom: 4 }} />
            <Skeleton height={14} width="40%" />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export const DetailPageFullSkeleton = () => (
  <div className="p-4">
    <div className="max-w-7xl mx-auto">
      <DetailPageHeaderSkeleton />
      <DetailPageStatusFlowSkeleton />
      <Row gutter={16}>
        <Col xs={24} lg={16}>
          <DetailPageTabsSkeleton />
        </Col>
        <Col xs={24} lg={8}>
          <DetailPageActivitySkeleton />
        </Col>
      </Row>
    </div>
  </div>
);

