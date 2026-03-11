"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { GlobalHeader } from "../../components/GlobalHeader";

// ── Inline SVG icons (no extra deps) ──────────────────────────────────────
const Icon = ({ d, size = 16, className = "" }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

const icons: Record<string, string> = {
  whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z M19.59 4.41A10.94 10.94 0 0 0 12 2C6.477 2 2 6.477 2 12c0 1.89.487 3.663 1.339 5.197L2 22l4.867-1.312A10.94 10.94 0 0 0 12 22c5.523 0 10-4.477 10-10 0-2.697-1.034-5.232-2.41-7.59z",
  phone: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.41 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.34 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l1.28-1.28a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
  bot: "M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2zM7 17v4M17 17v4M9 21h6M7 14h.01M17 14h.01",
  mobile: "M17 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zM12 18h.01",
  portal: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 0 0 1 1h3m10-11l2 2m-2-2v10a1 1 0 0 0-1 1h-3m-6 0a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1m0 0h6",
  ivrs: "M9 19V6l12-3v13M9 19c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm12-3c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2z",
  hr: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 8 0 4 4 0 0 0-8 0M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  warehouse: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  crm: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z",
  sms: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  server: "M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0H4m4-7h.01M8 13h.01",
  network: "M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  cpu: "M9 3H5a2 2 0 0 0-2 2v4m6-6h6m-6 0v18m6-18h4a2 2 0 0 1 2 2v4m-6-6v18m6-18v4m0 0H3m18 0v10a2 2 0 0 1-2 2h-4m6-12H3m0 12v-4m0 4h4",
  iot: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01",
  database: "M20 14c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h16zM12 17h.01M20 8c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V9c0-.55.45-1 1-1h16zM12 11h.01M20 2c.55 0 1 .45 1 1v4c0 .55-.45 1-1 1H4c-.55 0-1-.45-1-1V3c0-.55.45-1 1-1h16zM12 5h.01",
  grid: "M22 12H2M12 2v20M2 7h20M2 17h20",
  analytics: "M18 20V10M12 20V4M6 20v-6",
  power: "M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10",
  zap: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  layers: "M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  arrow: "M5 12h14M12 5l7 7-7 7",
};

const channelConfig = [
  { label: "WhatsApp", icon: "whatsapp", color: "text-green-500", bg: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" },
  { label: "Miss Call Service", icon: "phone", color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800" },
  { label: "Chatbot", icon: "bot", color: "text-violet-500", bg: "bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800" },
  { label: "Customer Mobile App", icon: "mobile", color: "text-orange-500", bg: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800" },
  { label: "Customer E-Portal", icon: "portal", color: "text-cyan-500", bg: "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800" },
  { label: "IVRS", icon: "ivrs", color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800" },
  { label: "HR Database", icon: "hr", color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800" },
  { label: "WMS (SAP PM)", icon: "warehouse", color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" },
  { label: "CRM/CIS (SAP ISU)", icon: "crm", color: "text-teal-500", bg: "bg-teal-50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800" },
  { label: "SMS Service", icon: "sms", color: "text-pink-500", bg: "bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800" },
];

const integrationLayer = [
  { protocol: "SAP PI", desc: "Web Services", icon: "layers", badge: "MIDDLEWARE" },
  { protocol: "XML / GML", desc: "GIS interfaces", icon: "grid", badge: "GIS" },
  { protocol: "ICCP", desc: "SLDC / Field Force links", icon: "network", badge: "SCADA" },
  { protocol: "C-60870-5-104", desc: "OT test environment", icon: "shield", badge: "OT" },
];

const fieldDevices = [
  { label: "FPI / FRTU", sub: "11kV network", icon: "zap" },
  { label: "RTU", sub: "33kV & above", icon: "cpu" },
  { label: "GIS", sub: "Electric Office", icon: "grid" },
  { label: "LT IoT", sub: "Web services", icon: "iot" },
];

const opSystems = [
  { label: "HES / MDMS", sub: "Metering data management", icon: "database" },
  { label: "BES & Micro-grid", sub: "Energy storage systems", icon: "power" },
  { label: "OT Test Env", sub: "C-60870-5-104", icon: "server" },
];

const analytics = [
  { label: "Big Data", sub: "Reliability reports", icon: "analytics" },
  { label: "Power Manager", sub: "Load management", icon: "zap" },
  { label: "SLDC", sub: "State Load Dispatch", icon: "layers" },
  { label: "Field Force App", sub: "Mobile automation", icon: "mobile" },
  { label: "ePSC Portal", sub: "Held Crew management", icon: "portal" },
];

// ── Stat card ──────────────────────────────────────────────────────────────
function StatBadge({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className={`text-xl font-bold ${color}`}>{value}</span>
      <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">{label}</span>
    </div>
  );
}

export default function PresentADMSPage() {
  const router = useRouter();
  const [isDark, setIsDark] = useState(false);

  // ── Sync dark-mode state from <html> class changes ────────────────────────
  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.classList.contains("dark");
      setIsDark(dark);

      // Also keep body in sync so no white flash behind content
      document.body.style.backgroundColor = dark ? "rgb(15 23 42)" : "rgb(248 250 252)";
      document.body.style.color = dark ? "rgb(241 245 249)" : "rgb(15 23 42)";
    };

    update(); // run once on mount

    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    // key={isDark} forces React to re-render the entire subtree when dark mode
    // changes — this ensures all Tailwind dark: classes are re-evaluated.
    <div
      key={isDark ? "dark" : "light"}
      className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300"
    >
      <GlobalHeader
        title="Present ADMS Integrations"
        subtitle="High-level view of ADMS and connected systems"
        showBack
        backHref="/"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── KPI strip ───────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { value: "10", label: "Customer Channels", color: "text-blue-500" },
            { value: "4", label: "Integration Protocols", color: "text-violet-500" },
            { value: "3", label: "Voltage Levels", color: "text-amber-500" },
            { value: "12+", label: "Connected Systems", color: "text-emerald-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-4 flex flex-col items-center justify-center gap-1">
              <StatBadge {...s} />
            </div>
          ))}
        </section>

        {/* ── Top row ─────────────────────────────────────────────────────── */}
        <section className="grid lg:grid-cols-3 gap-6">

          {/* Customer Channels */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <Icon d={icons.mobile} size={14} />
              </span>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Customer Channels</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Interfaces through which customers and field users interact with ADMS.
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {channelConfig.map(({ label, icon, color, bg }) => (
                <div key={label} className={`rounded-xl border ${bg} px-3 py-2 flex items-center gap-2 transition-transform hover:scale-[1.02]`}>
                  <Icon d={icons[icon]} size={13} className={color} />
                  <span className="font-medium text-slate-700 dark:text-slate-200 leading-tight">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Platform */}
          <div className="lg:col-span-1 rounded-2xl border border-blue-200 dark:border-blue-700 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 shadow-lg p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
            {/* decorative rings */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-64 h-64 rounded-full border-2 border-white" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
              <div className="w-44 h-44 rounded-full border-2 border-white" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 mb-3">
                <Icon d={icons.zap} size={22} className="text-yellow-300" />
              </span>
              <p className="text-[10px] uppercase tracking-widest text-blue-200 font-semibold mb-1">Core Platform</p>
              <h2 className="text-base font-bold text-white mb-2 leading-snug">
                Advanced Distribution<br />Management System
              </h2>

              {/* Voltage level badges */}
              <div className="flex gap-2 mb-4 flex-wrap justify-center">
                {["OMS · 440V & below", "DMS · 11kV", "SCADA · 33kV+"].map((v) => (
                  <span key={v} className="rounded-full bg-white/15 border border-white/25 text-white text-[10px] font-medium px-2.5 py-0.5">{v}</span>
                ))}
              </div>

              <button
                onClick={() => router.push("/server/adms-server")}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-semibold bg-white text-blue-700 hover:bg-blue-50 shadow-md transition-all hover:scale-105 active:scale-95"
              >
                Open ADMS Server View
                <Icon d={icons.arrow} size={12} />
              </button>
            </div>
          </div>

          {/* Integration Layer */}
          <div className="lg:col-span-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400">
                <Icon d={icons.network} size={14} />
              </span>
              <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Integration Layer</h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Enterprise middleware and protocols used to integrate ADMS with other operational systems.
            </p>
            <div className="space-y-2.5">
              {integrationLayer.map(({ protocol, desc, icon, badge }) => (
                <div key={protocol} className="flex items-center gap-3 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-3 py-2.5 hover:border-violet-300 dark:hover:border-violet-600 transition-colors">
                  <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center text-violet-500">
                    <Icon d={icons[icon]} size={13} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{protocol}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{desc}</p>
                  </div>
                  <span className="text-[9px] font-bold tracking-wider text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700 rounded px-1.5 py-0.5">
                    {badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Flow indicator ───────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
          <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Connected Systems</span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
        </div>

        {/* ── Bottom grid ──────────────────────────────────────────────────── */}
        <section className="grid md:grid-cols-3 gap-6">

          {/* Field & Network Devices */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-amber-500">
                <Icon d={icons.zap} size={15} />
              </span>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Field & Network Devices</h3>
            </div>
            <div className="space-y-2">
              {fieldDevices.map(({ label, sub, icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 px-3 py-2">
                  <Icon d={icons[icon]} size={13} className="text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Systems */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500">
                <Icon d={icons.server} size={15} />
              </span>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Operational Systems</h3>
            </div>
            <div className="space-y-2">
              {opSystems.map(({ label, sub, icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 px-3 py-2">
                  <Icon d={icons[icon]} size={13} className="text-emerald-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Analytics & External Systems */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-rose-500">
                <Icon d={icons.analytics} size={15} />
              </span>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-100">Analytics & External Systems</h3>
            </div>
            <div className="space-y-2">
              {analytics.map(({ label, sub, icon }) => (
                <div key={label} className="flex items-center gap-3 rounded-lg bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-800/30 px-3 py-2">
                  <Icon d={icons[icon]} size={13} className="text-rose-500 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">{label}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}