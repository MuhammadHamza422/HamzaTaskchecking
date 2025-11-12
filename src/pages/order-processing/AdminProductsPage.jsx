import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import {
  Table,
  Button,
  Input,
  Typography,
  Empty,
  message,
  Tag,
  Select,
  Row,
  Col,
  Modal,
  Form,
  InputNumber,
  Switch,
  Space,
  Tooltip,
} from "antd";
import { AlertTriangle } from "lucide-react";
import { debounce } from "lodash";
import { motion as Motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { importCSV } from "../../api/products";
import {
  getProducts,
  createProduct,
  deleteProduct,
  updateProduct,
} from "../../api/warehouse";
import useFullscreen from "../../components/useFullscreen";
import CreatableSelect from "react-select/creatable";
import apiClient from "../../api/client";

const { Search } = Input;
const { Title, Text } = Typography;
const { Option } = Select;

const typeOptions = ["CON", "HAN", "GAM", "ACC"];
const TYPE_CODE_LABELS = {
  CON: "Consoles",
  HAN: "Handhelds",
  ACC: "Accessories",
  GAM: "Games",
};
const brandOptions = [
  "NIN",
  "SNY",
  "MSF",
  "SEG",
  "RET",
  "COL",
  "ATR",
  "INT",
  "SNV",
  "NEC",
];

const conditionOptions = [
  { value: "N", label: "New" },
  { value: "R", label: "Refurbished" },
  { value: "U", label: "Used" },
];

const ColorCode2 = [
  "WHT",
  "STD",
  "BLK",
  "GRY",
  "GWH",
  "GLD",
  "RED",
  "BLU",
  "MBK",
  "SIL",
  "GRD",
  "CRY",
  "ORG",
  "JGR",
  "AZB",
  "IND",
  "ORYL",
  "GRN",
  "CHR",
  "PNK",
  "IBL",
  "TRQ",
  "CRL",
  "YLW",
  "MGR",
  "TGR",
  "BGL",
  "SFG",
  "COR",
  "ABL",
  "SBL",
  "MLR",
  "HGF",
  "EBX",
  "CMW",
  "MSV",
  "PNB",
  "ISV",
  "NPK",
  "PWX",
  "CMP",
  "NEX",
  "NBL",
  "WBL",
  "RDBK",
  "WHBK",
  "BKTQ",
  "BLMR",
  "GRE",
  "FBLU",
  "LVDR",
  "BRN",
  "DVK",
  "RSI",
  "CLR",
  "NRB",
  "YBG",
  "GGE",
  "OMR",
  "SLV",
  "FHK",
  "APX",
  "REG",
  "RBR",
  "TRX",
  "SLB",
  "MGN",
  "PYE",
  "PBR",
  "GBK",
  "FEA",
  "MHU",
  "ACR",
  "GPE",
  "KWI",
  "DDL",
  "WTM",
  "BRY",
  "TEA",
  "ONX",
  "NES",
  "PPX",
  "TRB",
  "SRE",
  "SSP",
  "PUY",
  "ZGT",
  "KGH",
  "GCR",
  "CBL",
  "GPH",
  "PBL",
  "RBY",
  "SPH",
  "EMX",
  "JDX",
  "ARX",
  "BYJ",
  "MHR",
  "PJD",
  "MOD",
  "MBU",
  "MBL",
  "LGR",
  "OYW",
  "ZMG",
  "FEF",
  "PSM",
  "SNE",
  "XRD",
  "CHB",
  "LFB",
  "BLT",
  "BLG",
  "WOR",
  "WHL",
  "PSI",
  "PBE",
  "HSE",
  "MCE",
  "MKP",
  "BRG",
  "BRZ",
  "LME",
  "CCL",
  "OXB",
  "FLR",
  "CRP",
  "MPK",
  "CBK",
  "EML",
  "CMT",
  "CRD",
  "CGY",
  "NVY",
  "KKI",
  "BBRD",
  "CWT",
  "LGW",
  "LBW",
  "NOR",
  "MDH",
  "MRD",
  "MDP",
  "MIW",
  "MCB",
  "GLP",
  "LTB",
  "BGF",
  "BKB",
  "WHR",
  "RWT",
  "BBL",
  "GBL",
  "EBC",
  "RAS",
  "CIB",
  "LBL",
  "TPRL",
  "YEL",
  "YOS",
  "SMA",
  "PCH",
  "MAR",
  "PIK",
  "GRB",
  "STR",
  "KIW",
  "GRP",
  "DND",
  "ATP",
  "PUR",
  "500M",
  "CKHK",
  "PRP",
  "CLB",
];

const AdminProductsPage = () => {
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const { ref: fullscreenRef, isFullscreen, getContainer } = useFullscreen();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModal, setIsEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colorCode, setColorCode] = useState(null);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [quickForm] = Form.useForm();

  const options = ColorCode2.map((color) => ({
    value: color,
    label: color,
  }));

  console.log(colorCode);

  // Filter states
  const [filters, setFilters] = useState({
    type: null,
  });

  // Create debounced search function
  const debouncedSearch = useMemo(
    () =>
      debounce((searchValue) => {
        setSearch(searchValue);
        setPage(1); // Reset to first page when searching
      }, 300),
    [setSearch, setPage]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  // Handle search change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", page, limit, search, filters.type],
    queryFn: () =>
      getProducts({
        page,
        limit,
        search,
        type: filters.type,
      }),
    keepPreviousData: true,
  });

  // Check if product has missing fields
  const checkMissingFields = (product) => {
    const missingFields = [];
    
    // Check required/important fields
    if (!product?.pro_title || product.pro_title.trim() === "") {
      missingFields.push("Product Title");
    }
    if (!product?.sku || product.sku.trim() === "") {
      missingFields.push("SKU");
    }
    if (!product?.type_code || product.type_code.trim() === "") {
      missingFields.push("Type Code");
    }
    if (!product?.brnd_code || product.brnd_code.trim() === "") {
      missingFields.push("Brand Code");
    }
    if (!product?.model_code || product.model_code.trim() === "") {
      missingFields.push("Model Code");
    }
    if (!product?.sale_price || product.sale_price === 0) {
      missingFields.push("Sale Price");
    }
    if (!product?.cnd_code || product.cnd_code.trim() === "") {
      missingFields.push("Condition Code");
    }
    
    return missingFields;
  };

  // Check if SKU ends with XXXXX
  const hasIncompleteSKU = (sku) => {
    if (!sku) return false;
    const skuStr = String(sku).toUpperCase();
    return skuStr.endsWith("XXXXX") || skuStr.endsWith("XXXX");
  };

  // Validate SKU format: TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID
  // Example: GAM-NIN-DS-INK-STD-U-410378
  // Format should be: TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID (7 parts)
  // Minimum acceptable: TYPE-BRAND-UID (3 parts)
  const validateSKUFormat = (product) => {
    if (!product?.sku || product.sku.trim() === "") {
      return { isValid: false, reason: "SKU is missing" };
    }

    const sku = String(product.sku).trim();
    const parts = sku.split("-");

    // Check for empty parts (double hyphens or leading/trailing hyphens)
    if (parts.some((part) => part.trim() === "")) {
      return {
        isValid: false,
        reason: "SKU contains empty parts (double hyphens or leading/trailing hyphens)",
      };
    }

    // SKU should have at least 3 parts (minimum: TYPE-BRAND-UID)
    // Ideal format has 7 parts: TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID
    if (parts.length < 3) {
      return {
        isValid: false,
        reason: `SKU has too few parts: Expected format TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID (got ${parts.length} parts, minimum 3 required)`,
      };
    }

    // Warn if SKU has more than 7 parts (might be incorrect)
    if (parts.length > 7) {
      return {
        isValid: false,
        reason: `SKU has too many parts: Expected 7 parts (TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID), got ${parts.length}`,
      };
    }

    // Validate structure: Check if first part matches type_code (if available)
    if (product.type_code && parts[0] !== product.type_code) {
      return {
        isValid: false,
        reason: `First part (${parts[0]}) should match Type Code (${product.type_code})`,
      };
    }

    // Validate structure: Check if second part matches brand_code (if available)
    if (product.brnd_code && parts.length > 1 && parts[1] !== product.brnd_code) {
      return {
        isValid: false,
        reason: `Second part (${parts[1]}) should match Brand Code (${product.brnd_code})`,
      };
    }

    // Validate structure: Last part should be UID (if available)
    if (product.uid && parts.length > 0) {
      const lastPart = parts[parts.length - 1];
      if (lastPart !== product.uid) {
        return {
          isValid: false,
          reason: `Last part (${lastPart}) should match UID (${product.uid})`,
        };
      }
    }

    // If SKU has 4-6 parts, it's incomplete but might be acceptable
    // Only flag as invalid if it's clearly wrong (wrong first/last parts)
    if (parts.length >= 3 && parts.length < 7) {
      // This is a warning, not an error - partial SKU is acceptable
      return { isValid: true, reason: null };
    }

    return { isValid: true, reason: null };
  };

  const products = useMemo(() => {
    if (!data) return [];
    const list = Array.isArray(data?.products) ? data.products : [];

    return list.map((p) => {
      const rawType = String(p?.type_code || "").toUpperCase();
      const missingFields = checkMissingFields(p);
      const incompleteSKU = hasIncompleteSKU(p?.sku);
      const skuValidation = validateSKUFormat(p);
      const invalidSKUFormat = !skuValidation.isValid;
      
      return {
        id: p._id || p?.id,
        _id: p._id || p?.id, // Ensure _id is available for rowKey
        uid: p?.uid,
        wc_id: p?.wc_id,
        pro_title: p?.pro_title,
        sku: p?.sku,
        model_code: p?.model_code,
        type_code: p?.type_code,
        type_name: TYPE_CODE_LABELS[rawType] || p?.type_code || "",
        brnd_code: p?.brnd_code,
        storage_code: p?.storage_code,
        color_code: p?.color_code,
        sale_price: p?.sale_price,
        price: p?.price,
        regular_price: p?.regular_price,
        cnd_code: p?.cnd_code,
        is_storable: p?.is_storable,
        seller_ids: p?.seller_ids,
        missingFields,
        incompleteSKU,
        invalidSKUFormat,
        skuValidationReason: skuValidation.reason,
        hasWarnings: missingFields.length > 0 || incompleteSKU || invalidSKUFormat,
      };
    });
  }, [data]);

  const total = data?.totalProducts || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => ({
      ...prev,
      [filterType]: value,
    }));
    setPage(1); // Reset to first page when filtering
  };

  // Handle filter reset
  const handleFilterReset = () => {
    setFilters({
      type: null,
    });
    setPage(1);
  };

  const handleOpenQuickCreate = () => {
    quickForm.resetFields();
    quickForm.setFieldsValue({
      uid: "",
      pro_title: search || "",
    });
    setQuickCreateOpen(true);
  };

  const handleQuickCreate = async () => {
    try {
      const values = await quickForm.validateFields();
      setQuickCreateLoading(true);

      const payload = {
        uid: values.uid.trim(),
        pro_title: values.pro_title.trim(),
        sku: values.sku ? values.sku.trim() : undefined,
      };

      const { data: response } = await apiClient.post(
        "/api/v1/products/quick-create",
        payload
      );

      if (response?.success) {
        message.success("Product created successfully!");
        setQuickCreateOpen(false);
        quickForm.resetFields();
        setSearch(values.pro_title.trim());
        setPage(1);
        await refetch();
      }
    } catch (error) {
      if (error?.errorFields) {
        return;
      }
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create product";
      message.error(msg);
    } finally {
      setQuickCreateLoading(false);
    }
  };

  // Handle CSV file upload
  const handleCSVUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      message.error("Please select a CSV file");
      return;
    }

    setUploading(true);

    try {
      const result = await importCSV(file);
      console.log("result", result);
      // Show success message
      Swal.fire({
        icon: "success",
        title: "CSV Import Successful!",
        text: result.message || "Products have been imported successfully",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: "#10b981",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });

      // Refresh the product list
      refetch();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Import Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "Failed to import CSV file",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handle Import CSV button click
  const handleImportCSVClick = () => {
    fileInputRef.current?.click();
  };

  const handleCreateProduct = async (values) => {
    setIsSubmitting(true);
    try {
      if (isEditModal && editingProduct) {
        // Update existing product
        await updateProduct(editingProduct._id, {
          values,
          color_code: colorCode,
        });

        // Show success message
        Swal.fire({
          icon: "success",
          title: "Product Updated!",
          text: "Product has been updated successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
      } else {
        // Create new product with is_storable set to false by default
        const productData = {
          ...values,
          color_code: colorCode,
          is_storable: false,
        };
        await createProduct(productData);

        // Show success message
        Swal.fire({
          icon: "success",
          title: "Product Created!",
          text: "Product has been created successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
      }

      // Reset form and close modal
      form.resetFields();
      setIsModalOpen(false);
      setIsEditModal(false);
      setEditingProduct(null);

      // Refresh the product list
      refetch();
    } catch (error) {
      const action = isEditModal ? "update" : "create";
      Swal.fire({
        icon: "error",
        title: `${action === "update" ? "Update" : "Creation"} Failed`,
        text:
          error.response?.data?.message ||
          error.message ||
          `Failed to ${action} product`,
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleModalCancel = () => {
    form.resetFields();
    setIsModalOpen(false);
    setIsEditModal(false);
    setEditingProduct(null);
  };

  // Generate SKU based on product components
  const generateSKU = (formData) => {
    const { type_code, brnd_code, model_code, storage_code, cnd_code, uid } =
      formData;

    // Filter out empty values and join with hyphens
    const skuParts = [
      type_code,
      brnd_code,
      model_code,
      storage_code,
      colorCode,
      cnd_code,
      uid,
    ].filter((part) => part && part.trim() !== "");

    return skuParts.join("-");
  };

  // Handle form field changes to auto-generate SKU
  const handleFormFieldChange = (changedFields, allFields) => {
    const formData = {};
    allFields.forEach((field) => {
      formData[field.name[0]] = field.value;
    });

    // Generate SKU when relevant fields change
    const sku = generateSKU(formData);
    if (sku && sku !== "-") {
      form.setFieldsValue({ sku });
    }
  };

  // Handle edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setIsEditModal(true);
    setIsModalOpen(true);

    // Pre-fill form with existing product data
    form.setFieldsValue({
      uid: product.uid || "",
      wc_id: product.wc_id || "",
      pro_title: product.pro_title || "",
      sku: product.sku || "",
      type_code: product.type_code || "",
      brnd_code: product.brnd_code || "",
      model_code: product.model_code || "",
      storage_code: product.storage_code || "",
      color_code: product.color_code || "",
      cnd_code: product.cnd_code || "",
      regular_price: product.regular_price || 0,
      price: product.price || 0,
      sale_price: product.sale_price || 0,
      is_storable:
        product.is_storable !== undefined ? product.is_storable : true,
      seller_ids: product.seller_ids || "",
    });
    setColorCode(product.color_code || "");
  };

  // Handle delete product
  const handleDeleteProduct = async (product) => {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: `You are about to delete "${product.pro_title}". This action cannot be undone!`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Yes, delete it!",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (result.isConfirmed) {
      try {
        await deleteProduct(product._id);

        Swal.fire({
          icon: "success",
          title: "Deleted!",
          text: "Product has been deleted successfully",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          background: "#10b981",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });

        // Refresh the product list
        refetch();
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Delete Failed",
          text:
            error.response?.data?.message ||
            error.message ||
            "Failed to delete product",
          toast: true,
          position: "top-end",
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          background: "#ef4444",
          color: "#fff",
          customClass: {
            popup: "rounded-lg",
          },
        });
      }
    }
  };
  // Error handling
  useEffect(() => {
    if (error) {
      Swal.fire({
        icon: "error",
        title: "Failed to load products",
        text: error.message || "An error occurred while fetching products",
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 4000,
        timerProgressBar: true,
        background: "#ef4444",
        color: "#fff",
        customClass: {
          popup: "rounded-lg",
        },
      });
    }
  }, [error]);

  const columns = [
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => {
        const warningCount =
          record.missingFields.length +
          (record.incompleteSKU ? 1 : 0) +
          (record.invalidSKUFormat ? 1 : 0);

        return (
          <div className="flex items-center justify-center">
            {record?.hasWarnings ? (
              <Tooltip
                title={
                  <div className="text-xs">
                    {record.missingFields.length > 0 && (
                      <div className="mb-1">
                        <strong>Missing Fields:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {record.missingFields.map((field, idx) => (
                            <li key={idx}>{field}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {record.incompleteSKU && (
                      <div className="mb-1">
                        <strong>⚠️ Incomplete SKU</strong>
                        <p className="text-gray-300 mt-0.5">
                          SKU ends with XXXXX or XXXX
                        </p>
                      </div>
                    )}
                    {record.invalidSKUFormat && (
                      <div className="mb-1">
                        <strong>❌ Invalid SKU Format</strong>
                        <p className="text-gray-300 mt-0.5 text-[10px]">
                          {record.skuValidationReason || "SKU format is incorrect"}
                        </p>
                        <p className="text-gray-400 mt-1 text-[10px]">
                          Expected: TYPE-BRAND-MODEL-STORAGE-COLOR-CONDITION-UID
                        </p>
                      </div>
                    )}
                  </div>
                }
                placement="top"
              >
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 border border-yellow-300 cursor-pointer">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-yellow-700">
                    {warningCount}
                  </span>
                </div>
              </Tooltip>
            ) : (
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
            )}
          </div>
        );
      },
    },
    {
      title: "Product Title",
      dataIndex: "pro_title",
      key: "pro_title",
      sorter: (a, b) => (a?.pro_title || "").localeCompare(b?.pro_title || ""),
      render: (text) => (
        <p
          title={text}
          className={`text-base w-[300px] font-semibold ${
            !text || text.trim() === ""
              ? "text-red-600"
              : "text-gray-900"
          }`}
        >
          {text || <span className="italic text-red-500">Missing Title</span>}
        </p>
      ),
      width: 400,
    },
    {
      title: "SKU",
      dataIndex: "sku",
      key: "sku",
      sorter: (a, b) => (a?.sku || "").localeCompare(b?.sku || ""),
      render: (text, record) => {
        const hasSKUIssue =
          record.incompleteSKU ||
          record.invalidSKUFormat ||
          !text ||
          text.trim() === "";

        return (
          <Tooltip
            title={
              record.invalidSKUFormat
                ? `Invalid Format: ${record.skuValidationReason || "SKU format is incorrect"}`
                : record.incompleteSKU
                ? "SKU ends with XXXXX or XXXX"
                : !text || text.trim() === ""
                ? "SKU is missing"
                : null
            }
            placement="top"
          >
            <span
              title={text}
              className={`text-sm whitespace-nowrap inline-flex items-center gap-1 px-2 py-1 rounded-full ${
                hasSKUIssue
                  ? "bg-red-100 text-red-700 border border-red-300"
                  : "text-gray-600"
              }`}
            >
              {text || <span className="italic text-red-500">Missing SKU</span>}
              {hasSKUIssue && (
                <AlertTriangle className="h-3 w-3 text-red-600" />
              )}
            </span>
          </Tooltip>
        );
      },
    },
    {
      title: "Type",
      dataIndex: "type_code",
      key: "type_code",
      render: (text) => (
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${
            !text || text.trim() === ""
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {TYPE_CODE_LABELS[text] || text || (
            <span className="italic text-red-500 inline-flex">Missing Type</span>
          )}
        </span>
      ),
    },
    {
      title: "Brand",
      dataIndex: "brnd_code",
      key: "brnd_code",
      render: (text) => <span className="text-gray-600">{text || "N/A"}</span>,
    },
    {
      title: "Model",
      dataIndex: "model_code",
      key: "model_code",
      render: (text) => <span className="text-gray-600">{text || "N/A"}</span>,
    },
    {
      title: "Sale Price",
      dataIndex: "sale_price",
      key: "sale_price",
      render: (price) => (
        <span className="font-semibold text-green-600">
          ${price ? parseFloat(price).toFixed(2) : "0.00"}
        </span>
      ),
    },
    {
      title: "Condition",
      dataIndex: "cnd_code",
      key: "cnd_code",
      render: (text) => {
        const conditionMap = {
          N: "New",
          R: "Refurbished",
          U: "Used",
        };

        const conditionLabel = conditionMap[text] || text || "N/A";

        return (
          <span
            className={`px-2 py-1 rounded text-xs font-medium ${
              text === "R"
                ? "bg-green-100 text-green-800"
                : text === "N"
                ? "bg-blue-100 text-blue-800"
                : text === "U"
                ? "bg-orange-100 text-orange-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {conditionLabel}
          </span>
        );
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => handleEditProduct(record)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Edit
          </Button>
          <Button
            type="primary"
            danger
            size="small"
            onClick={() => handleDeleteProduct(record)}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="bg-white rounded-lg p-4 md:p-6 mb-4 shadow-lg border border-gray-200 bg-gradient-to-t from-blue-50 to-blue-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <Title level={3} style={{ margin: 0 }}>
              Manage Master Products
            </Title>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImportCSVClick}
                loading={uploading}
                disabled={uploading}
                className="bg-green-600 hover:bg-green-700 border-green-600 text-white px-4 py-2 rounded-md w-full md:w-auto"
              >
                {uploading ? "Uploading..." : "Import CSV"}
              </button>
              <button
                onClick={() => {
                  setIsEditModal(false);
                  setEditingProduct(null);
                  form.resetFields();
                  setIsModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Add New Product
              </button>
            </div>
          </div>
          <div className="mt-4">
            <Search
              placeholder="Search by Name..."
              onChange={handleSearchChange}
              className="w-full md:w-80"
              allowClear
              size="large"
            />
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg p-4 mb-4 shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <Title level={4} style={{ margin: 0 }} className="text-gray-700">
              Filters
            </Title>
            <Button
              onClick={handleFilterReset}
              size="small"
              className="text-gray-600 hover:text-gray-800"
            >
              Reset Filters
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type
                </label>
                <Select
                  placeholder="Select Type"
                  value={filters.type}
                  onChange={(value) => handleFilterChange("type", value)}
                  allowClear
                  className="w-full"
                  size="large"
                >
                  {typeOptions.map((type) => (
                    <Option key={type} value={type}>
                      {TYPE_CODE_LABELS[type] || type}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col>

            {/* <Col xs={24} sm={12} md={8} lg={6}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand
                </label>
                <Select
                  placeholder="Select Brand"
                  value={filters.brand}
                  onChange={(value) => handleFilterChange("brand", value)}
                  allowClear
                  className="w-full"
                  size="large"
                >
                  {brandOptions.map((brand) => (
                    <Option key={brand} value={brand}>
                      {brand}
                    </Option>
                  ))}
                </Select>
              </div>
            </Col> */}
          </Row>

          {/* Active Filters Display */}
          {(filters.type || filters.brand) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                {filters.type && (
                  <Tag
                    color="blue"
                    closable
                    onClose={() => handleFilterChange("type", null)}
                    className="text-sm"
                  >
                    Type: {TYPE_CODE_LABELS[filters.type] || filters.type}
                  </Tag>
                )}
                {filters.brand && (
                  <Tag
                    color="green"
                    closable
                    onClose={() => handleFilterChange("brand", null)}
                    className="text-sm"
                  >
                    Brand: {filters.brand}
                  </Tag>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg">
          {/* Desktop Table View */}
          <Table
            dataSource={products}
            columns={columns}
            rowKey="_id"
            loading={isLoading}
            pagination={false}
            rowClassName={(record) =>
              record?.hasWarnings ? "bg-yellow-50/30" : ""
            }
            locale={{
              emptyText: (
                <div className="py-12 text-center space-y-4">
                  <Empty description="No products found" />
                  <Button type="primary" onClick={handleOpenQuickCreate}>
                    Quick Create Product
                  </Button>
                </div>
              ),
            }}
            className="w-full overflow-x-auto"
          />
          {/* Pagination Section */}
          {total > 0 && (
            <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              {/* Results Info */}
              <div className="text-center sm:text-left text-sm text-gray-600 font-medium mb-4 sm:mb-2">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min((page - 1) * limit + 1, total)}
                </span>{" "}
                to{" "}
                <span className="font-semibold text-gray-900">
                  {Math.min(page * limit, total)}
                </span>{" "}
                of <span className="font-semibold text-gray-900">{total}</span>{" "}
                products
              </div>

              {/* Desktop Pagination */}
              <div className="hidden lg:flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* First & Previous */}
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>

                  {/* Page Numbers */}
                  {(() => {
                    const nums = [];
                    const windowSize = 2;
                    const start = Math.max(1, page - windowSize);
                    const end = Math.min(totalPages, page + windowSize);

                    if (start > 1) {
                      nums.push(1);
                      if (start > 2) nums.push("...");
                    }

                    for (let n = start; n <= end; n++) nums.push(n);

                    if (end < totalPages) {
                      if (end < totalPages - 1) nums.push("...");
                      nums.push(totalPages);
                    }

                    return nums.map((n, idx) =>
                      n === "..." ? (
                        <span
                          key={`ellipsis-${idx}`}
                          className="px-3 py-2 text-sm text-gray-400"
                        >
                          ...
                        </span>
                      ) : (
                        <button
                          key={n}
                          onClick={() => setPage(n)}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                            n === page
                              ? "bg-blue-600 text-white border border-blue-600 shadow-lg"
                              : "text-gray-600 bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {n}
                        </button>
                      )
                    );
                  })()}

                  {/* Next & Last */}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Last
                  </button>
                </div>

                {/* Items per page - Desktop */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <select
                    value={limit}
                    onChange={(e) => {
                      setPage(1);
                      setLimit(Number(e.target.value));
                    }}
                    className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                  >
                    {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Tablet Pagination */}
              <div className="hidden sm:flex lg:hidden flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Previous
                    </button>
                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page >= totalPages}
                      className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next →
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                </div>

                {/* Page selector and items per page - Tablet */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Go to page:</span>
                    <select
                      value={page}
                      onChange={(e) => setPage(Number(e.target.value))}
                      className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <option key={n} value={n}>
                            Page {n}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Show:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setPage(1);
                        setLimit(Number(e.target.value));
                      }}
                      className="px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                      {[10, 20, 30, 50, 100, 200, 500].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Mobile Pagination */}
              <div className="flex sm:hidden flex-col gap-3 mt-4">
                {/* Page info and navigation */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>←</span>
                    <span className="hidden xs:inline">Previous</span>
                  </button>

                  <div className="text-sm text-gray-600 font-medium">
                    Page {page} of {totalPages}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="hidden xs:inline">Next</span>
                    <span>→</span>
                  </button>
                </div>

                {/* Quick page jump and items per page */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Jump to:</span>
                    <select
                      value={page}
                      onChange={(e) => setPage(Number(e.target.value))}
                      className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                    >
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Show:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setPage(1);
                        setLimit(Number(e.target.value));
                      }}
                      className="px-2 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                    >
                      {[10, 20, 30, 50, 100].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          style={{ display: "none" }}
        />
      </Motion.div>
      <div ref={fullscreenRef}>
        <Modal
          getContainer={getContainer}
          key={String(isFullscreen)}
          title={
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  isEditModal ? "bg-blue-100" : "bg-green-100"
                }`}
              >
                <span
                  className={`text-lg ${
                    isEditModal ? "text-blue-600" : "text-green-600"
                  }`}
                >
                  {isEditModal ? "✏️" : "➕"}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 m-0">
                  {isEditModal ? "Edit Product" : "Add New Product"}
                </h3>
                <p className="text-sm text-gray-500 m-0">
                  {isEditModal
                    ? "Update product information"
                    : "Create a new product entry"}
                </p>
              </div>
            </div>
          }
          open={isModalOpen}
          centered
          footer={null}
          width={900}
          destroyOnClose
          onCancel={handleModalCancel}
          className="max-h-[90vh] overflow-y-auto"
          styles={{
            header: {
              borderBottom: "1px solid #f0f0f0",
              paddingBottom: "16px",
              marginBottom: "24px",
            },
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreateProduct}
            onFieldsChange={handleFormFieldChange}
            className="space-y-6"
          >
            {/* make some space between the UId and the Product Title */}
            <div className="mb-4">
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="UID"
                    name="uid"
                    rules={[{ required: true, message: "Please enter UID" }]}
                  >
                    <Input placeholder="Enter UID" size="large" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Platform"
                    name="wc_id"
                    rules={[
                      {
                        required: true,
                        message: "Please enter Platform",
                      },
                    ]}
                  >
                    <Input placeholder="Enter Platform" size="large" />
                  </Form.Item>
                </Col>
              </Row>
            </div>
            <Form.Item
              label="Product Title"
              name="pro_title"
              rules={[
                { required: true, message: "Please enter product title" },
              ]}
            >
              <Input placeholder="Enter product title" size="large" />
            </Form.Item>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="SKU"
                  name="sku"
                  rules={[{ required: true, message: "Please enter SKU" }]}
                  help={
                    !isEditModal
                      ? "SKU will be auto-generated based on other fields"
                      : ""
                  }
                >
                  <Input
                    placeholder="Auto-generated SKU"
                    readOnly={!isEditModal}
                    className={!isEditModal ? "bg-gray-50" : ""}
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Product Code"
                  name="type_code"
                  rules={[{ required: true, message: "Please select type" }]}
                >
                  <Select placeholder="Select Type" size="large">
                    {typeOptions.map((type) => (
                      <Option key={type} value={type}>
                        {TYPE_CODE_LABELS[type] || type}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Brand & Model Section */}

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label="Brand Code"
                  name="brnd_code"
                  rules={[{ required: true, message: "Please select brand" }]}
                >
                  <Select placeholder="Select Brand" size="large">
                    {brandOptions.map((brand) => (
                      <Option key={brand} value={brand}>
                        {brand}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item label="Model Code" name="model_code">
                  <Input placeholder="Enter model code" size="large" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item label="Storage Code" name="storage_code">
                  <Input placeholder="Enter storage code" size="large" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                {/* <Select
                    placeholder="Select Color Code"
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      option?.children
                        ?.toLowerCase()
                        .indexOf(input.toLowerCase()) >= 0
                    }
                    size="large"
                  >
                    {ColorCode2.map((color) => (
                      <Option key={color} value={color}>
                        {color}
                      </Option>
                    ))}
                  </Select> */}
                <Form.Item label="Color Code" name="color_code">
                  <CreatableSelect
                    isClearable
                    placeholder="Select or type color code"
                    value={
                      colorCode ? { value: colorCode, label: colorCode } : null
                    }
                    onChange={(option) => setColorCode(option?.value || "")}
                    options={options}
                    formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
                    styles={{
                      control: (base) => ({
                        ...base,
                        minHeight: "40px",
                        borderRadius: "6px",
                        borderColor: "#d9d9d9",
                        boxShadow: "none",
                      }),
                    }}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Condition"
                  name="cnd_code"
                  rules={[
                    { required: false, message: "Please select condition" },
                  ]}
                >
                  <Select
                    placeholder="Select Condition"
                    allowClear
                    size="large"
                  >
                    {conditionOptions.map((condition) => (
                      <Option key={condition.value} value={condition.value}>
                        {condition.label}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            {/* Pricing Section */}
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item
                  label="Regular Price"
                  name="regular_price"
                  rules={[
                    { required: true, message: "Please enter regular price" },
                  ]}
                >
                  <InputNumber
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    style={{ width: "100%" }}
                    size="large"
                    formatter={(value) =>
                      `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Price" name="price">
                  <InputNumber
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    style={{ width: "100%" }}
                    size="large"
                    formatter={(value) =>
                      `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label="Sale Price" name="sale_price">
                  <InputNumber
                    placeholder="0.00"
                    min={0}
                    step={0.01}
                    style={{ width: "100%" }}
                    size="large"
                    formatter={(value) =>
                      `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                    }
                    parser={(value) => value.replace(/\$\s?|(,*)/g, "")}
                  />
                </Form.Item>
              </Col>
            </Row>

            {/* Show Is Storable and Seller IDs only when editing */}
            {isEditModal && (
              <>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Is Storable"
                      name="is_storable"
                      valuePropName="checked"
                      initialValue={true}
                    >
                      <Switch size="default" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item
                  label="Seller IDs"
                  name="seller_ids"
                  help="Enter seller IDs separated by commas"
                >
                  <Input
                    placeholder="Enter seller IDs (comma separated)"
                    size="large"
                  />
                </Form.Item>
              </>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                onClick={handleModalCancel}
                disabled={isSubmitting}
                size="large"
              >
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700"
                size="large"
              >
                {isSubmitting
                  ? isEditModal
                    ? "Updating..."
                    : "Creating..."
                  : isEditModal
                  ? "Update Product"
                  : "Create Product"}
              </Button>
            </div>
          </Form>
        </Modal>
      </div>
      <Modal
        title="Quick Create Product"
        open={quickCreateOpen}
        onCancel={() => setQuickCreateOpen(false)}
        confirmLoading={quickCreateLoading}
        onOk={handleQuickCreate}
        okText="Create"
        destroyOnClose
      >
        <Form layout="vertical" form={quickForm}>
          <Form.Item
            label="UID"
            name="uid"
            rules={[{ required: true, message: "Please enter UID" }]}
          >
            <Input placeholder="Enter UID" />
          </Form.Item>
          <Form.Item
            label="Product Title"
            name="pro_title"
            rules={[{ required: true, message: "Please enter product title" }]}
          >
            <Input placeholder="Enter product title" />
          </Form.Item>
          <Form.Item label="SKU (optional)" name="sku">
            <Input placeholder="Auto-generated if left blank" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default AdminProductsPage;
