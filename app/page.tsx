"use client";

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Globe,
  Shield,
  Boxes,
  Wrench,
  Users,
  BarChart3,
  Link2,
  Server,
  Zap,
  Settings,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Plus,
  Database,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "../components/ThemeProvider";
import { GlobalHeader } from "../components/GlobalHeader";

const SystemNode = ({
  icon: Icon,
  label,
  status = "active",
  onClick,
  href,
  color = "blue",
}: {
  icon: any;
  label: string;
  status?: "active" | "warning" | "error" | "neutral";
  onClick?: () => void;
  href?: string;
  color?: string;
}) => {
  const router = useRouter();
  
  const handleClick = () => {
    if (href) router.push(href);
    else if (onClick) onClick();
  };

  const colors = {
    blue: "bg-blue-50 border-blue-200 hover:border-blue-400 text-blue-700",
    green: "bg-green-50 border-green-200 hover:border-green-400 text-green-700",
    yellow: "bg-yellow-50 border-yellow-200 hover:border-yellow-400 text-yellow-700",
    red: "bg-red-50 border-red-200 hover:border-red-400 text-red-700",
    purple: "bg-purple-50 border-purple-200 hover:border-purple-400 text-purple-700",
    orange: "bg-orange-50 border-orange-200 hover:border-orange-400 text-orange-700",
    gray: "bg-gray-50 border-gray-200 hover:border-gray-400 text-gray-700",
  };

  const statusColors = {
    active: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    neutral: "bg-gray-400",
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md min-w-[120px] ${colors[color as keyof typeof colors]}`}
    >
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${statusColors[status]}`} />
      <Icon className="w-6 h-6 mb-2 opacity-80" />
      <span className="text-xs font-semibold text-center leading-tight">{label}</span>
    </motion.div>
  );
};

const LayerBar = ({ label, color = "blue" }: { label: string; color?: "blue" | "orange" | "dark" }) => {
  const colors = {
    blue: "bg-blue-600",
    orange: "bg-orange-500",
    dark: "bg-slate-700",
  };

  return (
    <div className={`${colors[color]} text-white py-3 px-6 rounded-lg flex items-center justify-center gap-2 shadow-md`}>
      <Server className="w-4 h-4" />
      <span className="font-semibold text-sm">{label}</span>
    </div>
  );
};

