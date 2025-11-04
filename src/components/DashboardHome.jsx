import {
  Package,
  Boxes,
  Users,
  ClipboardList,
  ShoppingCart,
  CalendarDays,
  CalendarArrowDown,
  CalendarArrowUp,
  UserCheck,
  FileText,
} from "lucide-react";
import { LuWarehouse } from "react-icons/lu";

import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
export default function DashboardCards() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // useEffect(() => {
  //   if (user?.role === "attendance") {
  //     navigate("/attendance", { replace: true });
  //   }
  // }, [user, navigate]);
  // if (user?.role === "attendance") {
  //   return null;
  // }

  // Example structure of your cards with required access
  const cards = [
    {
      title: "Orders Processing",
      icon: ClipboardList,
      accessKey: "orders", // 👈 match with roles.access
      color: "text-indigo-500",
      hoverColor: "group-hover:text-indigo-600",
      link: "/orders/external/orders/pending",
      bgColor: "bg-indigo-50",
      border: "border-indigo-500",
    },
    {
      title: "Inventory",
      icon: Boxes,
      accessKey: "inventory",
      color: "text-green-500",
      hoverColor: "group-hover:text-green-600",
      link: "/inventory",
      bgColor: "bg-green-50",
      border: "border-green-500",
    },
    {
      title: "Products",
      icon: LuWarehouse,
      accessKey: "products",
      color: "text-sky-500",
      hoverColor: "group-hover:text-sky-600",
      link: "/product/admin/products",
      bgColor: "bg-sky-50",
      border: "border-sky-500",
    },
    {
      title: "Users & Roles",
      icon: Users,
      accessKey: "users",
      color: "text-pink-500",
      hoverColor: "group-hover:text-pink-600",
      link: "/admin/users",
      bgColor: "bg-pink-50",
      border: "border-pink-500",
    },
    {
      title: "Attendance",
      icon: CalendarDays,
      color: "text-teal-500",
      accessKey: "attendance",
      hoverColor: "group-hover:text-teal-600",
      link: "/attendance",
      bgColor: "bg-teal-50",
      border: "border-teal-500",
    },
    // {
    //   title: "Time Off",
    //   icon: CalendarDays,
    //   color: "text-red-500",
    //   accessKey: "timeoff",
    //   hoverColor: "group-hover:text-red-600",
    //   link: "/timeoff", // 🔹 single entry point
    //   bgColor: "bg-red-50",
    //   border: "border-red-500",
    // },
    {
      title: "Sourcer",
      icon: CalendarArrowDown,
      color: "text-sky-500",
      hoverColor: "group-hover:text-sky-600",
      accessKey: "timeoff",
      link: "/sourcing", // 🔹 single entry point
      bgColor: "bg-sky-50",
      border: "border-sky-500",
    },
    {
      title: "Purchaser",
      icon: CalendarArrowUp,
      color: "text-green-500",
      accessKey: "timeoff",
      hoverColor: "group-hover:text-green-600",
      link: "/purchaser/dashboard", // 🔹 single entry point
      bgColor: "bg-green-50",
      border: "border-green-500",
    },
    {
      title: "Employees",
      icon: UserCheck,
      color: "text-purple-500",
      accessKey: "employees",
      hoverColor: "group-hover:text-purple-600",
      link: "/employees",
      bgColor: "bg-purple-50",
      border: "border-purple-500",
    },
    {
      title: "Procurement",
      icon: FileText,
      color: "text-orange-500",
      accessKey: "procurement",
      hoverColor: "group-hover:text-orange-600",
      link: "/procurement/orders",
      bgColor: "bg-orange-50",
      border: "border-orange-500",
    },
    // {
    //   title: "Products",
    //   icon: Package,
    //   color: "text-orange-500",
    //   hoverColor: "group-hover:text-orange-600",
    //   link: "/products",
    // },
    // {
    //   title: "New Orders",
    //   icon: ShoppingCart,
    //   color: "text-blue-500",
    //   hoverColor: "group-hover:text-blue-600",
    //   link: "/new-orders",
    // },
    // {
    //   title: "Products",
    //   icon: Package,
    //   accessKey: "products",
    //   color: "text-orange-500",
    //   hoverColor: "group-hover:text-orange-600",
    //   link: "/products",
    //   bgColor: "bg-orange-50",
    //   border: "border-orange-500",
    // },
    // {
    //   title: "New Orders",
    //   icon: ShoppingCart,
    //   accessKey: "newOrders",
    //   color: "text-blue-500",
    //   hoverColor: "group-hover:text-blue-600",
    //   link: "/new-orders",
    //   bgColor: "bg-blue-50",
    //   border: "border-blue-500",
    // },
  ];

  // Extract user access keys (safe check in case user is null/undefined)
  const userAccess =
    user?.roles?.access?.map((a) => a.app?.toLowerCase()) || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards
        .filter(
          (card) =>
            card.accessKey && userAccess.includes(card.accessKey.toLowerCase())
        )

        .map((card, index) => (
          <Link
            key={index}
            to={card.link}
            className={`${card.bgColor} rounded-2xl shadow-sm border-2 ${card.border} p-6 flex flex-col items-center justify-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
          >
            <card.icon
              className={`${card.color} w-14 h-14 mb-4 ${card.hoverColor} transition-colors`}
            />
            <span className="text-gray-900 font-semibold text-lg text-center">
              {card.title}
            </span>
          </Link>
        ))}
    </div>
  );
}
