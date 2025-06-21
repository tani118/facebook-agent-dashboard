import React from "react";
import Icon from "../assets/richpanel_icon.png";
import Inbox from "../assets/inbox.png";
import InboxSelected from "../assets/inbox_selected.png";
import LineChart from "../assets/line_chart.png";
import LineChartSelected from "../assets/line_chart_selected.png";
import Friends from "../assets/friends.png";
import FriendsSelected from "../assets/friends_selected.png";
import DefaultUserImage from "../assets/user.png";
import { useAuth } from "../contexts/AuthContext";
import { LogOut } from "lucide-react";

const Sidebar = ({ activeTab }) => {
  const { logout } = useAuth();
  
  const sidebarOps = [
    {
      name: "chatportal",
      link: "/helpdesk",
      icon: Inbox,
      iconSelected: InboxSelected,
    },
    {
      name: "manage-page",
      link: "/helpdesk/manage-page",
      icon: Friends,
      iconSelected: FriendsSelected,
    },
    {
      name: "analysis",
      link: "/helpdesk/analysis",
      icon: LineChart,
      iconSelected: LineChartSelected,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-12 p-4 h-full">
      {/* icon */}
      <div className="flex items-center justify-center w-full">
        <img src={Icon} className="h-8 w-8" alt="Richpanel" />
      </div>

      <div className="flex flex-col gap-10">
        {sidebarOps?.map((op) => (
          <div key={op.name} className="relative flex items-center">
            <div className="w-1 absolute left-[-8px]">
              {activeTab === op.name && (
                <div className="h-6 w-1 bg-white rounded-full"></div>
              )}
            </div>
            <img 
              alt={op.name} 
              src={activeTab === op.name ? op.iconSelected : op.icon} 
              className="h-6 w-6 cursor-pointer"
              onClick={() => window.location.href = op.link}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-5 items-center mt-auto">
        <LogOut
          color="white"
          className="h-6 w-6 cursor-pointer"
          onClick={logout}
        />
        <div className="relative">
          <img src={DefaultUserImage} alt="User" className="w-8 h-8 rounded-full" />
          <div className="h-3 w-3 bg-lime-500 rounded-full absolute right-0 -bottom-[2px]"></div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