const HealthCard = ({
  title,
  count,
  subtitle,
  items,
  type,
}: {
  title: string;
  count: number;
  subtitle: string;
  items: { name: string; status?: string; date?: string }[];
  type: "success" | "warning" | "info";
}) => {
  const colors = {
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const badges = {
    success: "bg-green-100 text-green-700",
    warning: "bg-yellow-100 text-yellow-700",
    info: "bg-blue-100 text-blue-700",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[type]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {type === "success" && <CheckCircle2 className="w-5 h-5" />}
          {type === "warning" && <AlertCircle className="w-5 h-5" />}
          {type === "info" && <Plus className="w-5 h-5" />}
          <h3 className="font-bold text-sm">{title}</h3>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-3xl font-bold">{count}</div>
        <div className="text-xs opacity-80">{subtitle}</div>
      </div>

      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs">
            <span className="opacity-90">{item.name}</span>
            {item.status && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${badges[type]}`}>
                {item.status}
              </span>
            )}
            {item.date && (
              <span className="opacity-70 text-[10px]">{item.date}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const checked = useRef(false); // kept in case future effects rely on it
  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <GlobalHeader
        title="Network Management System"
        subtitle="Enterprise ADMS integration overview"
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Layer 1: Management Systems */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">
            Management Systems
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
            <SystemNode icon={Activity} label="MDM" color="blue" status="active" />
            <SystemNode icon={Boxes} label="Distribution Planning" color="blue" status="active" />
            <SystemNode icon={Globe} label="GIS" color="blue" status="active" />
            <SystemNode icon={Shield} label="Protection Controls" color="yellow" status="warning" />
            <SystemNode icon={Server} label="WMS" color="blue" status="active" />
            <SystemNode icon={Wrench} label="Maintenance Mgmt" color="blue" status="active" />
            <SystemNode icon={Users} label="CRM/CIS" color="blue" status="active" />
            <SystemNode icon={BarChart3} label="Data Analytics" color="blue" status="active" />
            <SystemNode icon={Link2} label="3rd Party Systems" color="red" status="error" href="/present-adms" />
          </div>
        </div>

        {/* Connecting Lines to Enterprise Bus */}
        <div className="flex justify-center mb-2">
          <div className="grid grid-cols-9 gap-4 w-full max-w-7xl">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="flex justify-center">
                <div className="w-0.5 h-8 bg-blue-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Service Bus Layer */}
        <div className="mb-4">
          <LayerBar label="Enterprise Service Bus (SAP PI)" color="blue" />
        </div>

        {/* Connecting Lines from Enterprise Bus */}
        <div className="flex justify-center mb-4">
          <div className="grid grid-cols-9 gap-4 w-full max-w-7xl">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex justify-center">
                <div className="w-0.5 h-8 bg-blue-400" />
              </div>
            ))}
          </div>
        </div>

        {/* Layer 2: Operational Systems */}
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-9 gap-4">
            <SystemNode icon={Zap} label="AMI Head End" color="blue" status="active" />
            <SystemNode icon={Server} label="MVNO" color="blue" status="active" />
            <SystemNode icon={Activity} label="OpenADR" color="blue" status="active" />
            <SystemNode icon={Settings} label="Asset Operations" color="blue" status="active" />
            <SystemNode icon={TrendingUp} label="System Load Forecast" color="yellow" status="warning" />
            <SystemNode icon={Database} label="CRM Data Warehouse" color="blue" status="active" />
            <SystemNode icon={Globe} label="WWW/FI-Mobile GIS" color="blue" status="active" />
            <SystemNode icon={Users} label="Customer E-Portal" color="blue" status="active" />
          </div>
        </div>

        {/* Connecting Lines to DMZ */}
        <div className="flex justify-center mb-4">
          <div className="w-full flex justify-center">
            <div className="w-0.5 h-8 bg-orange-400" />
          </div>
        </div>

        {/* DMZ Firewall */}
        <div className="mb-4">
          <LayerBar label="DMZ Firewall" color="orange" />
        </div>

        {/* Connecting Lines from DMZ */}
        <div className="flex justify-center mb-2">
          <div className="w-full flex justify-center">
            <div className="w-0.5 h-8 bg-orange-400" />
          </div>
        </div>

        {/* Enterprise Service Bus 2 */}
        <div className="mb-2">
          <LayerBar label="Enterprise Service Bus (SAP PI)" color="blue" />
        </div>

        {/* Connecting Lines to ADMS */}
        <div className="flex justify-center mb-4 gap-32">
          <div className="w-0.5 h-8 bg-blue-400" />
          <div className="w-0.5 h-8 bg-blue-400" />
        </div>

        {/* ADMS Layer */}
        <div className="mb-8 flex justify-center">
          <div className="grid grid-cols-2 gap-6 max-w-md">
            <SystemNode 
              icon={Server} 
              label="DA System" 
              color="blue" 
              status="active"
              onClick={() => router.push("/server/da-system")}
            />
            <SystemNode 
              icon={Activity} 
              label="ADMS" 
              color="blue" 
              status="active"
              href="/present-adms"
            />
          </div>
        </div>

        {/* Connecting Lines to Physical Layer */}
        <div className="flex justify-center mb-6">
          <div className="w-0.5 h-8 bg-slate-600" />
        </div>

        {/* Physical Infrastructure Layer */}
        <div className={`rounded-2xl p-6 mb-10 shadow-sm ${isDark ? "bg-slate-800" : "bg-slate-700"} text-white`}>
          <h3 className="text-center font-semibold mb-4 text-sm uppercase tracking-wider opacity-80">
            Physical Infrastructure Layer
          </h3>
          <div className="flex justify-center gap-6">
            {[
              { icon: Zap, label: "Substation" },
              { icon: Activity, label: "Transformers" },
              { icon: Server, label: "Smart Meters" },
              { icon: Link2, label: "Distribution Lines" },
            ].map((item, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
                  <item.icon className="w-6 h-6" />
                </div>
                <span className="text-xs opacity-90">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <HealthCard
            title="Active Systems"
            count={18}
            subtitle="Systems Online"
            type="success"
            items={[
              { name: "MDM System", status: "Active" },
              { name: "GIS Platform", status: "Active" },
              { name: "CRM/CIS", status: "Active" },
            ]}
          />
          
          <HealthCard
            title="Systems to be Retired"
            count={4}
            subtitle="Legacy Systems"
            type="warning"
            items={[
              { name: "Legacy SCADA", date: "Q2 2025" },
              { name: "Old CRM Module", date: "Q3 2025" },
              { name: "Manual Dispatch", date: "Q4 2025" },
            ]}
          />
          
          <HealthCard
            title="New Systems"
            count={6}
            subtitle="In Development"
            type="info"
            items={[
              { name: "AI Analytics", status: "Testing" },
              { name: "IoT Gateway", status: "Beta" },
              { name: "Mobile Workforce", status: "Planning" },
            ]}
          />
        </div>
      </main>
    </div>
  );
}
