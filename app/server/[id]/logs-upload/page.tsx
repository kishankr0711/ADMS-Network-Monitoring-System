"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Calendar,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Wifi,
  WifiOff,
  ArrowLeft,
  HardDrive,
  Terminal,
  FileText,
  Loader2,
  Settings,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  text: string;
  sender: "user" | "bot";
  timestamp: Date;
  isRealTime?: boolean;
  dataSource?: string;
}

export default function LogsServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;

  const [customDate, setCustomDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<
    "idle" | "connecting" | "connected" | "error"
  >("idle");
  const [serverError, setServerError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Remote server config ────────────────────────────────────────────────
  // These fields were defined in state but NEVER rendered — that's why the
  // "Fetch Remote Logs" button was permanently disabled (ip was always "").
  const [remoteConfig, setRemoteConfig] = useState({
    ip: "",
    username: "",
    password: "",
    os: "linux" as "linux" | "windows",
    logPath: "/var/adm/syslog.dated",
  });

  // ── Chatbot ─────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Default date to today
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setCustomDate(today);
  }, []);

  // WebSocket (chatbot)
  useEffect(() => {
    if (!chatOpen) return;
    const ws = new WebSocket(`ws://localhost:5001/ws/logs/${serverId}`);
    wsRef.current = ws;
    ws.onopen = () => {
      setIsConnected(true);
      addBotMessage(
        "🔗 Connected to Log Server. Fill in the remote server details, pick a date, and press Fetch Remote Logs."
      );
    };
    ws.onclose = () => setIsConnected(false);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setIsTyping(false);
      addBotMessage(data.response, data.isRealTime, data.dataSource);
    };
    return () => ws.close();
  }, [chatOpen, serverId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addBotMessage = (
    text: string,
    isRealTime = false,
    dataSource = "Log Engine"
  ) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text,
        sender: "bot",
        timestamp: new Date(),
        isRealTime,
        dataSource,
      },
    ]);
  };

  // ── Main fetch ───────────────────────────────────────────────────────────
  const fetchRemoteLogs = async () => {
    if (!remoteConfig.ip || !remoteConfig.username || !customDate) {
      setServerError(
        "Please fill in Server IP, Username, and select a date first."
      );
      setServerStatus("error");
      return;
    }

    setLoading(true);
    setServerStatus("connecting");
    setServerError("");

    try {
      const response = await fetch(
        `http://localhost:5001/api/logs/fetch-remote`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            serverId,
            // Always send "custom" so backend uses the exact date
            dateRange: "custom",
            customDate,
            remoteConfig: {
              ip: remoteConfig.ip,
              username: remoteConfig.username,
              password: remoteConfig.password,
              os: remoteConfig.os,
              logPath: remoteConfig.logPath,
              // Tell backend to read every file (syslog + .debug, etc.)
              fileTypes: ["syslog", ".debug"],
            },
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setServerStatus("connected");

        // Notify chatbot WS
        wsRef.current?.send(
          JSON.stringify({
            type: "fetch_complete",
            count: data.logs?.length || 0,
            server: remoteConfig.ip,
          })
        );

        addBotMessage(
          `✅ Fetched ${data.logs?.length ?? 0} log entries from ${remoteConfig.ip} for ${customDate}`,
          true,
          "Remote Server"
        );

        // Persist for analysis page
        sessionStorage.setItem("selectedLogDate", customDate);

        // chart_data = downsampled minute buckets (<=1440 pts) — safe for browser
        if (data.rt_process_analysis) {
          sessionStorage.setItem("rtProcessAnalysis", JSON.stringify(data.rt_process_analysis));
        } else {
          sessionStorage.removeItem("rtProcessAnalysis");
        }
        // alert_points — full-precision gap>5min events
        if (data.alert_points) {
          sessionStorage.setItem("alertPoints", JSON.stringify(data.alert_points));
        }
        // real stats (total_processes = actual lakh count, not chart bucket count)
        if (data.stats) {
          sessionStorage.setItem("logStats", JSON.stringify(data.stats));
        }

        // Navigate to analysis
        router.push(`/server/${serverId}/logs-upload/analysis`);
      } else {
        setServerStatus("error");
        setServerError(data.error || "Failed to fetch logs");
      }
    } catch {
      setServerStatus("error");
      setServerError("Backend not running or connection refused (localhost:5001)");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputMsg.trim() || !wsRef.current) return;
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: inputMsg,
        sender: "user",
        timestamp: new Date(),
      },
    ]);
    setInputMsg("");
    setIsTyping(true);
    wsRef.current.send(
      JSON.stringify({ type: "query", message: inputMsg, serverId, serverType: "logs" })
    );
  };

  const configField = (
    label: string,
    key: keyof typeof remoteConfig,
    placeholder: string,
    type = "text"
  ) => (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        type={
          key === "password" ? (showPassword ? "text" : "password") : type
        }
        value={remoteConfig[key] as string}
        onChange={(e) =>
          setRemoteConfig((prev) => ({ ...prev, [key]: e.target.value }))
        }
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ── Header ── */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/server/${serverId}`)}
                className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Log SERVER</h1>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Terminal className="w-3 h-3" />
                    Remote Log Fetcher · SSH
                  </p>
                </div>
              </div>
            </div>

            {/* Connection status badge */}
            <div className="flex items-center gap-3">
              <div
                className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                  serverStatus === "connected"
                    ? "bg-green-500/20"
                    : serverStatus === "error"
                    ? "bg-red-500/20"
                    : "bg-slate-700"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    serverStatus === "connected"
                      ? "bg-green-500 animate-pulse"
                      : serverStatus === "connecting"
                      ? "bg-yellow-500 animate-pulse"
                      : serverStatus === "error"
                      ? "bg-red-500"
                      : "bg-slate-500"
                  }`}
                />
                <span
                  className={`text-xs ${
                    serverStatus === "connected"
                      ? "text-green-400"
                      : serverStatus === "connecting"
                      ? "text-yellow-400"
                      : serverStatus === "error"
                      ? "text-red-400"
                      : "text-slate-400"
                  }`}
                >
                  {serverStatus === "idle"
                    ? "Not Configured"
                    : serverStatus === "connecting"
                    ? "Connecting…"
                    : serverStatus === "connected"
                    ? `Connected`
                    : "Connection Failed"}
                </span>
              </div>

            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* ── Remote Server Config (WAS MISSING — this is why IP was always empty) ── */}
        {/* <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-5">
            <Settings className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Remote Server Configuration</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configField("Server IP / Hostname", "ip", "192.168.1.2")}
            {configField("SSH Username", "username", "root")}

            
            <div>
              <label className="block text-xs text-slate-400 mb-1">SSH Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={remoteConfig.password}
                  onChange={(e) =>
                    setRemoteConfig((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="••••••••"
                  className="w-full px-3 py-2 pr-10 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {configField("Log Directory Path", "logPath", "/var/adm/syslog.dated")}

            
            <div>
              <label className="block text-xs text-slate-400 mb-1">OS Type</label>
              <select
                value={remoteConfig.os}
                onChange={(e) =>
                  setRemoteConfig((prev) => ({
                    ...prev,
                    os: e.target.value as "linux" | "windows",
                  }))
                }
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="linux">Linux (SSH)</option>
                <option value="windows">Windows (RDP — not yet supported)</option>
              </select>
            </div>
          </div>
        </div> */}

        {/* ── Date Picker + Fetch ── */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h2 className="text-xl font-semibold">Select Date &amp; Fetch</h2>
          </div>

          {/* Error banner */}
          <AnimatePresence>
            {serverError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {serverError}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Date (full day will be fetched)</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={fetchRemoteLogs}
              disabled={loading || !remoteConfig.ip || !remoteConfig.username || !customDate}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Fetching from SSH Server..
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  Fetch Remote Logs
                </>
              )}
            </button>

            {/* View Analysis — only appears after data is ready */}
            <AnimatePresence>
              {serverStatus === "connected" && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  onClick={() => router.push(`/server/${serverId}/logs-upload/analysis`)}
                  className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <BarChart3 className="w-4 h-4" />
                  View Analysis
                </motion.button>
              )}
            </AnimatePresence>

            {serverStatus === "connected" && (
              <div className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Data ready!
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-slate-500">
            ℹ️ Full-day data (00:00:00 – 23:59:59) is fetched. No 1000-record limit. All files in the date folder are read.
          </p>
        </div>

        {/* ── Info Cards ── */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <Terminal className="w-4 h-4" />
              Connection Flow
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-xs font-bold">
                  YOU
                </div>
                <span className="text-slate-300">Your Browser (Local)</span>
              </div>
              <div className="w-0.5 h-4 bg-slate-600 ml-4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center text-xs font-bold">
                  PY
                </div>
                <span className="text-slate-300">Python Backend (localhost:5001)</span>
              </div>
              <div className="w-0.5 h-4 bg-slate-600 ml-4" />
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-slate-300">
                  Remote Server via SSH
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-300">What Gets Fetched</h3>
            <div className="text-sm text-slate-400 space-y-2">
              <p>• All files inside <code className="text-blue-300">{remoteConfig.logPath}/DD-MM-YYYY/</code></p>
              <p>• Complete file contents — no tail/head limit</p>
              <p>• Process timestamps extracted and sorted</p>
              <p>• Millisecond differences computed in Python</p>
              <p>• Gaps &gt; 5 min (300 000 ms) flagged as alerts</p>
            </div>
          </div>
        </div>
      </main>

      {/* ── Chatbot FAB ── */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setChatOpen(!chatOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50 ${
          chatOpen ? "bg-red-500 hover:bg-red-600" : "bg-blue-600 hover:bg-blue-700"
        }`}
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5" />
                  <div>
                    <h3 className="font-semibold text-sm">Log Server AI</h3>
                    <p className="text-xs text-blue-200">Remote Log Analyzer</p>
                  </div>
                </div>
                {isConnected ? (
                  <Wifi className="w-4 h-4 text-green-300" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-300" />
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      msg.sender === "user"
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {msg.sender === "bot" && (
                        <Bot className="w-4 h-4 mt-0.5 text-blue-500 shrink-0" />
                      )}
                      <p className="leading-relaxed flex-1">{msg.text}</p>
                      {msg.sender === "user" && (
                        <User className="w-4 h-4 mt-0.5 text-blue-200 shrink-0" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder="Ask about remote logs…"
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-800"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMsg.trim()}
                  className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
