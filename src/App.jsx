import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import PurchaserPendingPage from "./pages/PurchaserPendingPage";

// Layouts and Pages
import MainLayout from "./components/layout/MainLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SourcerPage from "./pages/SourcerPage";
import SourcingPage from "./pages/SourcingPage";
import PurchaserPage from "./pages/PurchaserPage";
import RequestDetailPage from "./pages/RequestDetailPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import ExternalOrdersPage from "./pages/ExternalOrdersPage";
import ProcessedOrdersPage from "./pages/ProcessedOrdersPage";

// Common Components and Styles
import ProtectedRoute from "./components/common/ProtectedRoute";
import "./styles/main.css";
import PlatformsPage from "./pages/platforms/Platforms";
import KitsPage from "./pages/KitsPage";
import MergedProductsPage from "./pages/MergedProductsPage";
import UserActivityPage from "./pages/UserActivityPage";
import Inventory from "./pages/Inventory";
import InventoryLayout from "./pages/inventory/Layout";
import Warehouses from "./pages/inventory/Warehouses";
import Zones from "./pages/inventory/Zones";
import Locations from "./pages/inventory/Locations";
import InventoryList from "./pages/inventory/InventoryList";
import Products from "./pages/inventory/Products";
import UploadProducts from "./pages/inventory/UploadProducts";
import ScanProduct from "./pages/inventory/Scan";



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
        <Route index element={<DashboardPage />} />
        <Route path="sourcing/orders" element={<SourcingPage />} />
        <Route path="sourcing/new" element={<SourcerPage />} />
        <Route path="requests/pending" element={<PurchaserPendingPage />} />
        <Route path="requests/my" element={<PurchaserPage />} />
        <Route path="requests/:sourcingId" element={<RequestDetailPage />} />
        <Route path="admin/users" element={<AdminUsersPage />} />
        <Route path="admin/products" element={<AdminProductsPage />} />
        <Route path="external/orders/pending" element={<ExternalOrdersPage />} />
        <Route path="external/orders/processed" element={<ProcessedOrdersPage />} />
        <Route path="platforms" element={<PlatformsPage />} />
        <Route path="kits" element={<KitsPage />} />
        <Route path="merged-products" element={<MergedProductsPage />} />
        <Route path="admin/user-activity" element={<UserActivityPage />} />
        <Route path="inventory" element={<InventoryLayout />}>
          <Route index element={<Inventory />} />
          <Route path="warehouses" element={<Warehouses />} />
          <Route path="zones" element={<Zones />} />
          <Route path="locations" element={<Locations />} />
          <Route path="inventory" element={<InventoryList />} />
          <Route path="products" element={<Products />} />
          <Route path="products/upload" element={<UploadProducts />} />
          <Route path="scan" element={<ScanProduct />} />

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
