

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { HardDrive, Network } from "lucide-react";
import { motion } from "framer-motion";
import { GlobalHeader } from "../../../components/GlobalHeader";
import { useTheme } from "../../../components/ThemeProvider";
import { useConnectionStatus } from "../../../hooks/useConnectionStatus";

interface ServerMetrics {
  logs: {
    status: "Online" | "Offline" | null;
    uptime: string | null;
    storage: string | null;
  };
  calls: {
    status: "Online" | "Offline" | null;
    active: string | null;
    queue: string | null;
    cpu: string | null;
  };
}

export default function ServerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;
  const { theme } = useTheme();
  const { ssh, oracle } = useConnectionStatus();
  const isDark = theme === "dark";

  const [metrics, setMetrics] = useState<ServerMetrics>({
    logs: { status: null, uptime: null, storage: null },
    calls: { status: null, active: null, queue: null, cpu: null },
  });

  const displayName =
    serverId === "adms-server"
      ? "ADMS"
      : serverId === "da-system"
      ? "DA System"
      : serverId.replace(/-/g, " ").toUpperCase();

  // Fetch real metrics from backend when connections are available
  useEffect(() => {
    const fetchMetrics = async () => {
      // Fetch SSH/logs server stats
      if (ssh) {
        try {
          const res = await fetch(`http://localhost:5001/api/logs/stats?serverId=${serverId}`);
          if (res.ok) {
            const data = await res.json();
            setMetrics((prev) => ({
              ...prev,
              logs: {
                status: "Online",
                uptime: data.uptime ?? "--",
                storage: data.storage ?? "--",
              },
            }));
          } else {
            setMetrics((prev) => ({
              ...prev,
              logs: { status: "Offline", uptime: "--", storage: "--" },
            }));
          }
        } catch {
          setMetrics((prev) => ({
            ...prev,
            logs: { status: "Offline", uptime: "--", storage: "--" },
          }));
        }
      } else {
        setMetrics((prev) => ({
          ...prev,
          logs: { status: null, uptime: null, storage: null },
        }));
      }

      // Fetch Oracle/calls server stats
      if (oracle) {
        try {
          const res = await fetch(`http://localhost:5001/api/calls/metrics?serverId=${serverId}`);
          if (res.ok) {
            const data = await res.json();
            setMetrics((prev) => ({
              ...prev,
              calls: {
                status: "Online",
                active: data.active != null ? String(data.active) : "--",
                queue: data.queue != null ? String(data.queue) : "--",
                cpu: data.cpu != null ? `${data.cpu}%` : "--",
              },
            }));
          } else {
            setMetrics((prev) => ({
              ...prev,
              calls: { status: "Offline", active: "--", queue: "--", cpu: "--" },
            }));
          }
        } catch {
          setMetrics((prev) => ({
            ...prev,
            calls: { status: "Offline", active: "--", queue: "--", cpu: "--" },
          }));
        }
      } else {
        setMetrics((prev) => ({
          ...prev,
          calls: { status: null, active: null, queue: null, cpu: null },
        }));
      }
    };

    fetchMetrics();
  }, [ssh, oracle, serverId]);

  // Display value: null = not connected → show "--"
  const d = (val: string | null) => val ?? "--";

  const serverCards = [
    {
      title: "Logs Server",
      subtitle: "System logs & events",
      icon: HardDrive,
      color: "blue",
      href: `/server/${serverId}/logs-upload`,
      connected: ssh,
      connectionLabel: "SSH",
      stats: [
        { key: "Uptime", value: d(metrics.logs.uptime) },
        { key: "Storage", value: d(metrics.logs.storage) },
      ],
      progressLabel: "Storage Used",
      progressValue: metrics.logs.storage,
      progressColor: "bg-blue-500",
      statusLabel:
        metrics.logs.status === "Online"
          ? "Online"
          : metrics.logs.status === "Offline"
          ? "Offline"
          : "Not Connected",
      statusOnline: metrics.logs.status === "Online",
    },
    {
      title: "Calls Server",
      subtitle: "Call records & analytics",
      icon: Network,
      color: "green",
      href: `/server/${serverId}/call-upload`,
      connected: oracle,
      connectionLabel: "Oracle DB",
      stats: [
        { key: "Active", value: d(metrics.calls.active) },
        { key: "Queue", value: d(metrics.calls.queue) },
      ],
      progressLabel: "CPU Usage",
      progressValue: metrics.calls.cpu,
      progressColor: "bg-green-500",
      statusLabel:
        metrics.calls.status === "Online"
          ? "Online"
          : metrics.calls.status === "Offline"
          ? "Offline"
          : "Not Connected",
      statusOnline: metrics.calls.status === "Online",
    },
  ];

  return (
    <div
      className={`min-h-screen ${
        isDark
          ? "bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 text-white"
          : "bg-linear-to-br from-slate-50 via-slate-100 to-slate-50 text-slate-900"
      }`}
    >
      <GlobalHeader
        title={`${displayName} Servers`}
        subtitle={`Server ID: ${serverId}`}
        showBack
        backHref="/present-adms"
        connections={[
          { label: "SSH Service", type: "ssh", connected: ssh },
          { label: "Oracle DB", type: "oracle", connected: oracle },
        ]}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Page Title */}
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-4xl font-bold bg-linear-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent mb-3"
          >
            ADMS Servers
          </motion.h2>
          <p className="text-slate-500 text-sm md:text-base">
            Select a server to view real-time logs and call analytics.
          </p>
        </div>

        {/* Server Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {serverCards.map((card, index) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(card.href)}
              className={`relative group cursor-pointer rounded-2xl p-6 border transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                isDark
                  ? card.color === "blue"
                    ? "bg-slate-900/70 border-blue-500/40 hover:border-blue-400"
                    : "bg-slate-900/70 border-emerald-500/40 hover:border-emerald-400"
                  : card.color === "blue"
                  ? "bg-white border-blue-100 hover:border-blue-300"
                  : "bg-white border-emerald-100 hover:border-emerald-300"
              }`}
            >
              {/* Status Indicator */}
              <div className="absolute top-4 right-4 flex items-center gap-2 text-xs">
                <span
                  className={`w-2 h-2 rounded-full ${
                    card.statusOnline
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-slate-400"
                  }`}
                />
                <span
                  className={`font-medium ${
                    card.statusOnline
                      ? isDark
                        ? "text-emerald-300"
                        : "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  {card.statusLabel}
                </span>
              </div>

              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div
                  className={`p-4 rounded-xl ${
                    card.color === "blue"
                      ? "bg-blue-500/10 text-blue-500"
                      : "bg-emerald-500/10 text-emerald-500"
                  }`}
                >
                  <card.icon className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{card.title}</h3>
                  <p className="text-xs text-slate-500">{card.subtitle}</p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {card.stats.map(({ key, value }) => (
                  <div
                    key={key}
                    className={`rounded-lg p-3 ${
                      isDark
                        ? "bg-slate-900/60"
                        : "bg-slate-50 border border-slate-100"
                    }`}
                  >
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">
                      {key}
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        value === "--" ? "text-slate-400" : ""
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">{card.progressLabel}</span>
                  <span className="font-medium text-slate-500">
                    {card.progressValue ?? "--"}
                  </span>
                </div>
                <div
                  className={`h-2 rounded-full overflow-hidden ${
                    isDark ? "bg-slate-800" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${card.progressColor}`}
                    style={{
                      width:
                        card.progressValue && card.progressValue !== "--"
                          ? card.progressValue
                          : "0%",
                    }}
                  />
                </div>
              </div>

              {/* Not connected notice */}
              {!card.connected && (
                <p className="mt-3 text-[11px] text-slate-400 text-center">
                  Connect via {card.connectionLabel} to see live stats
                </p>
              )}

              {/* Action Button */}
              <div
                className={`mt-6 pt-4 border-t ${
                  isDark ? "border-slate-800" : "border-slate-200"
                }`}
              >
                <button
                  className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                    card.color === "blue"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                >
                  Access Server
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
