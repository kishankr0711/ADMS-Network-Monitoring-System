
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { 
  Server, 
  Database, 
  Calendar,
  Search,
  MessageSquare, 
  X, 
  Send, 
  Bot, 
  User,
  Wifi,
  WifiOff,
  ArrowLeft,
  Network,
  Users,
  Clock,
  Download,
  Filter,
  Loader2,
  Phone,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isRealTime?: boolean;
  dataSource?: string;
}

interface CallRecord {
  id: string;
  callId: string;
  callerNumber: string;
  startTime: string;
  duration: number;
  status: 'COMPLETED' | 'FAILED' | 'ACTIVE';
  type: string;
}

export default function CallsServerPage() {
  const params = useParams();
  const router = useRouter();
  const serverId = params.id as string;

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [callData, setCallData] = useState<CallRecord[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  // Chatbot states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [metrics, setMetrics] = useState({ active: 0, queue: 0, cpu: 0, completed: 0, totalRecords: 0 });
  
  // oracle status
  const [oracleStatus, setOracleStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');
  const [oracleError, setOracleError] = useState<string>('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Set default dates (last 5 days)
  useEffect(() => {
    const today = new Date();
    const fiveDaysAgo = new Date(today.getTime() - (5 * 24 * 60 * 60 * 1000));
    
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(fiveDaysAgo.toISOString().split('T')[0]);
  }, []);

  // WebSocket connection
  useEffect(() => {
    if (!chatOpen) return;
    
    const ws = new WebSocket(`ws://localhost:5001/ws/calls/${serverId}`);
    wsRef.current = ws;
    
    ws.onopen = () => {
      setIsConnected(true);
      addBotMessage('📞 Connected to Oracle Call Database. I can help you analyze call records, check active calls, and generate reports from the power distribution network.');
    };
    
    ws.onclose = () => setIsConnected(false);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setIsTyping(false);
      
      if (data.type === 'metrics') {
        setMetrics(data.metrics);
      } else {
        addBotMessage(data.response, data.isRealTime, data.dataSource);
      }
    };
    
    const interval = setInterval(() => {
      ws.send(JSON.stringify({ type: 'get_metrics' }));
    }, 3000);
    
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, [chatOpen, serverId]);

  // Oracle status panel
  useEffect(() => {
    checkOracleStatus();
  }, []);

  const checkOracleStatus = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/oracle/status');
      const data = await res.json();
      
      if (data.connected) {
        setOracleStatus('connected');
        setOracleError('');
      } else {
        setOracleStatus('disconnected');
        setOracleError(data.error || 'Oracle not configured');
      }
    } catch (e) {
      setOracleStatus('disconnected');
      setOracleError('Backend not running');
    }
  };

  const connectOracle = async () => {
    try {
      const res = await fetch('http://localhost:5001/api/oracle/connect', { method: 'POST' });
      const data = await res.json();
      checkOracleStatus();
      return data.success;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addBotMessage = (text: string, isRealTime = false, dataSource = 'Oracle Database') => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text,
      sender: 'bot',
      timestamp: new Date(),
      isRealTime,
      dataSource
    }]);
  };

  const fetchCallRecords = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    setLoading(true);
    
    try {
      // This will connect to Oracle DB via backend
      const response = await fetch(`http://localhost:5001/api/calls/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serverId,
          startDate,
          endDate,
          database: 'oracle'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCallData(data.records || []);
        setMetrics(prev => ({ ...prev, totalRecords: data.total || 0 }));
        setShowResults(true);
        
        // Notify via WebSocket
        wsRef.current?.send(JSON.stringify({
          type: 'fetch_complete',
          count: data.total,
          dateRange: `${startDate} to ${endDate}`
        }));
        
        addBotMessage(`✅ Fetched ${data.total} call records from Oracle database for period ${startDate} to ${endDate}`, true, 'Oracle DB');
      }
    } catch (error) {
      console.error("Fetch error:", error);
      // For demo, show sample data
      const sampleData: CallRecord[] = [
        { id: '1', callId: 'CALL-2024-001', callerNumber: '98XXXX1234', startTime: '2024-02-18 09:30:00', duration: 245, status: 'COMPLETED', type: 'OUTAGE' },
        { id: '2', callId: 'CALL-2024-002', callerNumber: '91XXXX5678', startTime: '2024-02-18 10:15:00', duration: 180, status: 'COMPLETED', type: 'BILLING' },
        { id: '3', callId: 'CALL-2024-003', callerNumber: '87XXXX9012', startTime: '2024-02-18 11:00:00', duration: 320, status: 'ACTIVE', type: 'COMPLAINT' },
      ];
      setCallData(sampleData);
      setShowResults(true);
      addBotMessage(`📊 Showing sample data. Oracle connection will be configured by your mentor for production.`, true, 'Demo Mode');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = () => {
    if (!inputMsg.trim() || !wsRef.current) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      text: inputMsg,
      sender: 'user',
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setIsTyping(true);
    
    wsRef.current.send(JSON.stringify({
      type: 'query',
      message: inputMsg,
      serverId,
      serverType: 'calls'
    }));
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'COMPLETED': return 'bg-green-500';
      case 'FAILED': return 'bg-red-500';
      case 'ACTIVE': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const quickQueries = [
    "Active calls now",
    "Average wait time",
    "Failed calls today",
    "Peak hours analysis"
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
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
                <div className="p-2 bg-green-600 rounded-lg">
                  <Network className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Call SERVER</h1>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Database className="w-3 h-3" />
                    {serverId} • Oracle Database Connection
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Active:</span>
                <span className="font-mono text-slate-400">
                  {oracleStatus === 'connected' ? metrics.active : '--'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="text-slate-400">Queue:</span>
                <span className="font-mono text-slate-400">
                  {oracleStatus === 'connected' ? metrics.queue : '--'}
                </span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-slate-700 rounded-full">
                <span className={`w-2 h-2 rounded-full ${oracleStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-xs ${oracleStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>
                  {oracleStatus === 'connected' ? 'Oracle Online' : 'Oracle Offline'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Range Selector */}
        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-green-400" />
            <h2 className="text-xl font-semibold">Search Call Records</h2>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-green-500"
              />
            </div>
            
            <button
              onClick={fetchCallRecords}
              disabled={loading || oracleStatus !== 'connected'}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Querying Oracle...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  {oracleStatus === 'connected' ? 'Fetch from Oracle' : 'Connect Oracle First'}
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-slate-500 mt-4 flex items-center gap-1">
            <Database className="w-3 h-3" />
            Connected to Power Distribution Company Oracle Database • Real-time Query
          </p>
        </div>

        {/* Results Table */}
        <AnimatePresence>
          {showResults && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden mb-6"
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold">Call Records ({metrics.totalRecords || callData.length} records)</h3>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm flex items-center gap-2 transition-colors">
                    <Filter className="w-4 h-4" />
                    Filter
                  </button>
                  <button className="px-3 py-1.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm flex items-center gap-2 transition-colors">
                    <Download className="w-4 h-4" />
                    Export
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-700/50 text-slate-300">
                    <tr>
                      <th className="px-4 py-3 text-left">Call ID</th>
                      <th className="px-4 py-3 text-left">Caller Number</th>
                      <th className="px-4 py-3 text-left">Start Time</th>
                      <th className="px-4 py-3 text-left">Duration (sec)</th>
                      <th className="px-4 py-3 text-left">Type</th>
                      <th className="px-4 py-3 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {callData.map((call) => (
                      <tr key={call.id} className="hover:bg-slate-700/30 transition-colors">
                        <td className="px-4 py-3 font-mono text-green-400">{call.callId}</td>
                        <td className="px-4 py-3">{call.callerNumber}</td>
                        <td className="px-4 py-3 text-slate-300">{call.startTime}</td>
                        <td className="px-4 py-3">{call.duration}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {call.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1.5`}>
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(call.status)}`} />
                            {call.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Metrics Sidebar */}
        <div className="grid md:grid-cols-4 gap-6">
          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
            <h3 className="font-semibold mb-4 text-slate-300">Call Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-500">
                  {oracleStatus === 'connected' ? metrics.active : '--'}
                </p>
                <p className="text-xs text-slate-500 mt-1">Active Calls</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-slate-500">
                  {oracleStatus === 'connected' ? metrics.queue : '--'}
                </p>
                <p className="text-xs text-slate-500 mt-1">In Queue</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 md:col-span-3">
            <h3 className="font-semibold mb-4 text-slate-300 flex items-center gap-2">
              <Database className="w-4 h-4" />
              Oracle Database Status
            </h3>
            
            <div className="flex items-center gap-4 mb-4">
              {oracleStatus === 'checking' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 rounded-lg">
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span className="text-yellow-400 text-sm">Checking...</span>
                </div>
              )}
              
              {oracleStatus === 'connected' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm">Oracle Connected</span>
                </div>
              )}
              
              {oracleStatus === 'disconnected' && (
                <div className="flex items-center gap-2 px-4 py-2 bg-red-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  <span className="text-red-400 text-sm">Not Connected</span>
                </div>
              )}
              
              {oracleStatus === 'disconnected' && (
                <button
                  onClick={connectOracle}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                >
                  Retry Connection
                </button>
              )}
            </div>
            
            {oracleError && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 mb-4">
                <p className="text-red-300 text-sm">{oracleError}</p>
              </div>
            )}
            
            <div className="text-sm text-slate-400 space-y-1">
              <p>🔧 <strong></strong> Edit backend/app.py</p>
              <p>• Set ORACLE_USER, ORACLE_PASSWORD, ORACLE_DSN</p>
              <p>• Modify get_calls_query() and get_metrics_query()</p>
              <p>• Update table names and columns as per your schema</p>
            </div>
          </div>
        </div>
      </main>

      {/* Chatbot Toggle */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setChatOpen(!chatOpen)}
        className={`
          fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50
          ${chatOpen ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}
        `}
      >
        {chatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {chatOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Oracle DB Assistant</h3>
                    <p className="text-xs text-green-200">Power Distribution Network</p>
                  </div>
                </div>
                {isConnected ? <Wifi className="w-4 h-4 text-green-300" /> : <WifiOff className="w-4 h-4 text-red-300" />}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`
                    max-w-[85%] rounded-2xl px-4 py-3 text-sm
                    ${msg.sender === 'user' 
                      ? 'bg-green-600 text-white rounded-br-none' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }
                  `}>
                    <div className="flex items-start gap-2">
                      {msg.sender === 'bot' && <Bot className="w-4 h-4 mt-0.5 text-green-500 shrink-0" />}
                      <div className="flex-1">
                        <p className="leading-relaxed">{msg.text}</p>
                        {msg.dataSource && (
                          <div className="flex items-center gap-1 mt-2 text-[10px] opacity-70">
                            <Database className="w-3 h-3" />
                            <span>{msg.dataSource}</span>
                            {msg.isRealTime && (
                              <span className="flex items-center gap-1 text-green-600 ml-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                LIVE
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {msg.sender === 'user' && <User className="w-4 h-4 mt-0.5 text-green-200 shrink-0" />}
                    </div>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-4 py-2 bg-white border-t border-gray-100 flex gap-2 overflow-x-auto">
              {quickQueries.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInputMsg(q);
                    setTimeout(sendMessage, 100);
                  }}
                  className="whitespace-nowrap px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMsg}
                  onChange={(e) => setInputMsg(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Ask about Oracle DB data..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputMsg.trim()}
                  className="px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors"
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