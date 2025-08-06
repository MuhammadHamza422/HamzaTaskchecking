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

// Common Components and Styles
import ProtectedRoute from "./components/common/ProtectedRoute";
import "./styles/main.css";
import PlatformsPage from "./pages/platforms/Platforms";
import KitsPage from "./pages/KitsPage";

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
        <Route path="/external/orders" element={<ExternalOrdersPage />} />
        <Route path="/platforms" element={<PlatformsPage />} />
        <Route path="/kits" element={<KitsPage />} />

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
