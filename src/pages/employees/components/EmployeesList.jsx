import React from 'react';
import { Table, Space, Button, Tag, Tooltip, message } from 'antd';
import { EditOutlined, EyeOutlined, DeleteOutlined, RollbackOutlined } from '@ant-design/icons';

const EmployeesList = ({ mode = 'active', employees, loading, pagination, onEdit, onView, onDelete, onRestore, onHardDelete, onPaginationChange }) => {
  const columns = [
    {
      title: '#',
      key: 'index',
      width: 70,
      align: 'center',
      render: (_, __, index) => (
        <span style={{ fontWeight: 500, color: 'rgba(0,0,0,.65)' }}>
          #{index + 1}
        </span>
      ),
    },
    {
      title: 'Employee',
      key: 'employee',
      width: 250,
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div>
            <div className="font-medium">
              {record.fullName}
            </div>
            <div className="text-sm text-gray-500">
              {record.email}
            </div>
            <div className="text-xs text-gray-400">
              ID: {record.employeeCode}
            </div>
          </div>
        </div>
      ),
      sorter: (a, b) => 
        (a.fullName || '').localeCompare(b.fullName || ''),
    },
    {
      title: 'Company',
      key: 'company',
      width: 150,
      render: (_, record) => (
        <Tag color="geekblue">{record.company?.name || 'N/A'}</Tag>
      ),
      sorter: (a, b) => (a.company?.name || '').localeCompare(b.company?.name || ''),
    },
    {
      title: 'Department',
      key: 'department',
      width: 120,
      render: (_, record) => (
        <Tag color="blue">{record.department || 'N/A'}</Tag>
      ),
      sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
    },
    {
      title: 'Title',
      key: 'title',
      width: 180,
      render: (_, record) => (
        <span className="text-sm">{record.title || 'N/A'}</span>
      ),
      sorter: (a, b) => (a.title || '').localeCompare(b.title || ''),
    },
    {
      title: 'Designation',
      key: 'designation',
      width: 150,
      render: (_, record) => (
        <span className="text-sm">{record.designation || 'N/A'}</span>
      ),
      sorter: (a, b) => (a.designation || '').localeCompare(b.designation || ''),
    },
    {
      title: 'Employment Type',
      key: 'employmentType',
      width: 140,
      align: 'center',
      render: (_, record) => {
        const type = record.employmentType || 'full-time';
        const color = type === 'full-time' ? 'green' : 
                     type === 'part-time' ? 'blue' : 
                     type === 'contract' ? 'orange' : 'purple';
        return <Tag color={color}>{type.replace('-', ' ').toUpperCase()}</Tag>;
      },
      sorter: (a, b) => (a.employmentType || '').localeCompare(b.employmentType || ''),
    },
    {
      title: 'Hourly Rate',
      key: 'hourlyRate',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const rate = record.payroll?.hourlyRate || 0;
        const currency = record.payroll?.currency || 'USD';
        return (
          <span className="font-medium">
            {currency === 'COP' ? `$${rate.toFixed(2)}` : 
             currency === 'JPY' ? `¥${rate.toLocaleString()}` : 
             `$${rate.toFixed(2)}`}
          </span>
        );
      },
      sorter: (a, b) => (a.payroll?.hourlyRate || 0) - (b.payroll?.hourlyRate || 0),
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      align: 'center',
      render: (_, record) => {
        const status = record.status;
        const color = status === 'active' ? 'green' : 
                     status === 'inactive' ? 'orange' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      align: 'center',
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="View Details">
            <Button
              size="small"
              onClick={() => onView && onView(record)}
              disabled={!onView}
              icon={<EyeOutlined />}
            />
          </Tooltip>
          {mode === 'active' ? (
            <>
              <Tooltip title="Edit Employee">
                <Button
                  size="small"
                  onClick={() => onEdit && onEdit(record)}
                  disabled={!onEdit}
                  icon={<EditOutlined />}
                />
              </Tooltip>
              <Tooltip title="Delete (Soft)">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onDelete && onDelete(record._id)}
                  disabled={!onDelete}
                />
              </Tooltip>
            </>
          ) : (
            <>
              <Tooltip title="Restore">
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  onClick={() => onRestore && onRestore(record._id)}
                  disabled={!onRestore}
                />
              </Tooltip>
              <Tooltip title="Delete Permanently">
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => onHardDelete && onHardDelete(record._id)}
                  disabled={!onHardDelete}
                />
              </Tooltip>
            </>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Table
      size="middle"
      rowKey="_id"
      columns={columns}
      dataSource={employees}
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        showSizeChanger: true,
        showQuickJumper: true,
        showTotal: (total, range) => 
          `${range[0]}-${range[1]} of ${total} employees`,
        onChange: onPaginationChange,
        onShowSizeChange: onPaginationChange,
      }}
      scroll={{ x: 1000 }}
      style={{
        fontSize: '13px',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    />
  );
};

export default EmployeesList;
