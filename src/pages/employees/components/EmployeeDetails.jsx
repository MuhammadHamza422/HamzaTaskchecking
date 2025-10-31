import React, { useState } from 'react';
import { Card, Row, Col, Space, Button, Tag, Descriptions, Divider, Modal, Select, message } from 'antd';
import { EditOutlined, ArrowLeftOutlined, DeleteOutlined, UserOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllUsers } from '../../../api/auth';
import { linkUserToEmployee } from '../../../api/auth';
import { showSuccessToast, showErrorToast } from '../../../utils/sweetAlert';

const EmployeeDetails = ({ employee, onEdit, onBack, onDelete }) => {
  const queryClient = useQueryClient();
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Fetch all users for linking
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: fetchAllUsers,
    enabled: linkModalVisible,
  });

  const users = usersData || [];

  // Link user to employee mutation
  const linkUserMutation = useMutation({
    mutationFn: ({ userId, employeeId }) => linkUserToEmployee({ userId, employeeId }),
    onSuccess: () => {
      showSuccessToast('User linked to employee successfully', 'Success');
      setLinkModalVisible(false);
      setSelectedUserId(null);
      queryClient.invalidateQueries(['all-users']);
    },
    onError: (error) => {
      showErrorToast(error?.response?.data?.message || 'Failed to link user', 'Error');
    },
  });

  const handleLinkUser = () => {
    if (!selectedUserId) {
      message.warning('Please select a user to link');
      return;
    }
    linkUserMutation.mutate({
      userId: selectedUserId,
      employeeId: employee._id,
    });
  };

  if (!employee) {
    return <div>No employee data available</div>;
  }

  const formatCurrency = (amount, currency) => {
    if (!amount) return '-';
    switch (currency) {
      case 'COP':
        return `$${amount.toFixed(2)}`;
      case 'JPY':
        return `¥${amount.toLocaleString()}`;
      default:
        return `$${amount.toFixed(2)}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatAddress = (address) => {
    if (!address) return '-';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.state) parts.push(address.state);
    if (address.postalCode) parts.push(address.postalCode);
    if (address.country) parts.push(address.country);
    
    return parts.length > 0 ? parts.join(', ') : '-';
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            Back to List
          </Button>
          <Button type="primary" icon={<EditOutlined />} onClick={onEdit}>
            Edit Employee
          </Button>
          <Button danger icon={<DeleteOutlined />} onClick={() => onDelete(employee._id)}>
            Delete
          </Button>
          <Button 
            type="default" 
            icon={<LinkOutlined />} 
            onClick={() => setLinkModalVisible(true)}
          >
            Link User
          </Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        {/* Employee Profile */}
        <Col xs={24} lg={8}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <UserOutlined className="text-4xl text-blue-600" />
              </div>
              <h3 style={{ margin: 0, marginBottom: 8 }}>
                {employee.fullName}
              </h3>
              <p style={{ color: 'rgba(0,0,0,.45)', margin: 0, marginBottom: 16 }}>
                {employee.title}
              </p>
              <Space direction="vertical" size={8}>
                {/* <Tag color="geekblue">{employee.company?.name || employee.company}</Tag>
                <Tag color="blue">{employee.department}</Tag> */}
                <Tag color={employee.status === 'active' ? 'green' : 'orange'}>
                  {employee.status}
                </Tag>
              </Space>
            </div>
          </Card>
        </Col>

        {/* Personal Information */}
        <Col xs={24} lg={16}>
          <Card title="Personal Information" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Employee ID">
                {employee.employeeCode}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {employee.email}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {employee.phone}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Birth">
                {formatDate(employee.dateOfBirth)}
              </Descriptions.Item>
              <Descriptions.Item label="Gender">
                {employee.gender || '-'}
              </Descriptions.Item>
              {/* <Descriptions.Item label="Marital Status">
                {employee.maritalStatus || '-'}
              </Descriptions.Item> */}
              <Descriptions.Item label="Address" span={2}>
                {formatAddress(employee.address)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Employment Information */}
        <Col xs={24} lg={12}>
          <Card title="Employment Information" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Company">
                {employee.company?.name || employee.company}
              </Descriptions.Item>
              <Descriptions.Item label="Department">
                {employee.department}
              </Descriptions.Item>
              <Descriptions.Item label="Job Title">
                {employee.title}
              </Descriptions.Item>
              <Descriptions.Item label="Designation">
                {employee.designation || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Date of Joining">
                {formatDate(employee.dateOfJoining)}
              </Descriptions.Item>
              <Descriptions.Item label="Work Location">
                {employee.workLocation || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Employment Type">
                <Tag color="blue">
                  {employee.employmentType || 'full-time'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={employee.status === 'active' ? 'green' : 'orange'}>
                  {employee.status}
                </Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Payroll Information */}
        <Col xs={24} lg={12}>
          <Card title="Payroll Information" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Hourly Rate">
                {formatCurrency(employee.payroll?.hourlyRate, employee.payroll?.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Monthly Salary">
                {formatCurrency(employee.payroll?.monthlySalary, employee.payroll?.currency)}
              </Descriptions.Item>
              <Descriptions.Item label="Currency">
                <Tag color="blue">{employee.payroll?.currency}</Tag>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Bank Details */}
        <Col xs={24} lg={12}>
          <Card title="Bank Details" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Bank Name">
                {employee.bankDetails?.bankName || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Account Number">
                {employee.bankDetails?.accountNumber || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="IBAN">
                {employee.bankDetails?.iban || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Identification Details */}
        <Col xs={24} lg={12}>
          <Card title="Identification Details" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="CNIC">
                {employee.countryId?.cnic || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="SSN">
                {employee.countryId?.ssn || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Cedula">
                {employee.countryId?.cedula || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="My Number">
                {employee.countryId?.myNumber || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        {/* Emergency Contact */}
        <Col xs={24}>
          <Card title="Emergency Contact" size="small">
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Name">
                {employee.emergencyContact?.name || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Relationship">
                {employee.emergencyContact?.relationship || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {employee.emergencyContact?.phone || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {employee.emergencyContact?.email || '-'}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      {/* Link User Modal */}
      <Modal
        title="Link User to Employee"
        open={linkModalVisible}
        onCancel={() => {
          setLinkModalVisible(false);
          setSelectedUserId(null);
        }}
        onOk={handleLinkUser}
        okText="Link User"
        okButtonProps={{ loading: linkUserMutation.isPending }}
        cancelButtonProps={{ disabled: linkUserMutation.isPending }}
      >
        <div style={{ marginBottom: 16 }}>
          <p><strong>Employee:</strong> {employee.fullName} ({employee.email})</p>
        </div>
        <Select
          style={{ width: '100%' }}
          placeholder="Select a user to link"
          value={selectedUserId}
          onChange={setSelectedUserId}
          loading={usersLoading}
          showSearch
          optionFilterProp="children"
          filterOption={(input, option) =>
            option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
          }
        >
          {users.map(user => (
            <Select.Option key={user._id} value={user._id}>
              {user.firstName} {user.lastName} ({user.email})
            </Select.Option>
          ))}
        </Select>
      </Modal>
    </div>
  );
};

export default EmployeeDetails;
