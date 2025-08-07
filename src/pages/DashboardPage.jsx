import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import ManagerDashboardPage from "./ManagerDashboardPage";
import SourcerDashboardPage from "./SourcerDashboardPage";
import PurchaserDashboardPage from "./PurchaserDashboardPage";
import apiClient from "../api/client";
import { Card, Spin, Typography } from "antd";
import { Bar } from "react-chartjs-2";
import { motion } from "framer-motion";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";
import DashboardHome from "../components/DashboardHome";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend
);

const { Title } = Typography;

const DashboardPage = () => {
  const { user } = useAuth();
  const [userCount, setUserCount] = useState(0);
  const [productCount, setProductCount] = useState(0);

  // useEffect(() => {
  //   if (user?.role === 'admin') {
  //     apiClient.get('/users/').then(res => setUserCount(res.data.length));
  //     apiClient.get('/products/').then(res => setProductCount(res.data.length));
  //   }
  // }, [user]);

  if (!user) return <Spin size="large" />;

  switch (user.role) {
    case "manager":
      return <ManagerDashboardPage />;
    case "sourcer":
      return <SourcerDashboardPage />;
    case "purchaser":
      return <PurchaserDashboardPage />;
    case "admin": {
      return <DashboardHome />;
    }
    default:
      return (
        <div>
          <h2>Dashboard</h2>
          <p>Welcome to SourceHub.</p>
        </div>
      );
  }
};

export default DashboardPage;

// import React from "react";

// const DashboardPage = () => {
//   return <div className="p-4 bg-red-900 text-white">DashboardPage</div>;
// };

// export default DashboardPage;
