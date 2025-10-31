import React from 'react';
import { Select, Space } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies } from '../../../api/company';

const { Option } = Select;

const EmployeeFilters = ({ filters, onFilterChange }) => {
  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    onFilterChange(newFilters);
  };

  // Fetch companies from API
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: fetchCompanies,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const companies = [
    { value: 'all', label: 'All Companies' },
    ...(companiesData || []).map(company => ({
      value: company._id,
      label: company.name
    }))
  ];

  const departments = [
    { value: 'all', label: 'All Departments' },
    { value: 'IT', label: 'Information Technology' },
    { value: 'HR', label: 'Human Resources' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Operations', label: 'Operations' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' }
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'terminated', label: 'Terminated' }
  ];

  return (
    <Space wrap>
      <FilterOutlined style={{ color: 'rgba(0,0,0,.45)' }} />
      
      <Select
        value={filters.company}
        onChange={(value) => handleFilterChange('company', value)}
        style={{ width: 200 }}
        placeholder="Select Company"
      >
        {companies.map(company => (
          <Option key={company.value} value={company.value}>
            {company.label}
          </Option>
        ))}
      </Select>

      <Select
        value={filters.department}
        onChange={(value) => handleFilterChange('department', value)}
        style={{ width: 150 }}
        placeholder="Select Department"
      >
        {departments.map(dept => (
          <Option key={dept.value} value={dept.value}>
            {dept.label}
          </Option>
        ))}
      </Select>

      <Select
        value={filters.status}
        onChange={(value) => handleFilterChange('status', value)}
        style={{ width: 120 }}
        placeholder="Select Status"
      >
        {statuses.map(status => (
          <Option key={status.value} value={status.value}>
            {status.label}
          </Option>
        ))}
      </Select>
    </Space>
  );
};

export default EmployeeFilters;
