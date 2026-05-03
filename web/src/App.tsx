import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, PhoneIncoming, PhoneOutgoing, Clock, CheckCircle,
  XCircle, AlertCircle, Mic, MessageSquare, Calendar,
  Users, TrendingUp, Radio, Settings, RefreshCw, Wifi, WifiOff
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const API = 'http://localhost:8000';

// Types
interface Call {
  id: string;
  from: string;
  to: string;
  duration: number;
  status: 'completed' | 'missed' | 'voicemail' | 'failed';
  transcript: string;
  intent: string;
  outcome: string;
  created_at: string;
  customer_name?: string;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_phone: string;
  service_type: string;
  scheduled_time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  notes?: string;
}

interface Stats {
  total_calls: number;
  missed_calls: number;
  appointments_booked: number;
  avg_duration: number;
  calls_today: number;
  top_intents: { intent: string; count: number }[];
}

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

// Status badge component
const StatusBadge: React.FC<{ status: Call['status'] }> = ({ status }) => {
  const config = {
    completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    missed: { label: 'Missed', icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    voicemail: { label: 'Voicemail', icon: Mic, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
    failed: { label: 'Failed', icon: AlertCircle, color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10' },
  }[status];

  const Icon = config.icon;
  return (
    <span className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', config.bg, config.color, config.border)}>
      <Icon size={12} />
      {config.label}
    </span>
  );
};

// Call card component
const CallCard: React.FC<{ call: Call; onClick: () => void }> = ({ call, onClick }) => (
  <motion.div
    whileHover={{ y: -3 }}
    className="glass-card p-5 rounded-2xl cursor-pointer"
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-3">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <PhoneIncoming size={18} className="text-primary" />
        </div>
        <div>
          <p className="font-semibold text-white/90">{call.customer_name || call.from}</p>
          <p className="text-xs text-white/40">{call.from}</p>
        </div>
      </div>
      <StatusBadge status={call.status} />
    </div>

    <div className="space-y-2 mb-3">
      <p className="text-sm text-white/70 line-clamp-2">{call.transcript || 'No transcript available'}</p>
      <div className="flex items-center gap-2">
        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">
          {call.intent || 'unknown'}
        </span>
        {call.outcome && (
          <span className="text-xs text-white/40">→ {call.outcome}</span>
        )}
      </div>
    </div>

    <div className="flex items-center gap-3 text-xs text-white/40">
      <span className="flex items-center gap-1">
        <Clock size={12} />
        {Math.round(call.duration)}s
      </span>
      <span>{new Date(call.created_at).toLocaleString()}</span>
    </div>
  </motion.div>
);

// Appointment card
const AppointmentCard: React.FC<{ apt: Appointment }> = ({ apt }) => (
  <motion.div
    whileHover={{ scale: 1.01 }}
    className="glass-card p-4 rounded-xl"
  >
    <div className="flex justify-between items-start mb-2">
      <div>
        <p className="font-semibold text-white/90">{apt.customer_name}</p>
        <p className="text-xs text-white/40">{apt.customer_phone}</p>
      </div>
      <span className={cn(
        'text-xs px-2 py-0.5 rounded-full font-medium border',
        apt.status === 'confirmed' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
        apt.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
        'bg-white/5 text-white/40 border-white/10'
      )}>
        {apt.status}
      </span>
    </div>
    <div className="flex items-center gap-2 text-sm text-white/60">
      <Calendar size={14} />
      {new Date(apt.scheduled_time).toLocaleString()}
    </div>
    <div className="mt-2 text-xs text-primary/80 bg-primary/5 px-2 py-1 rounded-lg inline-block">
      {apt.service_type}
    </div>
  </motion.div>
);

function App() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'calls' | 'appointments' | 'stats'>('calls');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [callsRes, aptsRes, statsRes] = await Promise.all([
        axios.get(`${API}/api/calls`),
        axios.get(`${API}/api/appointments`),
        axios.get(`${API}/api/stats`),
      ]);
      setCalls(callsRes.data.calls);
      setAppointments(aptsRes.data.appointments);
      setStats(statsRes.data);
      setIsConnected(true);
    } catch {
      setIsConnected(false);
      // Mock data when backend is down
      setCalls(MOCK_CALLS);
      setAppointments(MOCK_APPOINTMENTS);
      setStats(MOCK_STATS);
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Background blobs */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#121220] to-[#1a1a2e] -z-10" />
      <div className="fixed top-0 left-1/4 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -translate-y-1/2 pointer-events-none pulse-glow" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 bg-accent/5 blur-[100px] rounded-full translate-y-1/2 pointer-events-none pulse-glow" />

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#1a1a2e]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Phone size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">VoiceAgent</h1>
              <p className="text-xs text-primary/80 font-medium tracking-wider">SMB AI PHONE</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium',
              isConnected
                ? 'bg-green-500/10 border-green-500/20 text-green-400'
                : 'bg-red-500/10 border-red-500/20 text-red-400'
            )}>
              {isConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
              {isConnected ? 'LIVE' : 'OFFLINE'}
            </div>
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60 border border-white/5 disabled:opacity-50"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white/60 border border-white/5">
              <Settings size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* Tab bar */}
        <div className="flex gap-2 mb-8">
          {(['calls', 'appointments', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-5 py-2.5 rounded-xl text-sm font-medium transition-all capitalize',
                activeTab === tab
                  ? 'bg-primary text-white shadow-lg shadow-primary/25'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/5'
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Stats row */}
        {stats && activeTab === 'stats' && (
          <div className="grid grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Calls', value: stats.total_calls.toLocaleString(), icon: Phone, change: `${stats.calls_today} today` },
              { label: 'Missed', value: stats.missed_calls.toString(), icon: PhoneOutgoing, change: `${Math.round(stats.missed_calls / stats.total_calls * 100)}% rate` },
              { label: 'Appointments', value: stats.appointments_booked.toString(), icon: Calendar, change: '+ this week' },
              { label: 'Avg Duration', value: `${Math.round(stats.avg_duration)}s`, icon: Clock, change: 'per call' },
            ].map((stat, i) => (
              <div key={i} className="glass-card p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <stat.icon size={18} className="text-primary" />
                  </div>
                  <p className="text-sm text-white/40">{stat.label}</p>
                </div>
                <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                <p className="text-xs text-white/30">{stat.change}</p>
              </div>
            ))}
          </div>
        )}

        {/* Top intents */}
        {stats && activeTab === 'stats' && stats.top_intents.length > 0 && (
          <div className="glass-card p-6 rounded-2xl mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              Top Call Intents
            </h3>
            <div className="space-y-3">
              {stats.top_intents.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-white/40 w-4">{i + 1}</span>
                  <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.count / stats.top_intents[0].count) * 100}%` }}
                      className="h-full bg-gradient-to-r from-primary to-blue-400 rounded-full"
                    />
                  </div>
                  <span className="text-sm font-medium text-white/70 w-32">{item.intent}</span>
                  <span className="text-xs text-white/40">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Calls tab */}
        {activeTab === 'calls' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card p-5 rounded-2xl animate-pulse">
                  <div className="flex gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5" />
                    <div className="flex-1">
                      <div className="h-4 bg-white/5 rounded w-32 mb-2" />
                      <div className="h-3 bg-white/5 rounded w-24" />
                    </div>
                  </div>
                  <div className="h-3 bg-white/5 rounded w-full mb-2" />
                  <div className="h-3 bg-white/5 rounded w-3/4" />
                </div>
              ))
            ) : calls.length === 0 ? (
              <div className="col-span-2 text-center py-16 text-white/40">
                <Phone size={48} className="mx-auto mb-4 opacity-20" />
                <p>No calls yet. Make sure your Twilio webhook is configured.</p>
              </div>
            ) : (
              calls.map(call => (
                <CallCard key={call.id} call={call} onClick={() => setSelectedCall(call)} />
              ))
            )}
          </div>
        )}

        {/* Appointments tab */}
        {activeTab === 'appointments' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appointments.length === 0 ? (
              <div className="col-span-3 text-center py-16 text-white/40">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>No appointments booked yet.</p>
              </div>
            ) : (
              appointments.map(apt => (
                <AppointmentCard key={apt.id} apt={apt} />
              ))
            )}
          </div>
        )}
      </main>

      {/* Call detail modal */}
      <AnimatePresence>
        {selectedCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setSelectedCall(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-panel w-full max-w-lg rounded-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-semibold">Call Details</h3>
                <button onClick={() => setSelectedCall(null)} className="text-white/40 hover:text-white">
                  <XCircle size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">From</span>
                  <span className="font-medium">{selectedCall.from}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Duration</span>
                  <span className="font-medium">{Math.round(selectedCall.duration)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Status</span>
                  <StatusBadge status={selectedCall.status} />
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Intent</span>
                  <span className="text-primary font-medium">{selectedCall.intent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Outcome</span>
                  <span className="text-white/70">{selectedCall.outcome || 'N/A'}</span>
                </div>

                {selectedCall.transcript && (
                  <div className="mt-4 p-4 bg-white/5 rounded-xl">
                    <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
                      <MessageSquare size={12} /> Transcript
                    </p>
                    <p className="text-sm text-white/80">{selectedCall.transcript}</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;

// Mock data for when backend is offline
const MOCK_CALLS: Call[] = [
  {
    id: '1',
    from: '+91 98765 43210',
    to: '+91 33 4000 0001',
    duration: 47,
    status: 'completed',
    transcript: 'Hi, I need someone to fix my AC. It\'s not cooling properly and making a weird noise.',
    intent: 'service_request',
    outcome: 'Appointment booked for tomorrow 10 AM',
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    customer_name: 'Rajesh Kumar'
  },
  {
    id: '2',
    from: '+91 98300 11223',
    to: '+91 33 4000 0001',
    duration: 0,
    status: 'missed',
    transcript: '',
    intent: 'unknown',
    outcome: '',
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    customer_name: 'Priya Sharma'
  },
  {
    id: '3',
    from: '+91 99001 55667',
    to: '+91 33 4000 0001',
    duration: 85,
    status: 'completed',
    transcript: 'What are your charges for a complete AC servicing?',
    intent: 'pricing_inquiry',
    outcome: 'Gave price quote ₹1500 for standard service',
    created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    customer_name: 'Amit Patel'
  },
  {
    id: '4',
    from: '+91 98315 77890',
    to: '+91 33 4000 0001',
    duration: 12,
    status: 'voicemail',
    transcript: '[Voicemail] Hi, this is Suman. My inverter AC is not working since yesterday...',
    intent: 'service_request',
    outcome: 'Voicemail left - needs callback',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    customer_name: 'Suman Devi'
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: '1',
    customer_name: 'Rajesh Kumar',
    customer_phone: '+91 98765 43210',
    service_type: 'AC Repair - Not Cooling',
    scheduled_time: new Date(Date.now() + 1000 * 60 * 60 * 26).toISOString(),
    status: 'confirmed',
    notes: 'Inverter AC, making noise when compressor runs'
  },
  {
    id: '2',
    customer_name: 'Suman Devi',
    customer_phone: '+91 98315 77890',
    service_type: 'AC Not Working - Inverter',
    scheduled_time: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
    status: 'pending',
    notes: 'Callback after voicemail'
  },
];

const MOCK_STATS: Stats = {
  total_calls: 247,
  missed_calls: 38,
  appointments_booked: 89,
  avg_duration: 62,
  calls_today: 12,
  top_intents: [
    { intent: 'service_request', count: 89 },
    { intent: 'pricing_inquiry', count: 67 },
    { intent: 'booking_status', count: 45 },
    { intent: 'emergency', count: 23 },
    { intent: 'complaint', count: 18 },
  ]
};
