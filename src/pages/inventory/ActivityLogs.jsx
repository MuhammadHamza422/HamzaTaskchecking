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
import { fetchAllUsers, fetchUserActivity } from "../../api/auth";

const { Title, Text } = Typography;
const { Option } = Select;

const ActivityLogs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: usersData } = useQuery({
    queryKey: ["users-all"],
    queryFn: fetchAllUsers,
    staleTime: 1000 * 60 * 10,
  });

  const { data, isLoading, error } = useQuery({
    queryKey: [
      "user-activity",
      currentPage,
      pageSize,

      selectedDate?.format?.("YYYY-MM-DD") || null,
      selectedUser,
    ],
    queryFn: async ({ queryKey }) => {
      const [, page, limit, dateStr, userId] = queryKey;
      return fetchUserActivity({
        page,
        limit,
        app: "inventory",
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

  const colors = {
    added: "green",
    update: "blue",
    delete: "red",
  };

  // Function to render text with colored words
  const renderColoredText = (text) => {
    const key = Object.keys(colors).find((k) => text.toLowerCase().includes(k));

    const bgColor = key ? colors[key] : "default";

    return (
      <Tag color={bgColor} style={{ width: "100%", textAlign: "center" }}>
        {text}
      </Tag>
    );
  };

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
        render: (text) => renderColoredText(text),
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
        className="mb-4"
        style={{
          background: "linear-gradient(to right, #f0f4ff, #dbeafe)",
          borderRadius: "12px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
          padding: "1rem 1.5rem",
        }}
      >
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center justify-between">
          <Title level={3} style={{ margin: 0 }}>
            User Activity
          </Title>
          <div className="flex flex-wrap gap-3 items-center">
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

export default ActivityLogs;
