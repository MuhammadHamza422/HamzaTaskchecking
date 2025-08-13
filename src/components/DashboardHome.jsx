import { Package, Boxes, Users, ClipboardList, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardCards() {
  const cards = [
    {
      title: "Orders Processing",
      icon: ClipboardList,
      color: "text-indigo-500",
      hoverColor: "group-hover:text-indigo-600",
      link: "/orders/external/orders/pending",
      bgColor: "bg-indigo-50",
      border: "border-indigo-500",
    },
    {
      title: "Inventory",
      icon: Boxes,
      color: "text-green-500",
      hoverColor: "group-hover:text-green-600",
      link: "/inventory",
      bgColor: "bg-green-50",
      border: "border-green-500",
    },
    {
      title: "Users & Roles",
      icon: Users,
      color: "text-pink-500",
      hoverColor: "group-hover:text-pink-600",
      link: "/admin/users",
      bgColor: "bg-pink-50",
      border: "border-pink-500",
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
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {cards.map((card, index) => (
        <Link
          key={index}
          to={card.link}
          className={`${card.bgColor}  rounded-2xl shadow-sm border-2  ${card.border} p-6 flex flex-col items-center justify-center hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group`}
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
