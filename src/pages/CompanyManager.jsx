import { useEffect, useMemo, useState } from "react";
import { 
  Table, 
  Button, 
  Modal, 
  Form, 
  Input, 
  Select, 
  message, 
  Popconfirm, 
  Tag, 
  Card, 
  Space,
  Row,
  Col,
  Breadcrumb,
  Upload,
  Image,
  Divider
} from "antd";
import { Plus, Edit, Trash2, Search, Building2, Upload as UploadIcon, X } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchCompanies, createCompany, updateCompany, deleteCompany } from "../api/company";
import useAuth from "../hooks/useAuth";
import Swal from "sweetalert2";

const { Search: AntSearch } = Input;

const TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney"
];

export default function CompanyManager() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    if (!user || user.roles?.role !== "admin") return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const load = async () => {
    try {
      setLoading(true);
      const list = await fetchCompanies();
      setCompanies(list);
      setFilteredCompanies(list);
    } catch (e) {
      message.error(e?.response?.data?.message || "Failed to load companies");
      setCompanies([]);
      setFilteredCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter companies based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCompanies(companies);
      return;
    }
    const filtered = companies.filter(
      (company) =>
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.timezone?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCompanies(filtered);
  }, [searchTerm, companies]);

  const openCreate = () => {
    setEditing(null);
    setLogoFile(null);
    setLogoPreview(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditing(row);
    setLogoFile(null);
    setLogoPreview(row.logo || null);
    
    const address = row.address || {};
    const contactDetails = row.contactDetails || {};
    
    form.setFieldsValue({
      name: row.name,
      code: row.code || "",
      timezone: row.timezone || "UTC",
      // Address fields
      street: address.street || "",
      city: address.city || "",
      state: address.state || "",
      country: address.country || "",
      zipCode: address.zipCode || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2 || "",
      // Contact details
      phone: contactDetails.phone || "",
      email: contactDetails.email || "",
      website: contactDetails.website || "",
      fax: contactDetails.fax || "",
      contactPerson: contactDetails.contactPerson || "",
      contactPersonPhone: contactDetails.contactPersonPhone || "",
      contactPersonEmail: contactDetails.contactPersonEmail || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      const values = await form.validateFields();
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Basic fields
      formData.append("name", values.name);
      if (values.code) formData.append("code", values.code);
      formData.append("timezone", values.timezone);
      
      // Address object
      const address = {
        street: values.street || "",
        city: values.city || "",
        state: values.state || "",
        country: values.country || "",
        zipCode: values.zipCode || "",
        addressLine1: values.addressLine1 || "",
        addressLine2: values.addressLine2 || "",
      };
      formData.append("address", JSON.stringify(address));
      
      // Contact details object
      const contactDetails = {
        phone: values.phone || "",
        email: values.email || "",
        website: values.website || "",
        fax: values.fax || "",
        contactPerson: values.contactPerson || "",
        contactPersonPhone: values.contactPersonPhone || "",
        contactPersonEmail: values.contactPersonEmail || "",
      };
      formData.append("contactDetails", JSON.stringify(contactDetails));
      
      // Logo file
      if (logoFile && logoFile.originFileObj) {
        formData.append("logo", logoFile.originFileObj);
      }
      
      if (editing) {
        await updateCompany(editing._id, formData);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Company updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      } else {
        await createCompany(formData);
        Swal.fire({
          icon: "success",
          title: "Success!",
          text: "Company created successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        });
      }
      setModalOpen(false);
      form.resetFields();
      setLogoFile(null);
      setLogoPreview(null);
      load();
    } catch (e) {
      if (e?.errorFields) return; // form validation error
      const errorMessage = e?.response?.data?.message || "Save failed";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogoChange = (info) => {
    const file = info.file;
    
    // Validate file type
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp", "image/svg+xml"];
    if (file && !validTypes.includes(file.type)) {
      message.error("Invalid file type. Only JPEG, PNG, GIF, WEBP, and SVG are allowed.");
      return;
    }
    
    // Validate file size (5MB)
    if (file && file.size > 5 * 1024 * 1024) {
      message.error("File size must be less than 5MB.");
      return;
    }
    
    if (file && file.originFileObj) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result);
      };
      reader.readAsDataURL(file.originFileObj);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
  };

  const remove = async (row) => {
    try {
      await deleteCompany(row._id);
      Swal.fire({
        icon: "success",
        title: "Success!",
        text: "Company deleted successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      });
      load();
    } catch (e) {
      const errorMessage = e?.response?.data?.message || "Delete failed";
      Swal.fire({
        icon: "error",
        title: "Error",
        text: errorMessage,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
      });
    }
  };

  // Guard: only admins
  if (!user || user.roles?.role !== "admin") {
    return (
      <div className="p-4">
        <Card>
          <div className="text-center py-12">
            <Building2 size={48} className="text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to view this page.</p>
          </div>
        </Card>
      </div>
    );
  }

  const columns = useMemo(() => [
    {
      title: "Logo",
      key: "logo",
      width: 80,
      render: (_, record) => (
        record.logo ? (
          <Image
            src={record.logo}
            alt={record.name}
            width={50}
            height={50}
            style={{ objectFit: "contain" }}
            preview={true}
          />
        ) : (
          <div className="w-[50px] h-[50px] bg-gray-100 rounded flex items-center justify-center">
            <Building2 size={24} className="text-gray-400" />
          </div>
        )
      ),
    },
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      render: (text) => <span className="font-medium text-gray-900">{text}</span>,
    },
    {
      title: "Code",
      dataIndex: "code",
      key: "code",
      render: (v) => v ? <Tag color="blue">{v}</Tag> : <span className="text-gray-400">—</span>,
    },
    {
      title: "Timezone",
      dataIndex: "timezone",
      key: "timezone",
      render: (tz) => <Tag color="geekblue">{tz}</Tag>,
    },
    {
      title: "City",
      key: "city",
      render: (_, record) => record.address?.city || <span className="text-gray-400">—</span>,
    },
    {
      title: "Email",
      key: "email",
      render: (_, record) => record.contactDetails?.email || <span className="text-gray-400">—</span>,
    },
    {
      title: "Actions",
      key: "actions",
      width: 150,
      render: (_, row) => (
        <Space size="small">
          <Button
            type="text"
            icon={<Edit size={14} />}
            onClick={() => openEdit(row)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete Company?"
            description={`Are you sure you want to delete "${row.name}"? This action cannot be undone.`}
            onConfirm={() => remove(row)}
            okText="Yes, Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<Trash2 size={14} />}
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ], []);

  return (
    <div className="p-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-4">
          <Breadcrumb.Item>
            <Link to="/">Home</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <Link to="/admin/users">Users</Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>Companies</Breadcrumb.Item>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
              <Building2 size={24} className="text-blue-600" />
              Companies
            </h1>
            <p className="text-xs sm:text-sm text-gray-600">
              Manage company information and settings
            </p>
          </div>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={openCreate}
            size="middle"
            className="w-full sm:w-auto"
          >
            New Company
          </Button>
        </div>

        {/* Search and Filters */}
        <Card size="small" className="mb-4">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <AntSearch
                placeholder="Search by name, code, or timezone..."
                allowClear
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<Search size={16} />}
                size="middle"
              />
            </Col>
            <Col xs={24} sm={12} md={16} className="flex items-center justify-end">
              <span className="text-sm text-gray-600">
                {filteredCompanies.length} of {companies.length} companies
              </span>
            </Col>
          </Row>
        </Card>

        {/* Table */}
        <Card size="small">
          <Table
            rowKey="_id"
            loading={loading}
            dataSource={filteredCompanies}
            columns={columns}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} companies`,
            }}
            scroll={{ x: 1200 }}
            size="middle"
            locale={{
              emptyText: (
                <div className="py-8 text-center">
                  <Building2 size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No companies found</p>
                </div>
              ),
            }}
          />
        </Card>

        {/* Create/Edit Modal */}
        <Modal
          title={
            <div className="flex items-center gap-2">
              <Building2 size={20} className="text-blue-600" />
              <span>{editing ? "Edit Company" : "New Company"}</span>
            </div>
          }
          open={modalOpen}
          onOk={handleSubmit}
          onCancel={() => {
            setModalOpen(false);
            form.resetFields();
            setEditing(null);
            setLogoFile(null);
            setLogoPreview(null);
          }}
          okText={editing ? "Update" : "Create"}
          cancelText="Cancel"
          confirmLoading={submitting}
          width={800}
          style={{ top: 20 }}
          className="company-modal"
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Row gutter={16}>
              <Col span={24}>
                <Form.Item
                  label="Company Logo"
                  name="logo"
                >
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="relative">
                        <Image
                          src={logoPreview}
                          alt="Logo preview"
                          width={100}
                          height={100}
                          style={{ objectFit: "contain", border: "1px solid #d9d9d9", borderRadius: "4px" }}
                        />
                        <Button
                          type="text"
                          danger
                          icon={<X size={14} />}
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2"
                          size="small"
                        />
                      </div>
                    )}
                    <Upload
                      beforeUpload={() => false}
                      onChange={handleLogoChange}
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
                      showUploadList={false}
                      maxCount={1}
                    >
                      <Button icon={<UploadIcon size={16} />} size="large">
                        {logoPreview ? "Change Logo" : "Upload Logo"}
                      </Button>
                    </Upload>
                    <span className="text-xs text-gray-500">
                      Max 5MB. Formats: JPEG, PNG, GIF, WEBP, SVG
                    </span>
                  </div>
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Basic Information</Divider>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Company Name"
                  name="name"
                  rules={[
                    { required: true, message: "Company name is required" },
                    { min: 2, message: "Name must be at least 2 characters" },
                  ]}
                >
                  <Input
                    placeholder="Enter company name (e.g., Acme Inc.)"
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Company Code"
                  name="code"
                  rules={[
                    { max: 20, message: "Code must be less than 20 characters" },
                  ]}
                >
                  <Input
                    placeholder="Optional code (e.g., ACME)"
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} className="mt-3">
              <Col span={24}>
                <Form.Item
                  label="Timezone"
                  name="timezone"
                  initialValue="UTC"
                  rules={[{ required: true, message: "Timezone is required" }]}
                >
                  <Select
                    showSearch
                    size="large"
                    placeholder="Select timezone"
                    options={TIMEZONES.map((tz) => ({ value: tz, label: tz }))}
                    filterOption={(input, option) =>
                      (option?.label ?? "")
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Address</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Street" name="street">
                  <Input placeholder="Street address" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="City" name="city">
                  <Input placeholder="City" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} className="mt-4">
              <Col span={8}>
                <Form.Item label="State" name="state">
                  <Input placeholder="State/Province" size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Country" name="country">
                  <Input placeholder="Country" size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item label="Zip Code" name="zipCode">
                  <Input placeholder="Zip/Postal code" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Divider orientation="left">Contact Details</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label="Phone" 
                  name="phone"
                  rules={[
                    { type: "string" },
                  ]}
                >
                  <Input placeholder="+1-555-123-4567" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="Email" 
                  name="email"
                  rules={[
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input placeholder="contact@company.com" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Website" name="website">
                  <Input placeholder="https://www.company.com" size="large" />
                </Form.Item>
              </Col>
            </Row>

            {/* <Divider orientation="left">Contact Person</Divider>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Contact Person Name" name="contactPerson">
                  <Input placeholder="John Doe" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Contact Person Phone" name="contactPersonPhone">
                  <Input placeholder="+1-555-123-4569" size="large" />
                </Form.Item>
              </Col>
            </Row> */}

            {/* <Row gutter={16}>
              <Col span={24}>
                <Form.Item 
                  label="Contact Person Email" 
                  name="contactPersonEmail"
                  rules={[
                    { type: "email", message: "Please enter a valid email" },
                  ]}
                >
                  <Input placeholder="john@company.com" size="large" />
                </Form.Item>
              </Col>
            </Row> */}
          </Form>
        </Modal>
      </div>
    </div>
  );
}
