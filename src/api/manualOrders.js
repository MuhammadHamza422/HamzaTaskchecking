import apiClient from "./client";

// GET /api/v1/manualOrder/all
export async function getManualOrders({
  page = 1,
  limit = 30,
  search = "",
  platform = "",
  status = "",
  dateRange = null,
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (search) params.append("search", search);
  if (platform) params.append("platform", platform);
  if (status) params.append("status", status);
  if (dateRange && dateRange.length === 2) {
    params.append("start_date", dateRange[0].format("YYYY-MM-DD"));
    params.append("end_date", dateRange[1].format("YYYY-MM-DD"));
  }

  const { data } = await apiClient.get(`/api/v1/manualOrder/all?${params.toString()}`);
  return data;
}

// GET /api/v1/manualOrder/detail/:id
export async function getManualOrderDetails(orderId) {
  const { data } = await apiClient.get(`/api/v1/manualOrder/detail/${orderId}`);
  return data;
}

// POST /api/v1/manualOrder/create
export async function createManualOrder(orderData) {
  const { data } = await apiClient.post("/api/v1/manualOrder/create", orderData);
  return data;
}

// PATCH /api/v1/manualOrder/update/:id
export async function updateManualOrder(orderId, orderData) {
  const { data } = await apiClient.patch(`/api/v1/manualOrder/update/${orderId}`, orderData);
  return data;
}

// DELETE /api/v1/manualOrder/delete/:id
export async function deleteManualOrder(orderId) {
  const { data } = await apiClient.delete(`/api/v1/manualOrder/delete/${orderId}`);
  return data;
}
