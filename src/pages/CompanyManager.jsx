import { useEffect, useMemo, useState } from "react";
import { Table, Button, Modal, Form, Input, Select, message, Popconfirm, Tag } from "antd";
import { fetchCompanies, createCompany, updateCompany, deleteCompany } from "../api/company";
import useAuth from "../hooks/useAuth";

const TIMEZONES = [
  "UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Asia/Dubai","Asia/Kolkata","Asia/Singapore","Australia/Sydney"
];

export default function CompanyManager() {
  const { user } = useAuth(); // must return current user with role
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!user || user.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchCompanies(); // active companies
      setCompanies(list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      code: row.code || "",
      timezone: row.timezone || "UTC",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editing) {
        await updateCompany(editing._id, values);
        message.success("Company updated");
      } else {
        await createCompany(values);
        message.success("Company created");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      if (e?.errorFields) return; // form error
      message.error(e?.response?.data?.message || "Save failed");
    }
  };

  const remove = async (row) => {
    try {
      await deleteCompany(row._id);
      message.success("Company deleted");
      load();
    } catch (e) {
      message.error(e?.response?.data?.message || "Delete failed");
    }
  };

  // Guard: only admins
  if (!user || user.role !== "admin") {
    return (
      <div className="page-container">
        <h2>Companies</h2>
        <p>You don’t have permission to view this page.</p>
      </div>
    );
  }

  const columns = useMemo(() => [
    { title: "Name", dataIndex: "name" },
    { title: "Code", dataIndex: "code", render: v => v || <span className="text-gray-400">—</span> },
    { title: "Timezone", dataIndex: "timezone", render: tz => <Tag>{tz}</Tag> },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <div className="flex gap-2">
          <Button size="small" onClick={() => openEdit(row)}>Edit</Button>
          <Popconfirm title="Delete company?" onConfirm={() => remove(row)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </div>
      ),
    },
  ], []);

  return (
    <div className="page-container">
      <div className="header-actions">
        <h2 className="m-0">Companies</h2>
        <Button type="primary" onClick={openCreate}>New Company</Button>
      </div>

      <Table
        rowKey="_id"
        loading={loading}
        dataSource={companies}
        columns={columns}
        pagination={false}
      />

      <Modal
        title={editing ? "Edit Company" : "New Company"}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        okText={editing ? "Save" : "Create"}
      >
        <Form form={form} layout="vertical">
          <Form.Item label="Name" name="name" rules={[{ required: true, message: "Name is required" }]}>
            <Input placeholder="Acme Inc." />
          </Form.Item>
          <Form.Item label="Code" name="code">
            <Input placeholder="Optional code (e.g., ACME)" />
          </Form.Item>
          <Form.Item label="Timezone" name="timezone" initialValue="UTC" rules={[{ required: true }]}>
            <Select
              showSearch
              options={TIMEZONES.map(tz => ({ value: tz, label: tz }))}
              placeholder="Select IANA timezone"
              filterOption={(input, opt) => (opt?.label ?? "").toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
