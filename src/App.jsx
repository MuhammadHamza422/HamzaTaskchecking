
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import PurchaserPendingPage from "./pages/purchaser/PurchaserPendingPage";

// Layouts and Pages
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import SourcerPage from "./pages/sourcer/SourcerPage";
import SourcingPage from "./pages/sourcer/SourcingPage";
import PurchaserPage from "./pages/purchaser/PurchaserPage";
import RequestDetailPage from "./pages/RequestDetailPage";
import AdminUsersPage from "./pages/AdminUsersPage";

// Common Components and Styles
import ProtectedRoute from "./components/common/ProtectedRoute";
import "./styles/main.css";
import PlatformsPage from "./pages/platforms/Platforms";
import KitsPage from "./pages/order-processing/KitsPage";
import UserActivityPage from "./pages/UserActivityPage";
import Inventory from "./pages/Inventory";
import InventoryLayout from "./pages/inventory/Layout";
import Warehouses from "./pages/inventory/Warehouses";
import Zones from "./pages/inventory/Zones";
import Locations from "./pages/inventory/Locations";
import InventoryList from "./pages/inventory/InventoryList";
import Products from "./pages/inventory/Products";
import ScanProduct from "./pages/inventory/Scan";
import ActivityLogs from "./pages/inventory/ActivityLogs";
import RoleManagement from "./pages/Roles";
import ManualOrdersPage from "./pages/ManualOrdersPage/ManualOrdersPage";
import DashboardCards from "./components/DashboardHome";
import CompanyManager from "./pages/CompanyManager";
import AttendancePage from "./pages/attendance/AttendancePage";
import TimeOffLayout from "./pages/timeoff/Layout";
import MyTimeOffPage from "./pages/timeoff/MyTimeOffPage";
import AdminTimeOffRequestsPage from "./pages/timeoff/AdminTimeOffRequestsPage";
import TimeOffTypesPage from "./pages/timeoff/TimeOffTypesPage";
import AdminTimeOffAllocationsPage from "./pages/timeoff/AdminTimeOffAllocationsPage";
import AdminProductsPage from "./pages/order-processing/AdminProductsPage";
import ExternalOrdersPage from "./pages/order-processing/ExternalOrdersPage";
import MergedProductsPage from "./pages/order-processing/MergedProductsPage";
import ProcessedOrdersPage from "./pages/order-processing/ProcessedOrdersPage";
import SellerDetailsPage from "./pages/sellers/SellersDetailsPage";
import SellersListPage from "./pages/sellers/SellersListPage";
import SourcerDashboardPage from "./pages/sourcer/SourcerDashboardPage";
import PurchaserDashboardPage from "./pages/purchaser/PurchaserDashboardPage";
import PurchaserListingsPage from "./pages/purchaser/PurchaserListingPage";
import AttendanceActivity from "./pages/attendance/Attendance-Activity";

// 🔹 Role guard for specific routes
const RequireRoles = ({ allow, children }) => {
  const { token, user } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (allow && (!user || !allow.includes(user.role)))
    return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginRoute />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {/* Child routes of MainLayout */}
          <Route index element={<DashboardCards />} />
          <Route path="/sourcing/orders" element={<SourcingPage />} />
          <Route path="/sourcing/orders/new" element={<SourcerPage />} />
          <Route path="/sourcing/edit/:id" element={<SourcerPage />} /> 
          <Route path="/sourcing" element={<SourcerDashboardPage />} />

          {/* <Route path="requests/pending" element={<PurchaserPendingPage />} /> */}
          <Route path="requests/my" element={<PurchaserPage />} />
          <Route path="requests/:sourcingId" element={<RequestDetailPage />} />
          {/* <Route path="/purchasing/dashboard" element={<PurchaserDashboardPage />} /> */}

          <Route path="purchaser">
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<PurchaserDashboardPage />} />
            <Route path="pending" element={<PurchaserPendingPage />} />
            {/* <Route path="assigned" element={<PurchaserAssignedPage />} /> */}
            <Route path="listings" element={<PurchaserListingsPage />} />
          </Route>
          

          {/* Admin User Routes */}
          <Route path="admin/users" element={<AdminUsersPage />} />
          <Route path="admin/user-activity" element={<UserActivityPage />} />
          <Route path="admin/roles" element={<RoleManagement />} />



          {/* Sellers */}
          <Route path="/sourcing/sellers/:id" element={<SellerDetailsPage />} />
          <Route path="/sourcing/sellers" element={<SellersListPage />} />

          {/* 🔹 Admin Companies Route (new) */}
          <Route
            path="admin/companies"
            element={
              <RequireRoles allow={["admin"]}>
                <CompanyManager />
              </RequireRoles>
            }
          />

          {/* Orders Routes */}
          <Route
            path="product/admin/products"
            element={<AdminProductsPage />}
          />
          <Route
            path="product/merged-products"
            element={<MergedProductsPage />}
          />
          <Route path="product/inventory/products" element={<Products />} />

          <Route
            path="orders/external/orders/pending"
            element={<ExternalOrdersPage />}
          />
          <Route
            path="orders/external/orders/processed"
            element={<ProcessedOrdersPage />}
          />
          <Route
            path="orders/external/orders/manual"
            element={<ManualOrdersPage />}
          />
          <Route path="orders/platforms" element={<PlatformsPage />} />
          <Route path="orders/kits" element={<KitsPage />} />

          {/* Attendance entry */}
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/attendance-activity" element={<AttendanceActivity />} />
          <Route path="timeoff" element={<TimeOffLayout />}>
            <Route
              path="me"
              element={
                <RequireRoles
                  allow={["admin", "manager", "user", "purchaser", "sourcer"]}
                >
                  <MyTimeOffPage />
                </RequireRoles>
              }
            />
            <Route
              path="requests"
              element={
                <RequireRoles allow={["admin", "manager"]}>
                  <AdminTimeOffRequestsPage />
                </RequireRoles>
              }
            />
          </Route>

          {/* Admin TimeOff Types (separate since it’s under /admin) */}
          <Route
            path="admin/timeoff/types"
            element={
              <RequireRoles allow={["admin"]}>
                <TimeOffTypesPage />
              </RequireRoles>
            }
          />
          <Route
            path="admin/timeoff/allocation"
            element={
              <RequireRoles allow={["admin"]}>
                <AdminTimeOffAllocationsPage />
              </RequireRoles>
            }
          />

          {/* Inventory Routes */}
          <Route path="inventory" element={<InventoryLayout />}>
            <Route index element={<Inventory />} />
            <Route path="warehouses" element={<Warehouses />} />
            <Route path="zones" element={<Zones />} />
            <Route path="locations" element={<Locations />} />
            <Route path="inventory" element={<InventoryList />} />
            <Route path="products" element={<Products />} />
            <Route path="scan" element={<ScanProduct />} />
            <Route path="activity-logs" element={<ActivityLogs />} />
          </Route>
        </Route>
        {/* Catch all route - redirect to dashboard if logged in, login if not */}
        <Route path="*" element={<CatchAllRoute />} />
      </Routes>
    </BrowserRouter>
  );
}

// Separate component for login route to avoid useAuth in App component
const LoginRoute = () => {
  const { token } = useAuth();
  return token ? <Navigate to="/" /> : <LoginPage />;
};

// Catch all route component
const CatchAllRoute = () => {
  const { token } = useAuth();
  return token ? <Navigate to="/" /> : <Navigate to="/login" />;
};

export default App;