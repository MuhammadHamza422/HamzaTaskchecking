import React, { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { debounce } from "lodash";
import {
  Table,
  Typography,
  Empty,
  Pagination,
  DatePicker,
  Select,
  Card,
  Tag,
} from "antd";
import dayjs from "dayjs";
import Swal from "sweetalert2";
import { fetchAllUsers, fetchUserActivity } from "../api/auth";

const { Title, Text } = Typography;
const { Option } = Select;

const UserActivityPage = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: fetchAllUsers,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "order-processing",
      currentPage,
      pageSize,
      selectedDate?.format?.("YYYY-MM-DD") || null,
      selectedUser,
      selectedApp,
    ],
    queryFn: async ({ queryKey }) => {
      const [, page, limit, dateStr, userId, appType] = queryKey;
      return fetchUserActivity({
        page,
        limit,
        app: appType || undefined,
        date: dateStr || undefined,
        user: userId || undefined,
      });
    },
    keepPreviousData: true,
  });

  if (error) {
    Swal.fire({
      icon: "error",
      title: "Failed to load user activity",
      text: error.message || "An error occurred while fetching data",
      toast: true,
      position: "top-end",
      showConfirmButton: false,
      timer: 4000,
      timerProgressBar: true,
      background: "#ef4444",
      color: "#fff",
      customClass: { popup: "rounded-lg" },
    });
  }

  const usersOptions = useMemo(() => {
    return (usersData || []).map((u) => ({
      value: u._id,
      label: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email,
    }));
  }, [usersData]);

  const columns = useMemo(
    () => [
      {
        title: "Time",
        dataIndex: "createdAt",
        key: "createdAt",
        width: 210,
        render: (val) => (
          <span className="text-gray-700">
            {dayjs(val).format("YYYY-MM-DD hh:mm:ss A")}
          </span>
        ),
      },
      {
        title: "Action",
        dataIndex: "action",
        key: "action",
        width: 160,
        render: (text) => <Tag color="blue">{text}</Tag>,
      },
      {
        title: "Performed By",
        key: "user",
        width: 220,
        render: (_, row) => (
          <span className="text-gray-800 font-medium">
            {[row?.user?.firstName, row?.user?.lastName]
              .filter(Boolean)
              .join(" ") || row?.user?.email}
          </span>
        ),
      },
      {
        title: "Description",
        dataIndex: "description",
        key: "description",
        render: (text) => <span className="text-gray-700">{text}</span>,
      },
    ],
    []
  );

  const items = data?.activity || [];
  const total = data?.total || 0;

  const onUserChange = (val) => {
    setSelectedUser(val || null);
    setCurrentPage(1);
  };

  const onDateChange = (date) => {
    setSelectedDate(date);
    setCurrentPage(1);
  };

  const onAppChange = (val) => {
    setSelectedApp(val || null);
    setCurrentPage(1);
  };

  const handlePageChange = (page, size) => {
    setCurrentPage(page);
    setPageSize(size);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className="mb-4 shadow-lg rounded-lg p-2 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50"
       
      >
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center justify-between">
          <Title level={3} style={{ margin: 0 }}>
            User Activity
          </Title>
          <div className="flex flex-wrap gap-3 items-center">
            <Select
              placeholder="Filter by app"
              allowClear
              value={selectedApp || undefined}
              onChange={onAppChange}
              className="min-w-[160px]"
              options={[
                { value: "users", label: "Users" },
                { value: "inventory", label: "Inventory" },
                { value: "orders", label: "Orders" },
                { value: "products", label: "Products" },
              ]}
            />
            <Select
              placeholder="Filter by user"
              allowClear
              value={selectedUser || undefined}
              onChange={onUserChange}
              className="min-w-[220px]"
              showSearch
              optionFilterProp="label"
              options={usersOptions}
            />
            <DatePicker
              placeholder="Filter by date"
              value={selectedDate}
              onChange={onDateChange}
              className="min-w-[200px]"
              allowClear
            />
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-lg">
        {/* Desktop/Table view */}
        <div className="hidden sm:block">
          <Table
            dataSource={items}
            columns={columns}
            rowKey={(r) => r._id}
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  description="No activity found"
                  className="py-12 text-xl font-semibold text-gray-500"
                />
              ),
            }}
            className="w-full overflow-x-auto"
          />
        </div>

        {/* Mobile/Card view */}
        <div className="sm:hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-100 rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center">
              <Empty
                description="No activity found"
                className="py-12 text-xl font-semibold text-gray-500"
              />
            </div>
          ) : (
            <div className="p-3 space-y-3">
              {items.map((item) => (
                <div
                  key={item._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Tag color="blue" className="text-xs">
                          {item.action}
                        </Tag>
                        <span className="text-xs text-gray-500">
                          {dayjs(item.createdAt).format("MMM DD, hh:mm A")}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-gray-800">
                        {[item?.user?.firstName, item?.user?.lastName]
                          .filter(Boolean)
                          .join(" ") || item?.user?.email || "Unknown User"}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-700">
                    {item.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {data && (
          <div className="flex justify-center mt-6 p-4">
            <Pagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              showSizeChanger
              showQuickJumper
              onChange={handlePageChange}
              onShowSizeChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default UserActivityPage;
