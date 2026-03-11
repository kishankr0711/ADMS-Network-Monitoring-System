"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Terminal,
  Activity,
  AlertCircle,
  ServerIcon,
  BarChart3,
  Loader2,
  Settings,
  RefreshCw,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  Legend,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
interface RTProcessData {
  /** ISO timestamp string */
  timestamp: string;
  /** Epoch milliseconds */
  timestampMs: number;
  /** Milliseconds between this process and the previous one. null for the first. */
  differenceMs: number | null;
  processCount?: number;
  /** True when differenceMs > 5 minutes (300 000 ms) */
  isAlert?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function msToLabel(ms: number | null): string {
  if (ms == null) return "—";
  if (ms >= 3_600_000) return `${(ms / 3_600_000).toFixed(2)} h`;
  if (ms >= 60_000) return `${(ms / 60_000).toFixed(2)} min`;
  if (ms >= 1_000) return `${(ms / 1_000).toFixed(2)} s`;
  return `${ms.toFixed(0)} ms`;
}

function formatTimeAxis(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function formatTimeFull(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  } catch {
    return ts;
  }
}

// Map raw backend items → RTProcessData
function mapItems(raw: any[]): RTProcessData[] {
  return raw.map((p, i) => {
    const diff =
      p.differenceMs ??
      p.gapMs ??
      (p.gapMinutes != null ? p.gapMinutes * 60_000 : null);
    return {
      timestamp: p.timestamp,
      timestampMs: p.timestampMs ?? 0,
      differenceMs: diff,
      processCount: p.processCount ?? i + 1,
      isAlert: p.isAlert ?? (diff != null && diff > 300_000),
    };
  });
}

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d: RTProcessData = payload[0]?.payload;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-slate-700 mb-1">
        {formatTimeFull(label ?? d?.timestamp ?? "")}
      </p>
      <p className="text-slate-600">
        Δ Time:{" "}
        <span
          className={`font-bold ${
            (d?.differenceMs ?? 0) > 300_000 ? "text-red-600" : "text-blue-600"
          }`}
        >
          {msToLabel(d?.differenceMs ?? null)}
        </span>
      </p>
      {d?.processCount != null && (
        <p className="text-slate-400 mt-0.5">Process #{d.processCount}</p>
      )}
      {d?.isAlert && (
        <p className="text-red-500 font-semibold mt-1">⚠️ Gap &gt; 5 min!</p>
      )}
    </div>
  );
};

