import { useState, useEffect } from "react";
import { Modal, Form, Input, Upload, message } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { updatePackingOrder } from "../../../../api/fulfillment";
import Swal from "sweetalert2";

const { TextArea } = Input;

export default function EditPackingModal({
  open,
  onCancel,
  packingData,
  onSuccess,
}) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [photosToRemove, setPhotosToRemove] = useState([]);

  useEffect(() => {
    if (open && packingData) {
      form.setFieldsValue({
        notes: packingData.notes || "",
      });
      
      // Initialize file list with existing photos
      if (packingData.photoUrls && packingData.photoUrls.length > 0) {
        const existingPhotos = packingData.photoUrls.map((url, index) => ({
          uid: `existing-${index}`,
          name: `photo-${index + 1}.jpg`,
          status: "done",
          url: url,
          isExisting: true,
        }));
        setFileList(existingPhotos);
      } else {
        setFileList([]);
      }
      setPhotosToRemove([]);
    }
  }, [open, packingData, form]);

  const handleRemovePhoto = (file) => {
    if (file.isExisting) {
      // Mark existing photo for removal
      setPhotosToRemove((prev) => [...prev, file.url]);
    }
    setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
  };

  const handleBeforeUpload = (file) => {
    // Validate file type
    const isImage = file.type.startsWith("image/");
    if (!isImage) {
      message.error("You can only upload image files!");
      return false;
    }

    // Validate file size (max 10MB)
    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error("Image must be smaller than 10MB!");
      return false;
    }

    // Validate total photos (max 5)
    const newFileList = [...fileList.filter(f => !f.isExisting || !photosToRemove.includes(f.url)), file];
    if (newFileList.length > 5) {
      message.error("Maximum 5 photos allowed!");
      return false;
    }

    return false; // Prevent auto upload
  };

  const handleFileChange = ({ fileList: newFileList }) => {
    // Filter out files marked for removal
    const filteredList = newFileList.filter(
      (file) => !photosToRemove.includes(file.url)
    );
    setFileList(filteredList);
  };

  const handleSubmit = async (values) => {
    if (!packingData) return;

    // Validate: At least 1 photo must remain
    const remainingPhotos = fileList.filter(
      (file) => !photosToRemove.includes(file.url)
    );
    const newPhotos = remainingPhotos.filter((file) => !file.isExisting);
    
    if (remainingPhotos.length === 0 && newPhotos.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Photos Required",
        text: "At least one photo must remain. Please keep at least one photo or upload a new one.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    // Validate: Maximum 5 photos total
    if (remainingPhotos.length > 5) {
      Swal.fire({
        icon: "warning",
        title: "Too Many Photos",
        text: "Maximum 5 photos allowed. Please remove some photos.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
      return;
    }

    setSubmitting(true);

    try {
      const updateData = {
        notes: values.notes || "",
        removePhotoUrls: photosToRemove,
        photos: newPhotos.map((file) => file.originFileObj || file).filter(Boolean),
      };

      const result = await updatePackingOrder(packingData.packingId, updateData);

      if (result.success) {
        await Swal.fire({
          icon: "success",
          title: "Packing Order Updated",
          text: "The packing order has been updated successfully.",
          confirmButtonColor: "#2563eb",
          confirmButtonText: "OK",
        });

        if (onSuccess) {
          onSuccess(result.data);
        }
        onCancel();
      }
    } catch (error) {
      console.error("Error updating packing order:", error);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: error.message || "Failed to update packing order. Please try again.",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "OK",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const remainingPhotos = fileList.filter(
    (file) => !photosToRemove.includes(file.url)
  );

  return (
    <Modal
      title="Edit Packing Order"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Save Changes"
      cancelText="Cancel"
      confirmLoading={submitting}
      width={600}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        className="mt-4"
      >
        {/* <Form.Item
          name="notes"
          label="Notes"
          rules={[
            {
              max: 1000,
              message: "Notes cannot exceed 1000 characters",
            },
          ]}
        >
          <TextArea
            rows={4}
            placeholder="Add notes about this packing order (optional)"
            showCount
            maxLength={1000}
          />
        </Form.Item> */}

        <Form.Item label="Photos">
          <div className="space-y-4">
            <Upload
              fileList={fileList}
              onChange={handleFileChange}
              beforeUpload={handleBeforeUpload}
              onRemove={handleRemovePhoto}
              listType="picture-card"
              accept="image/*"
              multiple
            >
              {remainingPhotos.length < 5 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Upload</div>
                </div>
              )}
            </Upload>
            <p className="text-xs text-gray-500">
              Maximum 5 photos. At least 1 photo required. Max 10MB per image.
            </p>
            {remainingPhotos.length === 0 && (
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ At least one photo must remain. Please upload a photo.
              </p>
            )}
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}

