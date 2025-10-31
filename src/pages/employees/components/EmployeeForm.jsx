import React, { useState, useEffect } from "react";
import {
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
  message,
  Spin,
  Radio,
} from "antd";
import {
  SaveOutlined,
  CloseOutlined,
  ArrowLeftOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useQuery } from "@tanstack/react-query";
import { fetchCompanies } from "../../../api/company";

const { Option } = Select;
const { TextArea } = Input;

const EmployeeForm = ({ employee, onSubmit, onCancel, loading = false }) => {
  const [form] = Form.useForm();
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedCountryFromDropdown, setSelectedCountryFromDropdown] =
    useState(null);
  const [paymentType, setPaymentType] = useState("hourly"); // "monthly" or "hourly"

  // Form persistence key
  const FORM_STORAGE_KEY = "employee_form_draft";

  // Save form data to localStorage
  const saveFormData = (formData) => {
    try {
      localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(formData));
    } catch (error) {
      console.warn("Failed to save form data to localStorage:", error);
    }
  };

  // Load form data from localStorage
  const loadFormData = () => {
    try {
      const savedData = localStorage.getItem(FORM_STORAGE_KEY);
      return savedData ? JSON.parse(savedData) : null;
    } catch (error) {
      console.warn("Failed to load form data from localStorage:", error);
      return null;
    }
  };

  // Clear form data from localStorage
  const clearFormData = () => {
    try {
      localStorage.removeItem(FORM_STORAGE_KEY);
    } catch (error) {
      console.warn("Failed to clear form data from localStorage:", error);
    }
  };

  // Handle form values change for persistence
  const handleFormValuesChange = (changedValues, allValues) => {
    // Sync paymentType state when form changes
    if (changedValues.paymentType !== undefined) {
      setPaymentType(changedValues.paymentType);
    }
    // Only save if not editing existing employee
    if (!employee) {
      saveFormData(allValues);
    }
  };

  // Handle cancel with form data clearing
  const handleCancel = () => {
    clearFormData();
    onCancel();
  };


  useEffect(() => {
    if (employee) {
      // Determine payment type based on what's set (monthly takes priority)
      const hasMonthlySalary = employee.payroll?.monthlySalary && employee.payroll.monthlySalary > 0;
      const hasHourlyRate = employee.payroll?.hourlyRate && employee.payroll.hourlyRate > 0;
      const initialPaymentType = hasMonthlySalary ? "monthly" : (hasHourlyRate ? "hourly" : "hourly");
      setPaymentType(initialPaymentType);

      form.setFieldsValue({
        fullName: employee.fullName,
        email: employee.email,
        phone: employee.phone,
        street: employee.address?.street || "",
        city: employee.address?.city || "",
        state: employee.address?.state || "",
        postalCode: employee.address?.postalCode || "",
        country: employee.address?.country || "",
        dateOfBirth: employee.dateOfBirth ? dayjs(employee.dateOfBirth) : null,
        gender: employee.gender,
        maritalStatus: employee.maritalStatus,
        cnic: employee.countryId?.cnic,
        ssn: employee.countryId?.ssn,
        cedula: employee.countryId?.cedula,
        myNumber: employee.countryId?.myNumber,
        company:
          typeof employee.company === "object"
            ? employee.company._id
            : employee.company,
        department: employee.department,
        title: employee.title,
        designation: employee.designation,
        dateOfJoining: employee.dateOfJoining
          ? dayjs(employee.dateOfJoining)
          : null,
        workLocation: employee.workLocation,
        employmentType: employee.employmentType || "full-time",
        status: employee.status,
        bankName: employee.bankDetails?.bankName,
        accountNumber: employee.bankDetails?.accountNumber,
        iban: employee.bankDetails?.iban,
        hourlyRate: employee.payroll?.hourlyRate,
        monthlySalary: employee.payroll?.monthlySalary,
        currency: employee.payroll?.currency,
        payFrequency: employee.payroll?.payFrequency || "monthly",
        paymentType: initialPaymentType,
        emergencyName: employee.emergencyContact?.name,
        emergencyRelationship: employee.emergencyContact?.relationship,
        emergencyPhone: employee.emergencyContact?.phone,
        emergencyEmail: employee.emergencyContact?.email,
      });
    } else {
      // Creating new employee - try to load saved draft
      const savedData = loadFormData();
      if (savedData) {
        // Convert date strings back to dayjs objects
        const formData = { ...savedData };
        if (formData.dateOfBirth) {
          formData.dateOfBirth = dayjs(formData.dateOfBirth);
        }
        if (formData.dateOfJoining) {
          formData.dateOfJoining = dayjs(formData.dateOfJoining);
        }

        form.setFieldsValue(formData);

        // Set country states based on saved data
        if (formData.country) {
          setSelectedCountryFromDropdown(formData.country);
        }
        // Set payment type if saved
        if (formData.paymentType) {
          setPaymentType(formData.paymentType);
        } else {
          // Determine from saved data
          const hasMonthly = formData.monthlySalary && formData.monthlySalary > 0;
          const hasHourly = formData.hourlyRate && formData.hourlyRate > 0;
          setPaymentType(hasMonthly ? "monthly" : (hasHourly ? "hourly" : "hourly"));
        }
      } else {
        form.resetFields();
      }
    }
  }, [employee, form]);

  const handleSubmit = async (values) => {
    try {
      const employeeData = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone,
        address: {
          street: values.street || "",
          city: values.city || "",
          state: values.state || "",
          postalCode: values.postalCode || "",
          country: values.country || "",
        },
        dateOfBirth: values.dateOfBirth?.format("YYYY-MM-DD"),
        gender: values.gender,
        maritalStatus: values.maritalStatus,
        countryId: {
          cnic: values.cnic || "",
          ssn: values.ssn || "",
          cedula: values.cedula || "",
          myNumber: values.myNumber || "",
        },
        company: values.company,
        department: values.department,
        title: values.title,
        designation: values.designation,
        dateOfJoining: values.dateOfJoining?.format("YYYY-MM-DD"),
        workLocation: values.workLocation,
        employmentType: values.employmentType || "full-time",
        status: values.status || "active",
        bankDetails: {
          bankName: values.bankName || "",
          accountNumber: values.accountNumber || "",
          iban: values.iban || "",
        },
        payroll: {
          // Only send the relevant field based on payment type
          hourlyRate: paymentType === "hourly" ? (parseFloat(values.hourlyRate) || 0) : null,
          monthlySalary: paymentType === "monthly" ? (parseFloat(values.monthlySalary) || 0) : null,
          currency: values.currency || "USD",
          payFrequency: values.payFrequency || "monthly",
          allowances: {
            transport: 0,
            meal: 0,
            housing: 0,
            medical: 0,
            other: 0,
          },
          payrollEnabled: true,
        },
        emergencyContact: {
          name: values.emergencyName || "",
          relationship: values.emergencyRelationship || "",
          phone: values.emergencyPhone || "",
          email: values.emergencyEmail || "",
        },
      };

      await onSubmit(employeeData);

      // Clear saved form data on successful submission
      clearFormData();
    } catch (error) {
      console.error("Form submission error:", error);
    }
  };

  // Countries dropdown options
  const countries = [
    { value: "Pakistan", label: "Pakistan", code: "PK" },
    { value: "USA", label: "United States", code: "US" },
    { value: "Colombia", label: "Colombia", code: "CO" },
    { value: "Japan", label: "Japan", code: "JP" },
  ];

  // Extract country from company name
  const getCountryFromCompanyName = (companyName) => {
    if (!companyName) return null;
    const name = companyName.toLowerCase();
    if (name.includes("colombia") || name.includes("bogota")) return "Colombia";
    if (name.includes("usa") || name.includes("us") || name.includes("america"))
      return "USA";
    if (
      name.includes("japan") ||
      name.includes("tokyo") ||
      name.includes("osaka")
    )
      return "Japan";
    if (
      name.includes("pakistan") ||
      name.includes("karachi") ||
      name.includes("lahore")
    )
      return "Pakistan";
    return null;
  };

  // Fetch companies from API
  const {
    data: companiesData,
    isLoading: companiesLoading,
    error: companiesError,
  } = useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      console.log("Fetching companies...");
      const result = await fetchCompanies();
      console.log("Companies API result:", result);
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process companies data - handle both array and object response
  const allCompanies = React.useMemo(() => {
    console.log("Companies data received:", companiesData);

    if (!companiesData) {
      console.log("No companies data");
      return [];
    }

    // Handle if companiesData is already an array
    if (Array.isArray(companiesData)) {
      console.log("Companies data is array, processing:", companiesData);
      return companiesData.map((company) => ({
        value: company._id,
        label: company.name,
        country: getCountryFromCompanyName(company.name),
      }));
    }

    // Handle if companiesData has a companies property
    if (companiesData.companies && Array.isArray(companiesData.companies)) {
      console.log(
        "Companies data has companies property, processing:",
        companiesData.companies
      );
      return companiesData.companies.map((company) => ({
        value: company._id,
        label: company.name,
        country: getCountryFromCompanyName(company.name),
      }));
    }

    console.log("No valid companies data structure found");
    return [];
  }, [companiesData]);

  // Get country from selected company
  const getCountryFromCompany = (companyId) => {
    const company = allCompanies.find((c) => c.value === companyId);
    return company ? company.country : null;
  };

  // Handle company change to update country
  const handleCompanyChange = (companyId) => {
    const country = getCountryFromCompany(companyId);
    setSelectedCountry(country);

    // Auto-select currency based on country
    let defaultCurrency = "USD";
    if (country === "Colombia") defaultCurrency = "COP";
    else if (country === "Japan") defaultCurrency = "JPY";
    else if (country === "Pakistan") defaultCurrency = "PKR";

    // Auto-fill country in address
    form.setFieldsValue({
      currency: defaultCurrency,
      country: country,
    });
  };

  // Handle country dropdown change
  const handleCountryChange = (country) => {
    setSelectedCountryFromDropdown(country);

    // Auto-select currency based on country
    let defaultCurrency = "USD";
    if (country === "Colombia") defaultCurrency = "COP";
    else if (country === "Japan") defaultCurrency = "JPY";
    else if (country === "Pakistan") defaultCurrency = "PKR";

    // Auto-fill country in address and currency
    form.setFieldsValue({
      currency: defaultCurrency,
      country: country,
    });
  };

  // Get the effective country (from dropdown or company)
  const getEffectiveCountry = () => {
    return selectedCountryFromDropdown || selectedCountry;
  };

  const currencies = [
    { value: "USD", label: "USD - US Dollar" },
    { value: "COP", label: "COP - Colombian Peso" },
    { value: "JPY", label: "JPY - Japanese Yen" },
    { value: "PKR", label: "PKR - Pakistani Rupee" },
  ];

  // Initialize country when editing existing employee
  useEffect(() => {
    if (employee && employee.company) {
      const companyId =
        typeof employee.company === "object"
          ? employee.company._id
          : employee.company;
      const country = getCountryFromCompany(companyId);
      setSelectedCountry(country);
    }

    // Also set country from address if available
    if (employee && employee.address?.country) {
      setSelectedCountryFromDropdown(employee.address.country);
    }
  }, [employee]);

  // Show loading spinner while companies are loading
  if (companiesLoading) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <Spin size="large" />
        <div style={{ marginTop: "16px" }}>Loading companies...</div>
      </div>
    );
  }

  // Show error if companies failed to load
  if (companiesError) {
    return (
      <div style={{ textAlign: "center", padding: "50px" }}>
        <div style={{ color: "red", marginBottom: "16px" }}>
          Failed to load companies. Please try again.
        </div>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
         <div className="flex items-center gap-2">
           <Button icon={<ArrowLeftOutlined />} onClick={onCancel}>
             Back to List
           </Button>
        </div>
      </div>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        onValuesChange={handleFormValuesChange}
        scrollToFirstError
      >
        <Row gutter={[24, 24]}>
          {/* Personal Information */}
          <Col xs={24} lg={12}>
            <Card title="Personal Information" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item
                    name="fullName"
                    label="Full Name"
                    rules={[
                      { required: true, message: "Please enter full name" },
                    ]}
                  >
                    <Input placeholder="Enter full name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="email"
                    label="Email"
                    rules={[
                      { required: true, message: "Please enter email" },
                      { type: "email", message: "Please enter valid email" },
                    ]}
                  >
                    <Input placeholder="Enter email address" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="phone"
                    label="Phone"
                    rules={[
                      { required: true, message: "Please enter phone number" },
                    ]}
                  >
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="street" label="Street Address">
                    <Input placeholder="Enter street address" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="city" label="City">
                    <Input placeholder="Enter city" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="state" label="State/Province">
                    <Input placeholder="Enter state/province" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="postalCode" label="Postal Code">
                    <Input placeholder="Enter postal code" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item
                    name="country"
                    label="Country"
                    rules={[
                      { required: true, message: "Please select country" },
                    ]}
                  >
                    <Select
                      placeholder="Select country"
                      onChange={handleCountryChange}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children
                          .toLowerCase()
                          .indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {countries.map((country) => (
                        <Option key={country.value} value={country.value}>
                          {country.label} ({country.code})
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8}>
                  <Form.Item name="dateOfBirth" label="Date of Birth">
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={[24, 24]} className="mt-4">
                {/* Dynamic Country-Specific ID Fields */}
                {getEffectiveCountry() === "USA" && (
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="ssn"
                      label="SSN (Social Security Number)"
                      rules={[
                        {
                          pattern: /^\d{3}-\d{2}-\d{4}$/,
                          message:
                            "Please enter valid SSN format (123-45-6789)",
                        },
                      ]}
                    >
                      <Input placeholder="123-45-6789" />
                    </Form.Item>
                  </Col>
                )}

                {getEffectiveCountry() === "Pakistan" && (
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="cnic"
                      label="CNIC (Computerized National Identity Card)"
                      rules={[
                        {
                          pattern: /^\d{5}-\d{7}-\d{1}$/,
                          message:
                            "Please enter valid CNIC format (12345-1234567-1)",
                        },
                      ]}
                    >
                      <Input placeholder="12345-1234567-1" />
                    </Form.Item>
                  </Col>
                )}

                {getEffectiveCountry() === "Colombia" && (
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="cedula"
                      label="Cédula de Ciudadanía"
                      rules={[
                        {
                          pattern: /^\d{6,10}$/,
                          message: "Please enter valid Cédula (6-10 digits)",
                        },
                      ]}
                    >
                      <Input placeholder="12345678" />
                    </Form.Item>
                  </Col>
                )}

                {getEffectiveCountry() === "Japan" && (
                  <Col xs={24} sm={24}>
                    <Form.Item
                      name="myNumber"
                      label="My Number (個人番号)"
                      rules={[
                        {
                          pattern: /^\d{12}$/,
                          message: "Please enter valid My Number (12 digits)",
                        },
                      ]}
                    >
                      <Input placeholder="123456789012" />
                    </Form.Item>
                  </Col>
                )}
              </Row>
              <Row gutter={[24, 24]} className="mt-4">
                <Col xs={24} sm={12}>
                  <Form.Item name="gender" label="Gender">
                    <Select placeholder="Select gender">
                      <Option value="male">Male</Option>
                      <Option value="female">Female</Option>
                      <Option value="other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
                {/* <Col xs={24} sm={12}>
                <Form.Item name="maritalStatus" label="Marital Status">
                  <Select placeholder="Select status">
                    <Option value="single">Single</Option>
                    <Option value="married">Married</Option>
                    <Option value="divorced">Divorced</Option>
                    <Option value="widowed">Widowed</Option>
                  </Select>
                </Form.Item>
              </Col> */}
              </Row>

              {/* Country Indicator */}
              {/* {getEffectiveCountry() ? (
                 <Col xs={24}>
                   <div style={{ 
                     padding: '8px 12px', 
                     backgroundColor: '#e6f7ff', 
                     border: '1px solid #91d5ff', 
                     borderRadius: '6px',
                     marginBottom: '16px',
                     fontSize: '14px',
                     color: '#1890ff'
                   }}>
                     <strong>Selected Country: {getEffectiveCountry()}</strong>
                     {getEffectiveCountry() === 'USA' && ' - SSN field will be shown below'}
                     {getEffectiveCountry() === 'Pakistan' && ' - CNIC field will be shown below'}
                     {getEffectiveCountry() === 'Colombia' && ' - Cédula field will be shown below'}
                     {getEffectiveCountry() === 'Japan' && ' - My Number field will be shown below'}
                   </div>
                 </Col>
               ) : (
                 <Col xs={24}>
                   <div style={{ 
                     padding: '8px 12px', 
                     backgroundColor: '#fff7e6', 
                     border: '1px solid #ffd591', 
                     borderRadius: '6px',
                     marginBottom: '16px',
                     fontSize: '14px',
                     color: '#d46b08'
                   }}>
                     <strong>Please select a country to see country-specific ID fields</strong>
                   </div>
                 </Col>
               )} */}
            </Card>
          </Col>

          {/* Employment Information */}
          <Col xs={24} lg={12}>
            <Card title="Employment Information" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="company"
                    label="Company"
                    rules={[
                      { required: true, message: "Please select company" },
                    ]}
                  >
                    <Select
                      placeholder={
                        companiesLoading
                          ? "Loading companies..."
                          : "Select company"
                      }
                      onChange={handleCompanyChange}
                      loading={companiesLoading}
                      disabled={companiesLoading}
                      showSearch
                      optionFilterProp="children"
                      filterOption={(input, option) =>
                        option.children
                          .toLowerCase()
                          .indexOf(input.toLowerCase()) >= 0
                      }
                    >
                      {allCompanies.map((company) => (
                        <Option key={company.value} value={company.value}>
                          {company.label}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="department"
                    label="Department"
                    rules={[
                      { required: true, message: "Please select department" },
                    ]}
                  >
                    <Select placeholder="Select department">
                      <Option value="IT">Information Technology</Option>
                      <Option value="HR">Human Resources</Option>
                      <Option value="Finance">Finance</Option>
                      <Option value="Operations">Operations</Option>
                      <Option value="Sales">Sales</Option>
                      <Option value="Marketing">Marketing</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="title"
                    label="Job Title"
                    rules={[
                      { required: true, message: "Please enter job title" },
                    ]}
                  >
                    <Input placeholder="Enter job title" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="designation" label="Designation">
                    <Input placeholder="Enter designation" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="dateOfJoining"
                    label="Date of Joining"
                    rules={[
                      { required: true, message: "Please select joining date" },
                    ]}
                  >
                    <DatePicker style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="employmentType" label="Employment Type">
                    <Select placeholder="Select type">
                      <Option value="full-time">Full Time</Option>
                      <Option value="part-time">Part Time</Option>
                      <Option value="contract">Contract</Option>
                      <Option value="intern">Intern</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="workLocation" label="Work Location">
                    <Input placeholder="Enter work location" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Payroll Information */}
          <Col xs={24} lg={12}>
            <Card title="Payroll Information" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <Form.Item
                    name="paymentType"
                    label="Payment Type"
                    initialValue="hourly"
                    rules={[
                      { required: true, message: "Please select payment type" },
                    ]}
                  >
                    <Radio.Group
                      onChange={(e) => {
                        setPaymentType(e.target.value);
                        // Clear the opposite field when switching
                        if (e.target.value === "monthly") {
                          form.setFieldsValue({ hourlyRate: null });
                        } else {
                          form.setFieldsValue({ monthlySalary: null });
                        }
                      }}
                    >
                      <Radio value="hourly">Hourly Rate</Radio>
                      <Radio value="monthly">Monthly Salary</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                {paymentType === "hourly" && (
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="hourlyRate"
                      label="Hourly Rate"
                      rules={[
                        { required: true, message: "Please enter hourly rate" },
                      ]}
                    >
                      <InputNumber
                        placeholder="Enter hourly rate"
                        style={{ width: "100%" }}
                        step={0.01}
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                  </Col>
                )}
                {paymentType === "monthly" && (
                  <>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="monthlySalary"
                        label="Monthly Salary"
                        rules={[
                          { required: true, message: "Please enter monthly salary" },
                        ]}
                      >
                        <InputNumber
                          placeholder="Enter monthly salary"
                          style={{ width: "100%" }}
                          step={0.01}
                          min={0}
                          precision={2}
                        />
                      </Form.Item>
                    </Col>
                  </>
                )}
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="currency"
                    label="Currency"
                    rules={[
                      { required: true, message: "Please select currency" },
                    ]}
                  >
                    <Select placeholder="Select currency">
                      {(() => {
                        // Filter currencies based on selected country
                        const effectiveCountry = getEffectiveCountry();
                        let availableCurrencies = currencies;
                        if (effectiveCountry === "USA") {
                          availableCurrencies = currencies.filter(
                            (c) => c.value === "USD"
                          );
                        } else if (effectiveCountry === "Colombia") {
                          availableCurrencies = currencies.filter(
                            (c) => c.value === "COP"
                          );
                        } else if (effectiveCountry === "Japan") {
                          availableCurrencies = currencies.filter(
                            (c) => c.value === "JPY"
                          );
                        } else if (effectiveCountry === "Pakistan") {
                          availableCurrencies = currencies.filter(
                            (c) => c.value === "PKR"
                          );
                        }

                        return availableCurrencies.map((currency) => (
                          <Option key={currency.value} value={currency.value}>
                            {currency.label}
                          </Option>
                        ));
                      })()}
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="payFrequency"
                    label="Pay Frequency"
                    initialValue="monthly"
                    rules={[
                      { required: true, message: "Please select pay frequency" },
                    ]}
                  >
                    <Select placeholder="Select pay frequency">
                      <Option value="monthly">Monthly</Option>
                      <Option value="bi-weekly">Bi-weekly</Option>
                      <Option value="weekly">Weekly</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Bank Details */}
          <Col xs={24} lg={12}>
            <Card title="Bank Details" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="bankName" label="Bank Name">
                    <Input placeholder="Enter bank name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="accountNumber" label="Account Number">
                    <Input placeholder="Enter account number" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="iban" label="IBAN">
                    <Input placeholder="Enter IBAN" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>

          {/* Emergency Contact */}
          <Col xs={24} lg={12}>
            <Card title="Emergency Contact" size="small">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item name="emergencyName" label="Contact Name">
                    <Input placeholder="Enter emergency contact name" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="emergencyRelationship" label="Relationship">
                    <Select placeholder="Select relationship">
                      <Option value="spouse">Spouse</Option>
                      <Option value="parent">Parent</Option>
                      <Option value="sibling">Sibling</Option>
                      <Option value="friend">Friend</Option>
                      <Option value="other">Other</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="emergencyPhone" label="Phone Number">
                    <Input placeholder="Enter phone number" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item name="emergencyEmail" label="Email">
                    <Input placeholder="Enter email address" />
                  </Form.Item>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>

        {/* Form Actions */}
        <div style={{ marginTop: 24, textAlign: "right" }}>
          <Space>
            <Button
              onClick={handleCancel}
              icon={<CloseOutlined />}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              disabled={loading}
              icon={<SaveOutlined />}
            >
              {loading
                ? "Saving..."
                : employee
                ? "Update Employee"
                : "Create Employee"}
            </Button>
          </Space>
        </div>
      </Form>
    </div>
  );
};

export default EmployeeForm;