// ── Custom dot — red circle for alerts, tiny blue otherwise ──────────────────
const CustomDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  if (payload?.isAlert) {
    return (
      <circle cx={cx} cy={cy} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} />
    );
  }
  return <circle cx={cx} cy={cy} r={2} fill="#3b82f6" fillOpacity={0.6} />;
};

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LogAnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;

  const [data, setData] = useState<RTProcessData[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);

  // Derived stats
  const totalProcesses = data.length;
  const alerts = data.filter((d) => (d.differenceMs ?? 0) > 300_000);
  const maxGap = data.reduce(
    (m, d) => Math.max(m, d.differenceMs ?? 0),
    0
  );

  // ── Load from sessionStorage (set by fetch page after successful SSH pull) ──
  const [realStats, setRealStats] = useState<any>(null);
  const [alertPoints, setAlertPoints] = useState<RTProcessData[]>([]);

  const loadFromSession = useCallback(() => {
    try {
      const raw  = sessionStorage.getItem("rtProcessAnalysis");  // chart buckets
      const date = sessionStorage.getItem("selectedLogDate");
      const rawStats  = sessionStorage.getItem("logStats");
      const rawAlerts = sessionStorage.getItem("alertPoints");

      if (date) setSelectedDate(date);
      if (rawStats)  { try { setRealStats(JSON.parse(rawStats)); }  catch {} }
      if (rawAlerts) { try { setAlertPoints(mapItems(JSON.parse(rawAlerts))); } catch {} }

      if (raw) {
        const parsed = JSON.parse(raw) as any[];
        const mapped = mapItems(parsed);
        setData(mapped);
        setLastUpdate(new Date());
        setLoading(false);
        return true;
      }
    } catch {
      /* ignore */
    }
    return false;
  }, []);

  useEffect(() => {
    const hadData = loadFromSession();
    if (!hadData) {
      // No session data — try fetching from backend HTTP endpoint
      fetch(`http://localhost:5001/api/logs/analysis/${serverId}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.history?.length) {
            setData(mapItems(d.history));
            setLastUpdate(new Date());
          }
        })
        .catch(() => {/* backend not running */})
        .finally(() => setLoading(false));
    }
  }, [serverId, loadFromSession]);

  // ── WebSocket for real-time streaming ────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket(
      `ws://localhost:5001/ws/logs/analysis/${serverId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
      ws.send(JSON.stringify({ type: "get_analysis" }));
    };
    ws.onclose = () => setWsConnected(false);

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);

      if (msg.type === "analysis_data" && msg.history?.length > 0) {
        // Only overwrite session data if WS returns MORE data than we already have
        setData((prev) => {
          const mapped = mapItems(msg.history);
          return mapped.length >= prev.length ? mapped : prev;
        });
        setLastUpdate(new Date());
        setLoading(false);
      } else if (msg.type === "rt_process_data") {
        const point = mapItems([msg])[0];
        setData((prev) => {
          if (prev.find((p) => p.timestampMs === point.timestampMs)) return prev;
          return [...prev, point];
        });
        setLastUpdate(new Date());
      }
    };

    return () => ws.close();
  }, [serverId]);

  // ── Alert threshold reference line value ─────────────────────────────────
  const ALERT_THRESHOLD = 300_000; // 5 min in ms

  // ── Y-axis domain: ensure the threshold line is always visible ────────────
  const yMax = Math.max(maxGap * 1.1, ALERT_THRESHOLD * 1.5);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() =>
                  router.push(`/server/${serverId}/logs-upload`)
                }
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900">
                    Log Analytics
                  </h1>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    Process time-difference graph · full day
                    {selectedDate && ` · ${selectedDate}`}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full">
                <ServerIcon className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600 text-xs">
                  Server: {serverId}
                </span>
              </div>
              {/* Reload from session */}
              <button
                onClick={() => {
                  setLoading(true);
                  setTimeout(() => {
                    loadFromSession();
                    setLoading(false);
                  }, 200);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="Reload session data"
              >
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h2 className="font-semibold text-slate-900 mb-2">
                Log Analytics
              </h2>
              <p className="text-sm text-slate-500 mb-6">
                Millisecond gap between consecutive process executions
              </p>
              <nav className="space-y-2">
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium">
                  <Activity className="w-4 h-4" />
                  Process Δ Time
                  <span className="ml-auto text-xs bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                    Live
                  </span>
                </button>
              </nav>

              {/* Quick legend */}
              <div className="mt-6 space-y-2 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                  Normal gap
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
                  Alert: gap &gt; 5 min
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 border-t-2 border-dashed border-red-400 shrink-0" />
                  Threshold line
                </div>
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="lg:col-span-3 space-y-6">
            {/* ── Chart ──────────────────────────────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      Process Time Difference (ms)
                    </h2>
                    <p className="text-sm text-slate-500">
                      Each point = gap to the previous process · spikes = delays
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                {loading ? (
                  <div className="h-96 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <p className="text-slate-500 text-sm">
                      Loading full-day process data…
                    </p>
                  </div>
                ) : data.length === 0 ? (
                  <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <BarChart3 className="w-12 h-12 opacity-30" />
                    <p className="text-sm">
                      No data yet. Fetch logs from the previous page first.
                    </p>
                    <button
                      onClick={() =>
                        router.push(`/server/${serverId}/logs-upload`)
                      }
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                    >
                      Go to Fetch Page
                    </button>
                  </div>
                ) : (
                  <>
                    {/* 
                      Using ComposedChart with Area (for fill) + Line (for dots)
                      so spikes are visually dramatic. 
                    */}
                    <div className="h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={data}
                          margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />

                          <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTimeAxis}
                            stroke="#94a3b8"
                            fontSize={11}
                            interval="preserveStartEnd"
                            minTickGap={60}
                          />

                          <YAxis
                            stroke="#94a3b8"
                            fontSize={11}
                            tickFormatter={(v) => msToLabel(v)}
                            domain={[0, yMax]}
                            width={80}
                          />

                          <Tooltip content={<CustomTooltip />} />

                          {/* 5-min alert threshold */}
                          <ReferenceLine
                            y={ALERT_THRESHOLD}
                            stroke="#ef4444"
                            strokeDasharray="6 3"
                            label={{
                              value: "⚠ 5 min",
                              position: "insideTopRight",
                              fill: "#ef4444",
                              fontSize: 11,
                            }}
                          />

                          {/* Filled area — makes spikes dramatically visible */}
                          <Area
                            type="monotone"
                            dataKey="differenceMs"
                            stroke="#3b82f6"
                            strokeWidth={1.5}
                            fill="#3b82f6"
                            fillOpacity={0.15}
                            dot={<CustomDot />}
                            activeDot={{ r: 5, fill: "#1d4ed8" }}
                            name="Δ Time (ms)"
                            connectNulls={false}
                            isAnimationActive={data.length < 5000}
                          />

                          {/* Invisible scatter layer purely to plot red dots for alerts */}
                          <Scatter
                            data={data.filter((d) => d.isAlert)}
                            dataKey="differenceMs"
                            fill="#ef4444"
                            name="Alert"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    <p className="text-center text-xs text-slate-400 mt-2">
                      {data.length.toLocaleString()} data points ·{" "}
                      {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
                    </p>
                  </>
                )}
              </div>
            </motion.div>

            {/* ── Stats Cards (3 cards only — no Last Loaded) ─────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Real total — from backend stats, not chart bucket count */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-500">Total Processes</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {realStats?.total_processes != null
                    ? realStats.total_processes.toLocaleString()
                    : totalProcesses > 0 ? totalProcesses.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-slate-400 mt-1">full day · no limit</p>
              </div>

              {/* Chart buckets — 1 per hour, max 24 */}
              <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="w-4 h-4 text-indigo-500" />
                  <span className="text-sm text-slate-500">Chart Buckets</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">
                  {totalProcesses > 0 ? totalProcesses.toLocaleString() : "—"}
                </p>
                <p className="text-xs text-slate-400 mt-1">1 bucket / hour · max 24</p>
              </div>

              {/* Total alerts */}
              <div
                className={`rounded-xl p-4 border shadow-sm ${
                  (realStats?.total_alerts ?? alertPoints.length) > 0
                    ? "bg-red-50 border-red-200"
                    : "bg-white border-slate-200"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle
                    className={`w-4 h-4 ${
                      (realStats?.total_alerts ?? alertPoints.length) > 0 ? "text-red-500" : "text-slate-400"
                    }`}
                  />
                  <span className="text-sm text-slate-500">Total Alerts (&gt;5 min)</span>
                </div>
                <p className={`text-2xl font-bold ${
                  (realStats?.total_alerts ?? alertPoints.length) > 0 ? "text-red-600" : "text-slate-900"
                }`}>
                  {(realStats?.total_alerts ?? alertPoints.length).toLocaleString()}
                </p>
                {realStats?.max_gap_ms != null && realStats.max_gap_ms > 0 && (
                  <p className="text-xs text-red-400 mt-1">
                    Largest: {msToLabel(realStats.max_gap_ms)}
                  </p>
                )}
              </div>
            </div>

            {/* ── Inline Alert Analysis (replaces separate dashboard page) ── */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${alertPoints.length > 0 ? "bg-red-100" : "bg-slate-100"}`}>
                    <AlertCircle className={`w-4 h-4 ${alertPoints.length > 0 ? "text-red-600" : "text-slate-400"}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Alert Analysis — {selectedDate || "Selected Day"}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Gaps &gt; 5 minutes between consecutive processes
                    </p>
                  </div>
                </div>
                {alertPoints.length > 0 && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                    {alertPoints.length} alert{alertPoints.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {alertPoints.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                    <Activity className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="font-medium text-slate-600">No alerts for this day</p>
                  <p className="text-sm mt-1">All process gaps were under 5 minutes ✓</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {alertPoints.map((ap, idx) => {
                    const gapMin = (ap.differenceMs ?? 0) / 60_000;
                    const isCritical = (ap.differenceMs ?? 0) > 600_000;
                    return (
                      <div key={ap.timestampMs ?? idx} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${isCritical ? "bg-red-500" : "bg-amber-400"}`} />
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {new Date(ap.timestamp).toLocaleTimeString("en-US", {
                                hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit"
                              })}
                            </p>
                            <p className="text-xs text-slate-400">
                              Process #{ap.processCount?.toLocaleString() ?? idx + 1}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-bold ${isCritical ? "text-red-600" : "text-amber-600"}`}>
                            {msToLabel(ap.differenceMs ?? null)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            isCritical
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}>
                            {isCritical ? "CRITICAL" : "WARNING"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </main>


    </div>
  );
}
