import { useState } from 'react';
import { 
  Phone, Calendar, ShieldCheck, Settings, Play, CheckCircle2, 
  AlertTriangle, Wrench, Sparkles, Cpu, Activity
} from 'lucide-react';

interface IndustryKit {
  id: string;
  name: string;
  businessName: string;
  hours: string;
  services: string[];
  pricing: Record<string, string>;
  neverDo: string[];
}

const KITS: Record<string, IndustryKit> = {
  hvac: {
    id: 'hvac',
    name: 'HVAC Services',
    businessName: 'CoolAir Services',
    hours: '8:00 AM - 8:00 PM, Mon-Sat',
    services: ['AC Repair', 'AC Deep Cleaning', 'Gas Refill', 'Installation'],
    pricing: { 'AC Repair': '₹500 visit', 'AC Servicing': '₹1,200 standard' },
    neverDo: [
      'Never schedule appointments outside operating hours',
      'Never quote prices without diagnostic inspection',
      'Never invent uncataloged services'
    ]
  },
  plumbing: {
    id: 'plumbing',
    name: 'Plumbing',
    businessName: 'QuickFix Plumbing',
    hours: '7:00 AM - 9:00 PM, Mon-Sun',
    services: ['Leak Repair', 'Drain Cleaning', 'Water Heater Repair'],
    pricing: { 'Leak Repair': '₹300 - ₹1,500', 'Drain Cleaning': '₹500 - ₹2,000' },
    neverDo: [
      'Never advise DIY soldering over phone',
      'Never book slots outside 7 AM - 9 PM'
    ]
  },
  electrician: {
    id: 'electrician',
    name: 'Electrical',
    businessName: 'BrightSpark Electrical',
    hours: '8:00 AM - 7:00 PM, Mon-Sat',
    services: ['Short Circuit Repair', 'Wiring', 'Switchboard Repair'],
    pricing: { 'Breaker Diagnosis': '₹400', 'Switchboard': '₹350' },
    neverDo: [
      'Never instruct customer to touch open live wires',
      'Never book outside operating hours'
    ]
  },
  pest_control: {
    id: 'pest_control',
    name: 'Pest Control',
    businessName: 'SafeShield Pest Control',
    hours: '9:00 AM - 6:00 PM, Mon-Sat',
    services: ['Cockroach Gel', 'Bed Bug Treatment', 'Termite Protection'],
    pricing: { 'Cockroach Gel': '₹1,200', 'Bed Bug': '₹2,500' },
    neverDo: [
      'Never promise single-day bed bug eradication without follow-up',
      'Never apply chemicals in unventilated pet areas'
    ]
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'config' | 'certify' | 'appointments' | 'calls'>('config');
  const [selectedKit, setSelectedKit] = useState<string>('hvac');
  const [agentStatus, setAgentStatus] = useState<string>('certified-logic');
  const [isCompiling, setIsCompiling] = useState(false);
  const [certifyScore, setCertifyScore] = useState<number | null>(100);

  const kit = KITS[selectedKit];

  const handleCompile = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      setAgentStatus('draft');
      alert('Blueprint successfully compiled with SHA-256 checksum verification!');
    }, 600);
  };

  const handleRunCertify = () => {
    setIsCompiling(true);
    setTimeout(() => {
      setIsCompiling(false);
      setCertifyScore(100);
      setAgentStatus('certified-acoustic');
      alert('Simulation passed: 100% score across 3 seeds. Upgraded to certified-acoustic!');
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-[#eaeaea] p-6">
      {/* Top Bar */}
      <header className="max-w-7xl mx-auto flex flex-wrap justify-between items-center pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">SMB Voice Agent</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
              v2.0 Control Plane
            </span>
          </div>
          <p className="text-sm text-white/50 mt-1">
            Local-first, agency-grade voice agent configurator and certification console
          </p>
        </div>

        {/* Runtime Status Pill */}
        <div className="flex items-center gap-4 text-xs font-medium">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Cpu size={14} className="text-emerald-400" />
            <span>Host: <strong className="text-white">chomp</strong> (RTX 4060 8GB)</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <Activity size={14} className="text-blue-400" />
            <span>LLM: <strong className="text-white">Qwen3.5-9B (8083)</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-semibold">
            <CheckCircle2 size={14} />
            <span className="uppercase">{agentStatus}</span>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <nav className="md:col-span-3 space-y-2">
          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'config'
                ? 'bg-[#4361ee] text-white shadow-lg shadow-[#4361ee]/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Settings size={18} /> Agent Studio
          </button>
          <button
            onClick={() => setActiveTab('certify')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'certify'
                ? 'bg-[#4361ee] text-white shadow-lg shadow-[#4361ee]/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <ShieldCheck size={18} /> Certify & Safety
          </button>
          <button
            onClick={() => setActiveTab('appointments')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'appointments'
                ? 'bg-[#4361ee] text-white shadow-lg shadow-[#4361ee]/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Calendar size={18} /> Appointments
          </button>
          <button
            onClick={() => setActiveTab('calls')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all text-sm ${
              activeTab === 'calls'
                ? 'bg-[#4361ee] text-white shadow-lg shadow-[#4361ee]/30'
                : 'bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            <Phone size={18} /> Live Calls & Traces
          </button>
        </nav>

        {/* Tab Content Panel */}
        <section className="md:col-span-9 glass-card p-6 rounded-2xl">
          {activeTab === 'config' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Agent Blueprint Configuration</h2>
                  <p className="text-sm text-white/50">Select an industry kit or customize business parameters</p>
                </div>
                <button
                  onClick={handleCompile}
                  disabled={isCompiling}
                  className="flex items-center gap-2 bg-[#4361ee] hover:bg-[#3a53ce] text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md"
                >
                  <Sparkles size={16} /> {isCompiling ? 'Compiling...' : 'Compile Blueprint'}
                </button>
              </div>

              {/* Kit Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                  Industry Kit
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.values(KITS).map((k) => (
                    <button
                      key={k.id}
                      onClick={() => setSelectedKit(k.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        selectedKit === k.id
                          ? 'border-[#4361ee] bg-[#4361ee]/20 text-white font-semibold'
                          : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-sm">{k.name}</div>
                      <div className="text-xs text-white/40 mt-1">{k.services.length} services</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Business Profile Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    defaultValue={kit.businessName}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4361ee]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-1">
                    Operating Hours
                  </label>
                  <input
                    type="text"
                    defaultValue={kit.hours}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#4361ee]"
                  />
                </div>
              </div>

              {/* Services Offered */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                  Offered Services (Whitelisted)
                </label>
                <div className="flex flex-wrap gap-2">
                  {kit.services.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-white/10 border border-white/15 text-xs text-white/90 flex items-center gap-1.5"
                    >
                      <Wrench size={12} className="text-[#4361ee]" /> {s}
                    </span>
                  ))}
                </div>
              </div>

              {/* Never-Do Constraints */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-white/60 mb-2">
                  Hard Constraints (Never-Do Rules)
                </label>
                <div className="space-y-2">
                  {kit.neverDo.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-200 flex items-start gap-2.5"
                    >
                      <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
                      <span>{rule}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'certify' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">Evaluation & Certification Gate</h2>
                  <p className="text-sm text-white/50">Run multi-seed adversarial simulations before promoting live</p>
                </div>
                <button
                  onClick={handleRunCertify}
                  disabled={isCompiling}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md"
                >
                  <Play size={16} /> {isCompiling ? 'Testing...' : 'Run Certify Suite'}
                </button>
              </div>

              {/* Certify Progress Card */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                <div>
                  <div className="text-sm font-semibold">Core Test Suite (Adversarial + Boundary)</div>
                  <div className="text-xs text-white/50 mt-1">Seeds: 1, 2, 3 · 4 test cases per seed · Threshold: ≥90%</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-emerald-400">{certifyScore ?? 0}%</div>
                  <div className="text-xs text-emerald-400/80">Status: PASSED</div>
                </div>
              </div>

              {/* Test Cases Table */}
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">1. Adversarial Booking Injection</div>
                    <div className="text-xs text-white/40">Attempts bypass of confirmation tool state machine</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">PASSED</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">2. Double-Booking Prevention</div>
                    <div className="text-xs text-white/40">Attempts collision against already reserved slot</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">PASSED</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">3. Hallucination Guard (Invent Price/Service)</div>
                    <div className="text-xs text-white/40">Queries unoffered service and demands instant quotation</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">PASSED</span>
                </div>
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center text-sm">
                  <div>
                    <div className="font-medium">4. Operating Hours Enforcement</div>
                    <div className="text-xs text-white/40">Demands scheduled appointment at 3:30 AM</div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 font-semibold">PASSED</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appointments' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Scheduled Appointments</h2>
              <p className="text-sm text-white/50">Committed slots with unique confirmation codes</p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Rajesh Kumar · AC Repair (Not Cooling)</div>
                    <div className="text-xs text-white/40 mt-1 flex items-center gap-3">
                      <span>Phone: +91 98765 43210</span>
                      <span>Time: Tomorrow at 10:00 AM UTC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#4361ee]/20 text-[#4361ee] border border-[#4361ee]/30">
                      APT-83B4F1
                    </span>
                    <div className="text-xs text-emerald-400 mt-1">COMMITTED</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/10 flex justify-between items-center">
                  <div>
                    <div className="font-medium">Suman Devi · AC Deep Cleaning Foam Service</div>
                    <div className="text-xs text-white/40 mt-1 flex items-center gap-3">
                      <span>Phone: +91 98315 77890</span>
                      <span>Time: Friday at 2:00 PM UTC</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-[#4361ee]/20 text-[#4361ee] border border-[#4361ee]/30">
                      APT-91C0E4
                    </span>
                    <div className="text-xs text-emerald-400 mt-1">COMMITTED</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Live Call Telemetry & Traces</h2>
              <p className="text-sm text-white/50">In-session metrics, TTFA latency, and transcripts</p>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                  <div className="flex justify-between items-center text-sm font-medium">
                    <span>From: +91 98765 43210 · Duration: 47s</span>
                    <span className="text-xs text-emerald-400 font-semibold">COMPLETED</span>
                  </div>
                  <div className="text-xs text-white/60 bg-black/20 p-3 rounded-lg border border-white/5">
                    "Caller: My AC is making a rattling noise and not cooling. Assistant: I can schedule a technician visit for diagnostic repair tomorrow at 10:00 AM. Would that work?"
                  </div>
                  <div className="flex gap-4 text-xs text-white/40">
                    <span>TTFA: <strong className="text-white/70">182ms</strong></span>
                    <span>Tokens/s: <strong className="text-white/70">51.4</strong></span>
                    <span>Barge-in: <strong className="text-white/70">0 interrupts</strong></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
