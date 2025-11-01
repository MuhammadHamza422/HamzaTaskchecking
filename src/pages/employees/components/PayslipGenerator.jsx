import React, { useState, useEffect } from "react";
import {
  Card,
  Form,
  Select,
  DatePicker,
  Button,
  Table,
  Space,
  Tag,
  message,
  Modal,
  Row,
  Col,
  Statistic,
  Divider,
  Alert,
} from "antd";
import {
  FileTextOutlined,
  DownloadOutlined,
  EyeOutlined,
  DollarOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import {
  generatePayslip,
  getPayslips,
  bulkGeneratePayslips,
  downloadPayslipPDF,
  getPayslipSummary,
} from "../../../api/payslips";
import { getEmployees } from "../../../api/employees";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  showSuccessToast,
  showErrorToast,
  showWarningToast,
  showInfoToast,
} from "../../../utils/sweetAlert";
import dayjs from "dayjs";
import html2canvas from "html2canvas-pro";
import jsPDF from "jspdf";

const { RangePicker } = DatePicker;
const { Option } = Select;

const PayslipGenerator = () => {
  const queryClient = useQueryClient();
  const [form] = Form.useForm();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [payslipModalVisible, setPayslipModalVisible] = useState(false);
  const [generationForm] = Form.useForm();
  const payslipRef = React.useRef(null);
  const [hasUnderHoursOnly, setHasUnderHoursOnly] = useState(false);

  const formatCurrency = (amount, currency = "USD") => {
    if (amount === null || amount === undefined) return "-";
    if (currency === "COP") return `$${Number(amount).toFixed(2)}`;
    if (currency === "JPY") return `¥${Number(amount).toLocaleString()}`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(amount));
  };

  // Helper to check if a value should be displayed (not empty/null/0)
  const shouldShow = (value) => {
    if (value === null || value === undefined || value === "") return false;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") return value.trim() !== "";
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  };

  // Helper to format field display
  const renderField = (
    label,
    value,
    formatter = (v) => v,
    hideIfEmpty = true
  ) => {
    if (hideIfEmpty && !shouldShow(value)) return null;
    const formattedValue =
      value !== null && value !== undefined ? formatter(value) : "-";
    return (
      <div>
        <span className="text-gray-500">{label}:</span> {formattedValue}
      </div>
    );
  };

  const getCountryIdLabel = (templateType) => {
    switch (templateType) {
      case "pakistan":
        return "CNIC #";
      case "colombia":
        return "Cedula #";
      case "japan":
        return "My Number";
      case "usa_1099":
      case "usa_w2":
      default:
        return "SSN #";
    }
  };

  const getCountryIdValue = (templateType, countryId = {}) => {
    if (!countryId) return "";
    if (templateType === "pakistan") return countryId.cnic || "";
    if (templateType === "colombia") return countryId.cedula || "";
    if (templateType === "japan") return countryId.myNumber || "";
    return countryId.ssn || "";
  };

  // Get country name from company
  const getCountryName = (payslip) => {
    const companyName =
      payslip?.company?.name || payslip?.employee?.company?.name || "";
    if (
      companyName.toLowerCase().includes("japan") ||
      companyName.toLowerCase().includes("osaka")
    )
      return "Japan";
    if (
      companyName.toLowerCase().includes("colombia") ||
      companyName.toLowerCase().includes("bogota")
    )
      return "Colombia";
    if (companyName.toLowerCase().includes("pakistan")) return "Pakistan";
    if (
      companyName.toLowerCase().includes("us") ||
      companyName.toLowerCase().includes("america")
    )
      return "USA";
    return "";
  };

  const downloadPayslipAsPdf = async () => {
    if (!payslipRef.current || !selectedPayslip) return;
    const node = payslipRef.current;

    try {
      const canvas = await html2canvas(node, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/png", 1.0);
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Calculate image dimensions to fit A4
      const imgWidth = pageWidth - 20; // 10mm margin on each side
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 10; // Start from top margin

      if (imgHeight <= pageHeight - 20) {
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      } else {
        // Split over multiple pages
        let heightLeft = imgHeight;
        let sourceY = 0;
        const sourceHeight = canvas.height;

        while (heightLeft > 0) {
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = canvas.width;
          pageCanvas.height = Math.min(
            canvas.height,
            ((pageHeight - 20) * canvas.width) / imgWidth
          );
          const pageCtx = pageCanvas.getContext("2d");

          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvas.width,
            pageCanvas.height,
            0,
            0,
            canvas.width,
            pageCanvas.height
          );

          const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
          pdf.addImage(
            pageImgData,
            "PNG",
            10,
            position,
            imgWidth,
            (pageCanvas.height * imgWidth) / canvas.width
          );

          heightLeft -= pageHeight - 20;
          sourceY += pageCanvas.height;

          if (heightLeft > 0) {
            pdf.addPage();
            position = 10;
          }
        }
      }

      const empCode = selectedPayslip?.employee?.employeeCode || "EMP";
      const period = selectedPayslip?.payPeriod?.startDate
        ? dayjs(selectedPayslip.payPeriod.startDate).format("YYYYMM")
        : dayjs().format("YYYYMM");
      pdf.save(`payslip_${empCode}_${period}.pdf`);
      showSuccessToast("Payslip downloaded successfully", "Success");
    } catch (e) {
      console.error("PDF generation error:", e);
      showErrorToast("Failed to generate PDF", "Error");
    }
  };

  // Fetch employees for selection
  const { data: employeesData } = useQuery({
    queryKey: ["employees-for-payslip"],
    queryFn: () => getEmployees({ limit: 1000, status: "active" }),
  });

  const employees = employeesData?.data || [];

  // Fetch payslips
  const {
    data: payslipsData,
    isLoading: payslipsLoading,
    error: payslipsError,
  } = useQuery({
    queryKey: ["payslips"],
    queryFn: () => getPayslips({ limit: 50 }),
    retry: 1,
    onError: (error) => {
      console.error("Failed to fetch payslips:", error);
      // Don't show toast here, let the UI show error state
    },
  });

  // Extract payslips from response - handle both { success: true, data: [...] } and direct array
  const payslips =
    payslipsData?.success === false
      ? []
      : payslipsData?.data || (Array.isArray(payslipsData) ? payslipsData : []);

  const filteredPayslips = hasUnderHoursOnly
    ? payslips.filter(
        (p) => Number(p?.deductions?.underHours || 0) > 0
      )
    : payslips;

  // Fetch payslip summary
  const { data: summaryData, error: summaryError } = useQuery({
    queryKey: ["payslip-summary"],
    queryFn: () => getPayslipSummary(),
    retry: 1,
    onError: (error) => {
      console.error("Failed to fetch payslip summary:", error);
      // Don't show toast here, let the UI show error state
    },
  });

  // Extract summary from response - handle both { success: true, data: {...} } and direct object
  const summary =
    summaryData?.success === false
      ? {}
      : summaryData?.data ||
        (typeof summaryData === "object" && !Array.isArray(summaryData)
          ? summaryData
          : {});

  // Generate payslip mutation
  const generatePayslipMutation = useMutation({
    mutationFn: generatePayslip,
    onSuccess: () => {
      showSuccessToast("Payslip generated successfully", "Success");
      queryClient.invalidateQueries(["payslips"]);
      queryClient.invalidateQueries(["payslip-summary"]);
      generationForm.resetFields();
      setSelectedEmployees([]);
    },
    onError: (error) => {
      showErrorToast(
        error?.response?.data?.message || "Failed to generate payslip",
        "Error"
      );
    },
  });

  // Bulk generate payslips mutation
  const bulkGenerateMutation = useMutation({
    mutationFn: bulkGeneratePayslips,
    onSuccess: (data) => {
      showSuccessToast(
        `Bulk generation completed: ${data.results.successful} successful, ${data.results.failed} failed`,
        "Success"
      );
      queryClient.invalidateQueries(["payslips"]);
      queryClient.invalidateQueries(["payslip-summary"]);
    },
    onError: (error) => {
      showErrorToast(
        error?.response?.data?.message || "Failed to generate payslips",
        "Error"
      );
    },
  });

  const handleGeneratePayslip = async (values) => {
    const { employeeId, payPeriod, templateType } = values;

    const payslipData = {
      employeeId,
      payPeriod: {
        startDate: payPeriod[0].format("YYYY-MM-DD"),
        endDate: payPeriod[1].format("YYYY-MM-DD"),
        month: payPeriod[0].month() + 1,
        year: payPeriod[0].year(),
        periodType: "monthly",
      },
      templateType,
      recalculate: false,
    };

    generatePayslipMutation.mutate(payslipData);
  };

  const handleBulkGenerate = async () => {
    if (selectedEmployees.length === 0) {
      showWarningToast("Please select employees", "Warning");
      return;
    }

    const values = generationForm.getFieldsValue();
    const { payPeriod, templateType } = values;

    const bulkData = {
      employeeIds: selectedEmployees,
      payPeriod: {
        startDate: payPeriod[0].format("YYYY-MM-DD"),
        endDate: payPeriod[1].format("YYYY-MM-DD"),
        month: payPeriod[0].month() + 1,
        year: payPeriod[0].year(),
        periodType: "monthly",
      },
      templateType,
      recalculate: false,
    };

    bulkGenerateMutation.mutate(bulkData);
  };

  const handleViewPayslip = (payslip) => {
    setSelectedPayslip(payslip);
    setPayslipModalVisible(true);
  };

  const handleDownloadPDF = async (record) => {
    // Open modal first, then user can download PDF
    setSelectedPayslip(record);
    setPayslipModalVisible(true);
  };

  const payslipColumns = [
    {
      title: "Employee",
      key: "employee",
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.employee?.fullName}</div>
          <div className="text-sm text-gray-500">
            {record.employee?.email && <span className="text-xs text-gray-500">({record.employee.email})</span>}
          </div>
        </div>
      ),
    },
    {
      title: "Pay Period",
      key: "payPeriod",
      render: (_, record) => (
        <div>
          <p className="font-medium whitespace-nowrap">
            {dayjs(record.payPeriod?.startDate).format("MMM DD")} -{" "}
            {dayjs(record.payPeriod?.endDate).format("MMM DD, YYYY")}
          </p>
          <p className="text-sm text-gray-500 whitespace-nowrap">
            {record.payPeriod?.month}/{record.payPeriod?.year}
          </p>
        </div>
      ),
    },
    {
      title: "Hours Worked",
      key: "hoursWorked",
      align: "right",
      render: (_, record) => (
        <div className="font-medium">
          {record?.earnings?.workingHours != null
            ? Number(record.earnings.workingHours).toFixed(1)
            : "-"}
        </div>
      ),
    },
    {
      title: "Monthly Salary",
      key: "monthlySalary",
      align: "right",
      render: (_, record) => {
        const currency =
          record.employee?.payroll?.currency || record.currency || "USD";
        return (
          <div className="font-medium"> {formatCurrency(record.employee?.payroll?.monthlySalary ?? 0, currency)} </div>
        );
      },
    },
    {
      title: "Under-hours",
      key: "underHours",
      align: "right",
      render: (_, record) => {
        const value = Number(record?.deductions?.underHours || 0);
        if (!value) return <span className="text-gray-400">-</span>;
        const currency =
          record.employee?.payroll?.currency || record.currency || "USD";
        return <div className="font-medium text-amber-600">{formatCurrency(value, currency)}</div>;
      },
    },
    {
      title: "Net Pay",
      key: "netPay",
      align: "right",
      render: (_, record) => {
        const currency =
          record.employee?.payroll?.currency || record.currency || "USD";
        return (
          <div className="font-medium text-green-600">
            {formatCurrency(record.netPay ?? 0, currency)}
          </div>
        );
      },
    },
    {
      title: "Currency",
      key: "currency",
      align: "center",
      render: (_, record) => (
        <Tag color="blue">{record.employee?.payroll?.currency || record.currency || "USD"}</Tag>
      ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => {
        const color =
          record.status === "generated"
            ? "blue"
            : record.status === "approved"
            ? "green"
            : record.status === "paid"
            ? "purple"
            : "orange";
        return <Tag color={color}>{record.status}</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          {/* <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewPayslip(record)}
          >
            View
          </Button> */}
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadPDF(record)}
          >
            PDF
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Row gutter={16}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Payslips"
              value={summary.totalPayslips || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Gross Pay"
              value={summary.totalGrossPay || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Total Net Pay"
              value={summary.totalNetPay || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="Average Net Pay"
              value={summary.averageNetPay || 0}
              prefix={<DollarOutlined />}
              precision={2}
            />
          </Card>
        </Col>
      </Row>

      {/* Generation Form */}
      <Card title="Generate Payslips" extra={<CalendarOutlined />}>
        <Form
          form={generationForm}
          layout="vertical"
          onFinish={handleGeneratePayslip}
        >
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                label="Employee"
                name="employeeId"
                rules={[
                  { required: true, message: "Please select an employee" },
                ]}
              >
                <Select
                  placeholder="Select employee"
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {employees.map((emp) => (
                    <Option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeCode})
                      {emp?.email && <span className="text-xs text-gray-500">({emp.email})</span>}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Pay Period"
                name="payPeriod"
                rules={[
                  { required: true, message: "Please select pay period" },
                ]}
              >
                <RangePicker style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                label="Template Type"
                name="templateType"
                rules={[
                  { required: true, message: "Please select template type" },
                ]}
                initialValue="usa_1099"
              >
                <Select>
                  <Option value="usa_1099">USA 1099</Option>
                  {/* <Option value="usa_w2">USA W2</Option> */}
                  <Option value="pakistan">Pakistan</Option>
                  <Option value="colombia">Colombia</Option>
                  <Option value="japan">Japan</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Bulk Generate (Select Multiple Employees)"
                name="bulkEmployees"
              >
                <Select
                  mode="multiple"
                  placeholder="Select employees for bulk generation"
                  value={selectedEmployees}
                  onChange={setSelectedEmployees}
                  showSearch
                  optionFilterProp="children"
                  filterOption={(input, option) =>
                    option.children
                      .toLowerCase()
                      .indexOf(input.toLowerCase()) >= 0
                  }
                >
                  {employees.map((emp) => (
                    <Option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.employeeCode})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <div className="flex items-end h-full">
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={generatePayslipMutation.isPending}
                    icon={<FileTextOutlined />}
                  >
                    Generate Single
                  </Button>
                  <Button
                    type="default"
                    onClick={handleBulkGenerate}
                    loading={bulkGenerateMutation.isPending}
                    icon={<FileTextOutlined />}
                  >
                    Bulk Generate
                  </Button>
                </Space>
              </div>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Payslips Table */}
      <Card
        title="Generated Payslips"
        extra={
          <Space>
            <span className="text-sm text-gray-600">Filter:</span>
            <Select
              size="small"
              value={hasUnderHoursOnly ? "under" : "all"}
              onChange={(v) => setHasUnderHoursOnly(v === "under")}
              style={{ width: 160 }}
            >
              <Option value="all">All Payslips</Option>
              <Option value="under">Has Under-hours</Option>
            </Select>
          </Space>
        }
      >
        {payslipsError && (
          <Alert
            message="Failed to Load Payslips"
            description={
              payslipsError?.response?.data?.message ||
              payslipsError?.message ||
              "An error occurred while fetching payslips"
            }
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            action={
              <Button
                size="small"
                onClick={() => queryClient.invalidateQueries(["payslips"])}
              >
                Retry
              </Button>
            }
          />
        )}
        <Table
          columns={payslipColumns}
          dataSource={filteredPayslips}
          loading={payslipsLoading}
          rowKey="_id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            total: payslipsData?.pagination?.total || filteredPayslips.length,
          }}
        />
      </Card>

      {/* Payslip Details Modal */}
      <Modal
        title="Payslip Details"
        open={payslipModalVisible}
        onCancel={() => setPayslipModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPayslipModalVisible(false)}>
            Close
          </Button>,
          <Button
            key="download"
            type="primary"
            icon={<DownloadOutlined />}
            onClick={downloadPayslipAsPdf}
          >
            Download PDF
          </Button>,
        ]}
        width={900}
        style={{ maxWidth: "95vw" }}
      >
        {selectedPayslip && (
          <div className="overflow-auto max-h-[80vh] flex justify-center">
            <div
              ref={payslipRef}
              className="bg-white text-black select-none"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "20mm",
                fontFamily: "Arial, sans-serif",
                maxWidth: "100%",
              }}
            >
              {/* Header with Logo and Company Info */}
              <div className="flex flex-col items-center justify-center pb-4 mb-4">
                <img
                  src="/retroventures logo.png"
                  alt="RetroVentures Logo"
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    // Fallback to logo.png if retroventures logo doesn't exist
                    e.target.src = "/logo.png";
                  }}
                />
              </div>
              <p className="text-2xl text-center font-bold text-gray-900 mb-1">
                Salary Slip
              </p>
              {selectedPayslip.payPeriod?.startDate && (
                  <div className="flex justify-center">
                    <span className="text-gray-900">
                      {dayjs(selectedPayslip.payPeriod.startDate).format(
                        "MMM DD, YYYY"
                      )}{" "}
                      -{" "}
                  {dayjs(selectedPayslip.payPeriod.endDate).format(
                    "MMM DD, YYYY"
                  )}
                  </span>
                </div>
              )}
              {/* Employee Information - PDF Fields Only */}
              <div className="mb-6">
                <div className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  Employee Information
                </div>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                        Name:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.fullName || "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                        Company:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip?.company?.name ||
                          selectedPayslip.employee?.company?.name ||
                          "-"}
                      </span>
                    </div>
                    {shouldShow(
                      getCountryIdValue(
                        selectedPayslip.templateType,
                        selectedPayslip.employee?.countryId
                      )
                    ) && (
                      <div className="flex">
                        <span className="font-semibold text-gray-700 w-32">
                          {getCountryIdLabel(selectedPayslip.templateType)}:
                        </span>
                        <span className="text-gray-900">
                          {getCountryIdValue(
                            selectedPayslip.templateType,
                            selectedPayslip.employee?.countryId
                          )}
                        </span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                        Department:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.department || "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                       Job Title:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.title || "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                        Joining Date:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.dateOfJoining
                          ? dayjs(
                              selectedPayslip.employee.dateOfJoining
                            ).format("YYYY-MM-DD")
                          : "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-32">
                        Work Location:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.workLocation || "-"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">
                        Gross Salary:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(
                          selectedPayslip?.employee?.payroll?.monthlySalary ??
                            selectedPayslip?.grossPay ??
                            selectedPayslip?.earnings?.totalEarnings ??
                            0,
                          selectedPayslip?.employee?.payroll?.currency ||
                            selectedPayslip?.currency
                        )}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">
                        Per Hour Salary:
                      </span>
                      <span className="text-gray-900 font-medium">
                        {formatCurrency(
                          selectedPayslip?.earnings?.hourlyWage ??
                            selectedPayslip?.employee?.payroll?.hourlyRate ??
                            0,
                          selectedPayslip?.employee?.payroll?.currency ||
                            selectedPayslip?.currency
                        )}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">
                        Bank Name:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.bankDetails?.bankName || "-"}
                      </span>
                    </div>
                    <div className="flex">
                      <span className="font-semibold text-gray-700 w-40">
                        IBAN #:
                      </span>
                      <span className="text-gray-900">
                        {selectedPayslip.employee?.bankDetails?.iban || "-"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div className="mb-6">
                <div className="text-lg font-bold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Deductions
                </div>
                <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                  <tbody>
                    {/* <tr>
                      <td className="py-2 px-3 text-gray-700">Income Tax</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.incomeTax || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Social Security</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.socialSecurity || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Health Insurance</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.healthInsurance || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Provident Fund</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.providentFund || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr> */}
                    {/* <tr>
                      <td className="py-2 px-3 text-gray-700">Loans</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.loans || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr> */}
                    <tr>
                      <td className="py-2 px-3 text-gray-900 font-semibold">Under-hours</td>
                      <td className="py-2 px-3 text-right text-amber-700 font-semibold">
                        {formatCurrency(selectedPayslip?.deductions?.underHours || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-gray-700">Other</td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(selectedPayslip?.deductions?.other || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                    <tr className="border-t border-gray-300">
                      <td className="py-3 px-3 text-gray-900 font-semibold">Total Deductions</td>
                      <td className="py-3 px-3 text-right text-gray-900 font-semibold">
                        {formatCurrency(selectedPayslip?.deductions?.totalDeductions || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {selectedPayslip?.calculationMetadata?.underHours && (
                  <div className="mt-3 p-3 border border-amber-300/60 bg-amber-50 rounded text-sm text-amber-900">
                    <div className="font-semibold mb-1">Under-hours Breakdown</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
                      <div>Expected Hours: <span className="font-medium">{selectedPayslip.calculationMetadata.underHours.expectedDisplayHours}</span></div>
                      <div>Worked (Display): <span className="font-medium">{selectedPayslip.calculationMetadata.underHours.actualDisplayHours}</span></div>
                      <div>Shortfall: <span className="font-medium">{selectedPayslip.calculationMetadata.underHours.shortfall}</span></div>
                      <div>Shift Hours: <span className="font-medium">{selectedPayslip.calculationMetadata.underHours.shiftHours}</span></div>
                      <div>Expected Days: <span className="font-medium">{selectedPayslip.calculationMetadata.underHours.expectedDays}</span></div>
                      <div>Under-hours Deduction: <span className="font-medium">{formatCurrency(selectedPayslip.calculationMetadata.underHours.underHoursDeduction || 0, selectedPayslip?.employee?.payroll?.currency || selectedPayslip?.currency)}</span></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Final Summary */}
              <div className="mb-6">
                <table
                  className="w-full text-sm"
                  style={{ borderCollapse: "collapse" }}
                >
                  <tbody>
                    {/* <tr>
                      <td
                        className="py-3 px-3 text-gray-900 font-semibold"
                        style={{ width: "70%" }}
                      >
                        Gross Pay
                      </td>
                      <td className="py-3 px-3 text-right text-gray-900 font-semibold text-base">
                        {formatCurrency(
                          selectedPayslip?.employee?.payroll?.monthlySalary ??
                            selectedPayslip?.grossPay ??
                            selectedPayslip?.earnings?.totalEarnings ??
                            0,
                          selectedPayslip?.employee?.payroll?.currency ||
                            selectedPayslip?.currency
                        )}
                      </td>
                    </tr> */}
                    {/* <tr>
                      <td className="py-2 px-3 text-gray-700">
                        Total Deductions
                      </td>
                      <td className="py-2 px-3 text-right text-gray-900">
                        {formatCurrency(
                          selectedPayslip.deductions?.totalDeductions ?? 0,
                          selectedPayslip?.employee?.payroll?.currency ||
                            selectedPayslip?.currency
                        )}
                      </td>
                    </tr> */}
                    <tr className="border-t border-gray-400">
                      <td className="py-4 px-3 text-xl font-bold text-gray-900">
                        Net Salary
                      </td>
                      <td className="py-4 px-3 text-right text-2xl font-bold text-emerald-600">
                        {formatCurrency(
                          selectedPayslip?.employee?.payroll?.monthlySalary ??
                            selectedPayslip?.grossPay ??
                            selectedPayslip?.earnings?.totalEarnings ??
                            0 -
                              (selectedPayslip.deductions?.totalDeductions ??
                                0),
                          selectedPayslip?.employee?.payroll?.currency ||
                            selectedPayslip?.currency
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-4 border-t border-gray-300 text-xs text-gray-600 text-center">
                <p className="mb-2">
                  This is a system generated payslip and does not require any
                  signature except stamp for validation.
                </p>
                <p>Generated by RetroVentures</p>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PayslipGenerator;
