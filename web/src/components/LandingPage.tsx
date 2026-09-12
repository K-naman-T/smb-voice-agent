import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Clock,
  AlertTriangle,
  Pause,
  Play,
  Phone,
  RotateCcw,
  ShieldCheck,
  Tag,
  CalendarCheck,
  Server,
  Languages,
  Mic,
  Lock,
  Menu,
  X,
  Zap,
  CloudOff,
} from "lucide-react";

interface LandingPageProps {
  onLaunchStudio: () => void;
}

/* ------------------------------------------------------------------ */
/*  Design tokens — OFY warm-studio system (see DESIGN.md)           */
/* ------------------------------------------------------------------ */
const INK = "#151412";
const INK_2 = "#55514B";
const INK_3 = "#6E6A63";
const CANVAS = "#FBFAF8";
const BAND = "#F5F2ED";
const CARD = "#FFFFFF";
const HAIRLINE = "#E8E4DD";
const HAIRLINE_2 = "#D8D2C8";
const GREEN = "#1B5E3C";
const GREEN_SOFT = "#E7F0EB";
const SUCCESS = "#267358";

const display = "font-archivo";
const mono = "font-mono";
const displayStyle: React.CSSProperties = { fontVariationSettings: '"wdth" 84' };

const scrollToCallAndPlay = () => {
  const el = document.getElementById("call");
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
  window.setTimeout(() => window.dispatchEvent(new CustomEvent("ofy:play-call")), 700);
};

/* ------------------------------------------------------------------ */
/*  Small primitives                                                   */
/* ------------------------------------------------------------------ */

const Mark: React.FC<{ size?: number }> = ({ size = 30 }) => (
  <span
    className="inline-flex items-center justify-center rounded-full flex-none"
    style={{ width: size, height: size, background: GREEN, color: "#fff" }}
  >
    <svg width={size * 0.52} height={size * 0.52} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12c2.4 0 2.4-6 4.8-6s2.4 12 4.8 12 2.4-9 4.8-9 1.2 3 3.6 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  </span>
);

const Eyebrow: React.FC<{ children: React.ReactNode; center?: boolean; tone?: "light" | "dark" }> = ({ children, center, tone = "light" }) => (
  <div
    className={`${center ? "text-center " : ""}${mono} text-[11px] font-semibold uppercase tracking-[0.18em]`}
    style={{ color: tone === "light" ? INK_3 : "#9DBFAD" }}
  >
    {children}
  </div>
);

const SectionHead: React.FC<{ label: string; title: React.ReactNode; sub?: React.ReactNode; center?: boolean }> = ({ label, title, sub, center }) => (
  <div className={`${center ? "text-center mx-auto" : ""} max-w-2xl`}>
    <Eyebrow center={center}>{label}</Eyebrow>
    <h2
      className={`${display} mt-3 text-[clamp(27px,3.3vw,38px)] leading-[1.1] tracking-[-0.02em]`}
      style={{ color: INK, fontWeight: 560, ...displayStyle }}
    >
      {title}
    </h2>
    {sub && (
      <p className={`mt-4 text-[15px] leading-relaxed ${center ? "mx-auto" : ""} max-w-xl`} style={{ color: INK_2 }}>
        {sub}
      </p>
    )}
  </div>
);

const Reveal: React.FC<{ children: React.ReactNode; delay?: number; className?: string }> = ({ children, delay = 0, className = "" }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 18 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }}
    transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
  >
    {children}
  </motion.div>
);

/* Decorative ink-dot rings — the print-shop texture, drawn not generated. */
const RingField: React.FC<{ className?: string; rings?: number; strength?: number }> = ({ className = "", rings = 15, strength = 1 }) => {
  const list = Array.from({ length: rings }, (_, i) => {
    const r = 46 + i * 27;
    const dash = 0.7 + ((i * 7) % 5) * 0.42;
    const gap = 4.6 + ((i * 11) % 7) * 0.72;
    const op = Math.max(0.045, (0.22 - i * 0.01)) * strength;
    return { r, dash, gap, op };
  });
  return (
    <svg viewBox="0 0 900 900" className={className} aria-hidden="true" focusable="false">
      {list.map((ring, i) => (
        <circle
          key={i}
          cx="450"
          cy="450"
          r={ring.r}
          fill="none"
          stroke={INK}
          strokeOpacity={ring.op}
          strokeWidth={1.4}
          strokeDasharray={`${ring.dash} ${ring.gap}`}
          strokeLinecap="round"
        />
      ))}
    </svg>
  );
};

/* Audio-reactive bar waveform (canvas, DPR-aware). */
const WaveCanvas: React.FC<{ active: boolean; bars?: number; color?: string; className?: string }> = ({
  active,
  bars = 44,
  color = GREEN,
  className = "",
}) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let t = 0;
    const levels = new Array(bars).fill(0.06) as number[];
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.clientWidth || 320;
      const h = canvas.clientHeight || 40;
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      t += 0.05;
      const bw = 2;
      const gap = Math.max(1.5, (w - bars * bw) / (bars - 1));
      for (let i = 0; i < bars; i++) {
        const center = 1 - Math.abs(i - bars * 0.5) / (bars * 0.62);
        const seed = ((i * 2654435761) % 100) / 100;
        const noise = activeRef.current
          ? (Math.sin(t * 3.3 + i * 0.55) * 0.5 + 0.5) * 0.72 + seed * 0.4
          : 0.04 + seed * 0.1;
        const target = Math.min(1, 0.09 + noise * Math.max(0.12, center) * (activeRef.current ? 0.92 : 0.5));
        levels[i] += (target - levels[i]) * 0.17;
        const bh = Math.max(3, levels[i] * h);
        const x = i * (bw + gap);
        ctx.fillStyle = color;
        ctx.globalAlpha = activeRef.current ? 0.95 : 0.4;
        if (typeof (ctx as unknown as { roundRect?: unknown }).roundRect === "function") {
          ctx.beginPath();
          ctx.roundRect(x, h - bh, bw, bh, 1);
          ctx.fill();
        } else {
          ctx.fillRect(x, h - bh, bw, bh);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [bars, color]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

interface VerticalPreset {
  id: string;
  tab: string;
  business: string;
  category: string;
  caller: string;
  greeting: string;
  inquiry: string;
  response: string;
  interrupt: string;
  pivot: string;
  booked: string;
  bookingChip: string;
  value: string;
}

const PRESETS: Record<string, VerticalPreset> = {
  hvac: {
    id: "hvac",
    tab: "HVAC",
    business: "CoolAir Climate Systems",
    category: "Heating & Cooling",
    caller: "Sarah M.",
    greeting:
      "Thank you for calling CoolAir Climate Systems — this is Maya at the front desk. Is your AC acting up, or would you like to schedule service?",
    inquiry: "Our outdoor unit stopped spinning, and water is pooling under the indoor vent onto the floor.",
    response:
      "I'm sorry — that usually means a backed-up condensate line or a frozen coil. I have a technician in your neighborhood between 1:30 and 3:30 today. The diagnostic is $79 and it's credited toward the repair. May I hold that window?",
    interrupt: "Wait — my husband won't be home from work until 5. Do you have anything after 5:30?",
    pivot: "Of course. Our evening technician has 5:30 to 7:00 open tonight — would that suit him better?",
    booked:
      "Booked — tonight, 5:30 to 7:00 PM. Confirmation CL-402 is in the schedule. I've texted the details and your technician tracker.",
    bookingChip: "Tue · 5:30–7:00 PM · reserved",
    value: "$920 job captured",
  },
  plumbing: {
    id: "plumbing",
    tab: "Plumbing",
    business: "Titan Plumbing Co.",
    category: "Commercial & Home Plumbing",
    caller: "Marcus T.",
    greeting: "Titan Plumbing — this is Maya. Do you have an active leak, or would you like to schedule a service visit?",
    inquiry: "The main floor drain is backing up into the utility room right now — water is starting to spread.",
    response:
      "That's a priority — I can send the hydro-jet crew straight out, arrival within about 35 minutes. Before I dispatch, can you confirm the address on file?",
    interrupt: "Wait — will that mean shutting off the water for the whole building?",
    pivot:
      "No — we isolate just the utility riser valve, so the rest of the building keeps full pressure. Confirming the emergency dispatch now — crew ETA 32 minutes.",
    booked:
      "Crew dispatched — priority unit TTN-049 is locked in, ETA 32 minutes. I've texted you a live tracking link and notified the on-call supervisor.",
    bookingChip: "Today · crew ETA 32 min · dispatched",
    value: "$1,450 emergency job",
  },
  dental: {
    id: "dental",
    tab: "Dental",
    business: "Metropolitan Dental Group",
    category: "Family & Emergency Dental",
    caller: "Elena R.",
    greeting: "Metropolitan Dental — this is Maya. Are you an existing patient, or would you like to book an appointment?",
    inquiry: "I cracked an upper premolar at lunch and it throbs whenever anything cold touches it.",
    response:
      "Ouch — I'm sorry. Dr. Chen keeps priority slots open for dental trauma. There's an opening today at 3:15 PM to relieve the pain and take imaging. Would you like that chair?",
    interrupt: "Do you take Delta Dental Premier? I don't want a surprise bill.",
    pivot:
      "Yes — we're in-network with Delta Dental Premier, and the emergency exam is billed under standard preventive terms. Shall I reserve 3:15 PM?",
    booked:
      "Reserved — 3:15 PM today with Dr. Chen, patient file MET-708 locked into the clinic calendar. I've sent the intake forms to your phone.",
    bookingChip: "Today · 3:15 PM · reserved",
    value: "$380 visit booked",
  },
};

type CallStep = "ready" | "inquiry" | "pivot" | "booked";
const STEP_ORDER: CallStep[] = ["ready", "inquiry", "pivot", "booked"];

interface LedgerRow {
  time: string;
  trade: string;
  caller: string;
  problem: string;
  resolution: string;
  value: string;
}

const LEDGER_ROWS: LedgerRow[] = [
  {
    time: "Tue · 6:15 AM",
    trade: "Dental",
    caller: "Elena R.",
    problem: "Cracked molar throbbing from exposed dentin",
    resolution: "3:15 PM trauma chair reserved with Dr. Chen; insurance pre-verified; intake forms sent",
    value: "$420",
  },
  {
    time: "Tue · 11:02 AM",
    trade: "Plumbing",
    caller: "Marcus T.",
    problem: "Kitchen drain gurgling with sewer backflow",
    resolution: "Emergency crew dispatched in 35 minutes; riser-valve guidance given; on-call supervisor notified",
    value: "$1,400",
  },
  {
    time: "Tue · 2:40 PM",
    trade: "Auto",
    caller: "Dave K.",
    problem: "Brake squeal and rotor grinding on a 2022 Q5",
    resolution: "Bay 2 reserved for Thursday 8:30 AM; overnight key-drop confirmed",
    value: "$580",
  },
  {
    time: "Tue · 8:14 PM",
    trade: "HVAC",
    caller: "Sarah M.",
    problem: "Compressor froze; water dripping toward ceiling drywall",
    resolution: "Evening slot reserved for tomorrow, 5:30–7:00 PM; fee confirmed; SMS + tracker sent",
    value: "$850",
  },
];

interface Stage {
  from: number;
  to: number;
  title: string;
  desc: string;
}

const STAGES: Stage[] = [
  { from: 0, to: 40, title: "Hears you", desc: "Voice detection strips background noise and finds exactly where speech starts." },
  { from: 40, to: 110, title: "Writes it down", desc: "Local speech-to-text turns the caller's words into text — on your machine." },
  { from: 110, to: 200, title: "Checks the facts", desc: "Availability, prices, hours, and hard rules are checked before she speaks." },
  { from: 200, to: 280, title: "Answers", desc: "First audio plays. The caller hears a natural reply in under a third of a second." },
];
const TOTAL_MS = 280;

const FAQS: { q: string; a: string }[] = [
  {
    q: "Where does OFY actually run?",
    a: "On your machine — a GPU box, a mini-PC, or the computer behind your desk. Speech, language, and voice models all run locally; nothing is sent to third-party model APIs in the default setup.",
  },
  {
    q: "Does she sound like a robot?",
    a: "She sounds like a calm, competent receptionist — not a movie star. Local voices trade a little warmth for complete privacy, and you can swap in higher-quality voices without changing anything else.",
  },
  {
    q: "Can she handle Hindi and English?",
    a: "Yes — English and Hindi voice profiles are supported and certified independently, so you can enable either or both.",
  },
  {
    q: "What happens when she can't help?",
    a: "She hands off to a human with the full transcript and context — and for safety matters (gas, sparks, flooding) she escalates immediately, by rule.",
  },
  {
    q: "How do I go live?",
    a: "Start in the browser today. When you're ready for a real number, telephony connects through an optional adapter — off by default, enabled per number.",
  },
];

/* ------------------------------------------------------------------ */
/*  Sections                                                           */
/* ------------------------------------------------------------------ */

const Nav: React.FC<{ onLaunchStudio: () => void }> = ({ onLaunchStudio }) => {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#how", label: "How it works" },
    { href: "#console", label: "Live demo" },
    { href: "#guardrails", label: "Guardrails" },
    { href: "#faq", label: "FAQ" },
  ];

  return (
    <header
      className="sticky top-0 z-50 transition-shadow"
      style={{
        background: "rgba(251,250,248,0.88)",
        backdropFilter: "blur(14px)",
        borderBottom: `1px solid ${scrolled ? HAIRLINE : "transparent"}`,
        boxShadow: scrolled ? "0 1px 0 rgba(21,20,18,0.04), 0 12px 32px -24px rgba(21,20,18,0.25)" : "none",
      }}
    >
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5 md:px-8">
        <a href="#top" className="flex items-center gap-3" aria-label="OFY home">
          <Mark />
          <span className={`${display} text-[17px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
            OFY
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-7" aria-label="Main">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-[14px] font-medium transition-colors hover:opacity-70" style={{ color: "#3F3B36" }}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={onLaunchStudio}
            className="hidden sm:inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-[1px]"
            style={{ background: INK }}
          >
            Open studio
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-full border"
            style={{ borderColor: HAIRLINE_2, color: INK }}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X style={{ width: 18, height: 18 }} /> : <Menu style={{ width: 18, height: 18 }} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-t"
            style={{ borderColor: HAIRLINE, background: CANVAS }}
          >
            <div className="flex flex-col px-6 py-3">
              {links.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="py-3 text-[14px] font-medium border-b last:border-b-0"
                  style={{ borderColor: HAIRLINE, color: INK }}
                >
                  {l.label}
                </a>
              ))}
              <button
                onClick={onLaunchStudio}
                className="mt-3 mb-2 inline-flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-semibold text-white"
                style={{ background: INK }}
              >
                Open studio <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

const Hero: React.FC = () => (
  <section id="top" className="relative scroll-mt-24 overflow-hidden px-5 md:px-8">
    <RingField className="pointer-events-none absolute left-1/2 top-[-120px] h-[820px] w-[820px] -translate-x-1/2" />
    <div className="relative mx-auto max-w-[1120px] pb-16 pt-14 md:pb-20 md:pt-24">
      <Reveal>
        <div className="flex justify-center">
          <span
            className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12px] font-semibold"
            style={{ borderColor: HAIRLINE_2, color: INK_2, background: "rgba(255,255,255,0.55)" }}
          >
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: SUCCESS }} />
            Local-private AI receptionist · answers 24/7
          </span>
        </div>
      </Reveal>

      <Reveal delay={0.06}>
        <h1
          className={`${display} mx-auto mt-7 max-w-[880px] text-center text-[clamp(33px,5.6vw,72px)] leading-[1.05] tracking-[-0.022em]`}
          style={{ color: INK, fontWeight: 600, ...displayStyle }}
        >
          <span className="block">When your phone rings,</span>
          <span className="block" style={{ fontWeight: 430 }}>
            three rings later
          </span>
          <span className="block">they call your competitor.</span>
        </h1>
      </Reveal>

      <Reveal delay={0.12}>
        <p className="mx-auto mt-6 max-w-[540px] text-center text-[16px] leading-[1.7]" style={{ color: INK_2 }}>
          OFY answers on ring one — in your voice, with your prices — then books the job straight into
          your calendar. She runs on your machine, not someone else's cloud.
        </p>
      </Reveal>

      <Reveal delay={0.18}>
        <div className="mx-auto mt-9 flex w-full max-w-[400px] flex-col items-center justify-center gap-3 sm:max-w-none sm:flex-row">
          <a
            href="#console"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold text-white shadow-lg transition-transform hover:-translate-y-[1px] sm:w-auto"
            style={{ background: INK, boxShadow: "0 18px 40px -22px rgba(21,20,18,0.55)" }}
          >
            Try the live demo
            <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={scrollToCallAndPlay}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-6 py-3.5 text-[14px] font-semibold transition-colors hover:bg-white sm:w-auto"
            style={{ borderColor: HAIRLINE_2, color: INK, background: "rgba(255,255,255,0.6)" }}
          >
            <Play className="h-4 w-4" style={{ color: GREEN }} />
            Hear a real call
          </button>
        </div>
        <p className="mt-4 text-center text-[13px]" style={{ color: INK_2 }}>
          No signup — the demo runs right here in your browser.
        </p>
      </Reveal>

      <Reveal delay={0.24}>
        <div
          className="mx-auto mt-11 max-w-[880px] divide-y rounded-2xl border md:grid md:grid-cols-4 md:divide-y-0"
          style={{ borderColor: HAIRLINE, background: "rgba(255,255,255,0.6)", ["--tw-divide-opacity" as string]: "1" }}
        >
          {[
            { icon: Server, k: "Runs on your hardware" },
            { icon: Languages, k: "English + Hindi" },
            { icon: Zap, k: "Sub-300 ms replies" },
            { icon: CalendarCheck, k: "Books real appointments" },
          ].map((item) => (
            <div key={item.k} className="flex items-center gap-2.5 px-5 py-3.5 md:justify-center md:border-l md:py-0 md:first:border-l-0" style={{ borderColor: HAIRLINE }}>
              <item.icon className="h-4 w-4 flex-none" style={{ color: GREEN }} />
              <span className="text-[13px] font-semibold" style={{ color: "#46423C" }}>
                {item.k}
              </span>
            </div>
          ))}
        </div>
      </Reveal>
    </div>
  </section>
);

const LiveConsole: React.FC = () => {
  const [vertical, setVertical] = useState<keyof typeof PRESETS>("hvac");
  const [step, setStep] = useState<CallStep>("ready");
  const [autoPlaying, setAutoPlaying] = useState(false);
  const preset = PRESETS[vertical];
  const speaking = step !== "ready";
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [step]);

  const reset = () => {
    setStep("ready");
    setAutoPlaying(false);
  };

  const pick = (key: keyof typeof PRESETS) => {
    setVertical(key);
    reset();
  };

  const stepState = (target: CallStep) => {
    const cur = STEP_ORDER.indexOf(step);
    const t = STEP_ORDER.indexOf(target);
    if (cur >= t) return "done" as const;
    if (cur === t - 1) return "next" as const;
    return "locked" as const;
  };

  useEffect(() => {
    if (!autoPlaying) return;
    if (step === "ready") {
      const t = setTimeout(() => setStep("inquiry"), 900);
      return () => clearTimeout(t);
    }
    if (step === "inquiry") {
      const t = setTimeout(() => setStep("pivot"), 3400);
      return () => clearTimeout(t);
    }
    if (step === "pivot") {
      const t = setTimeout(() => setStep("booked"), 3600);
      return () => clearTimeout(t);
    }
    setAutoPlaying(false);
  }, [autoPlaying, step]);

  const turn = (label: string, who: "agent" | "caller", text: string) => (
    <motion.div
      key={`${label}-${text.slice(0, 12)}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`flex flex-col ${who === "agent" ? "items-start" : "items-end"}`}
    >
      <span className={`${mono} mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]`} style={{ color: INK_3 }}>
        {label}
      </span>
      <div
        className="max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed"
        style={who === "agent" ? { background: CARD, border: `1px solid ${HAIRLINE}`, color: INK } : { background: INK, color: "#fff" }}
      >
        {text}
      </div>
    </motion.div>
  );

  const stepBtn = (target: CallStep, label: string, icon: React.ReactNode) => {
    const state = stepState(target);
    const done = state === "done";
    const locked = state === "locked";
    return (
      <button
        onClick={() => {
          setAutoPlaying(false);
          setStep(target);
        }}
        disabled={locked}
        className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[13px] font-semibold transition-all hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
        style={
          done
            ? { borderColor: "rgba(38,115,88,0.35)", color: GREEN, background: GREEN_SOFT }
            : locked
              ? { borderColor: HAIRLINE, color: INK_3, background: CARD }
              : { borderColor: INK, color: "#fff", background: INK, boxShadow: "0 12px 26px -18px rgba(21,20,18,0.6)" }
        }
      >
        {done ? <Check className="h-3.5 w-3.5" /> : icon}
        {label}
      </button>
    );
  };

  return (
    <section id="console" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28" style={{ background: BAND }}>
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <SectionHead
            center
            label="The live console"
            title="Hear her answer."
            sub="Pick a trade, then walk through a real call — including the mid-sentence interruption that trips up most phone bots."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div
            className="mx-auto mt-12 max-w-[880px] overflow-hidden rounded-[24px] border"
            style={{ borderColor: HAIRLINE_2, background: CARD, boxShadow: "0 40px 90px -50px rgba(21,20,18,0.35)" }}
          >
            {/* Console bar */}
            <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between md:px-7" style={{ borderColor: HAIRLINE }}>
              <div className="flex items-center gap-3">
                <span className="relative flex h-2.5 w-2.5 flex-none" title="Live inbound line">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-40" style={{ background: SUCCESS }} />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: SUCCESS }} />
                </span>
                <div>
                  <div className={`${display} text-[15px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
                    {preset.business}
                  </div>
                  <div className={`${mono} mt-0.5 text-[10.5px] uppercase tracking-[0.12em]`} style={{ color: INK_3 }}>
                    {preset.category} · Line: live inbound · Calendar connected
                  </div>
                </div>
              </div>

              <div className="flex gap-1 self-start rounded-full p-1 sm:self-auto" style={{ background: BAND, border: `1px solid ${HAIRLINE}` }}>
                {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => (
                  <button
                    key={key}
                    onClick={() => pick(key)}
                    className="rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all"
                    style={
                      vertical === key
                        ? { background: CARD, color: INK, boxShadow: "0 1px 2px rgba(21,20,18,0.12)" }
                        : { background: "transparent", color: INK_3 }
                    }
                    aria-pressed={vertical === key}
                    title={`Switch the demo script: ${PRESETS[key].tab}`}
                  >
                    {PRESETS[key].tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Acoustic strip */}
            <div className="flex items-center gap-4 border-b px-5 py-3 md:px-7" style={{ borderColor: HAIRLINE, background: "#FDFCFA" }}>
              <WaveCanvas active={speaking} className="h-8 flex-1" />
              <span className={`${mono} flex-none whitespace-nowrap text-[11px] font-semibold`} style={{ color: speaking ? SUCCESS : INK_3 }}>
                {step === "booked" ? "Call ended · 0:34" : speaking ? "Speaking…" : "Waiting for caller…"}
              </span>
            </div>

            {/* Transcript */}
            <div className="relative">
              <div ref={transcriptRef} className="max-h-[360px] space-y-4 overflow-y-auto px-5 py-6 md:px-7" style={{ background: "#FDFCFA" }}>
              {turn("OFY · front desk · 0:01", "agent", preset.greeting)}
              {step !== "ready" && turn(`Caller · ${preset.caller} · 0:08`, "caller", preset.inquiry)}
              {(step === "pivot" || step === "booked") && turn("OFY · front desk · 0:14", "agent", preset.response)}
              {(step === "pivot" || step === "booked") && turn("[ mid-sentence interruption ] · 0:18", "caller", preset.interrupt)}
              {step === "booked" && turn("OFY · front desk · 0:21", "agent", preset.pivot)}
              {step === "booked" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-start">
                  <span className={`${mono} mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]`} style={{ color: SUCCESS }}>
                    Calendar · write confirmed · 0:28
                  </span>
                  <div
                    className="max-w-[92%] rounded-2xl px-4 py-3 text-[13.5px] font-medium leading-relaxed"
                    style={{ background: GREEN_SOFT, border: "1px solid rgba(38,115,88,0.25)", color: GREEN }}
                  >
                    {preset.booked}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className={`${mono} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold`} style={{ background: CARD, border: `1px solid ${HAIRLINE_2}`, color: INK_2 }}>
                      <CalendarCheck className="h-3 w-3" style={{ color: GREEN }} />
                      {preset.bookingChip}
                    </span>
                    <span className={`${mono} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold`} style={{ background: CARD, border: `1px solid ${HAIRLINE_2}`, color: INK_2 }}>
                      <Phone className="h-3 w-3" style={{ color: GREEN }} />
                      SMS confirmation sent
                    </span>
                    <span className={`${mono} inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold`} style={{ background: CARD, border: `1px solid ${HAIRLINE_2}`, color: INK_2 }}>
                      <Check className="h-3 w-3" style={{ color: GREEN }} />
                      {preset.value}
                    </span>
                  </div>
                </motion.div>
              )}
              </div>
              <div className="pointer-events-none absolute inset-x-0 top-0 h-7" style={{ background: "linear-gradient(#FDFCFA, rgba(253,252,250,0))" }} />
            </div>

            {/* Completion strip */}
            <AnimatePresence>
              {step === "booked" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden border-t"
                  style={{ borderColor: "rgba(38,115,88,0.25)", background: GREEN_SOFT }}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 md:px-7">
                    <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: GREEN }}>
                      <Check className="h-3.5 w-3.5" />
                      Call complete
                    </span>
                    <span className={`${mono} text-[11px] font-semibold`} style={{ color: SUCCESS }}>
                      0:34 call · logged to the audit trail
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 md:px-7" style={{ borderColor: HAIRLINE }}>
              <div className="flex flex-wrap items-center gap-2.5">
                {stepBtn("inquiry", "1 · Caller's problem", <Play className="h-3.5 w-3.5" />)}
                {stepBtn("pivot", "2 · Interrupt her", <Mic className="h-3.5 w-3.5" />)}
                {stepBtn("booked", "3 · Confirm the booking", <Check className="h-3.5 w-3.5" />)}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (autoPlaying) {
                      setAutoPlaying(false);
                    } else {
                      reset();
                      setAutoPlaying(true);
                      setStep("inquiry");
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-[#F7F4EF]"
                  style={{ background: CARD, borderColor: HAIRLINE_2, color: INK_2 }}
                >
                  {autoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  {autoPlaying ? "Pause walkthrough" : "Play the whole call"}
                </button>
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[12.5px] font-semibold transition-colors hover:bg-[#F7F4EF]"
                  style={{ background: BAND, border: `1px solid ${HAIRLINE}`, color: INK_2 }}
                  aria-label="Reset the demo"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset
                </button>
              </div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.16}>
          <p className="mx-auto mt-6 max-w-xl text-center text-[12.5px] leading-relaxed" style={{ color: INK_3 }}>
            Scripted walkthrough with sample data. The same flow runs live in the studio against the local
            stack — you can take a real test call there.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

/* Real-recording player — proof, not animation. */
const CallPlayer: React.FC<{ src: string; title: string; sub: string }> = ({ src, title, sub }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDur(a.duration || 0);
    const onEnd = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("ended", onEnd);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("ended", onEnd);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      const a = audioRef.current;
      if (a) {
        void a.play();
        setPlaying(true);
      }
    };
    window.addEventListener("ofy:play-call", handler);
    return () => window.removeEventListener("ofy:play-call", handler);
  }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  return (
    <div
      id="call"
      className="mx-auto mt-2 flex max-w-[880px] scroll-mt-28 flex-col gap-4 rounded-[20px] border px-5 py-5 sm:flex-row sm:items-center md:px-7"
      style={{ borderColor: HAIRLINE_2, background: CARD, boxShadow: "0 24px 60px -45px rgba(21,20,18,0.3)" }}
    >
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        onClick={toggle}
        className="inline-flex h-12 w-12 flex-none items-center justify-center rounded-full text-white transition-transform hover:scale-[1.03]"
        style={{ background: GREEN }}
        aria-label={playing ? "Pause sample call" : "Play sample call"}
      >
        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-[1px]" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <div className={`${display} text-[14.5px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
            {title}
          </div>
          <div className={`${mono} flex-none text-[11px] font-semibold`} style={{ color: INK_3 }}>
            {fmt(time)} / {dur ? fmt(dur) : "1:25"}
          </div>
        </div>
        <p className="mt-1 text-[12.5px]" style={{ color: INK_2 }}>
          {sub}
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: HAIRLINE }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-200"
              style={{ width: `${dur ? (time / dur) * 100 : 0}%`, background: GREEN }}
            />
          </div>
          <WaveCanvas active={playing} bars={16} className="h-5 w-16 flex-none" />
        </div>
      </div>
    </div>
  );
};

const HowItWorks: React.FC = () => {
  const steps = [
    {
      n: "01",
      title: "Write the brief",
      body: "Services, hours, prices, policies — and the things the agent must never do. Plain English, or start from a kit: HVAC, plumbing, dental.",
    },
    {
      n: "02",
      title: "OFY compiles your agent",
      body: "The brief becomes a versioned, checksummed configuration. Every change is recorded, reviewable, and reversible.",
    },
    {
      n: "03",
      title: "Test before she answers",
      body: "Run deterministic simulations, then take a live test call in the studio. Nothing faces a customer until you promote it.",
    },
    {
      n: "04",
      title: "Go live",
      body: "Start in the browser, add a phone number when you're ready. Bookings land in your calendar, transcripts in your log.",
    },
  ];

  return (
    <section id="how" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <SectionHead
            label="How it works"
            title="From brief to live front desk, without a dev team."
            sub="You describe the business once. OFY turns it into an agent you can inspect, test, and trust before it ever picks up."
          />
        </Reveal>

        <div className="mt-12 grid gap-10 md:grid-cols-4 md:gap-6">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.07}>
              <div className="flex h-full flex-col">
                <div className={`${mono} text-[12px] font-semibold`} style={{ color: GREEN }}>
                  {s.n}
                </div>
                <div className="mt-3 h-px w-full" style={{ background: HAIRLINE }} />
                <h3 className={`${display} mt-4 text-[17px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
                  {s.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: INK_2 }}>
                  {s.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
};

const AcousticTimeline: React.FC = () => {
  const [ms, setMs] = useState(TOTAL_MS);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const elapsed = now - started;
      const value = Math.min(TOTAL_MS, (elapsed / 3800) * TOTAL_MS);
      setMs(Math.round(value));
      if (value < TOTAL_MS) {
        raf = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const found = STAGES.findIndex((s) => ms >= s.from && ms < s.to);
  const stageIndex = found === -1 ? STAGES.length - 1 : found;
  const pct = (ms / TOTAL_MS) * 100;

  return (
    <section id="speed" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28" style={{ background: BAND }}>
      <div className="mx-auto max-w-[960px]">
        <Reveal>
          <SectionHead
            center
            label="Speed"
            title="What happens in 280 milliseconds"
            sub="Why callers never hang up: every step runs locally — no cloud round-trips, no robotic hesitation."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 rounded-[24px] border p-6 md:p-9" style={{ borderColor: HAIRLINE_2, background: CARD }}>
            <div className="flex items-center justify-between">
              <span className={`${mono} text-[11px] font-semibold uppercase tracking-[0.14em]`} style={{ color: INK_3 }}>
                Drag the timeline
              </span>
              <span className={`${mono} text-[13px] font-semibold`} style={{ color: GREEN }}>
                {ms} ms
              </span>
            </div>

            {/* Proportional track */}
            <div className="vl-scrub-wrap relative mt-4">
              <div className="relative h-3.5 w-full overflow-hidden rounded-full" style={{ background: "#ECE8E0" }}>
                {STAGES.map((s) => (
                  <div
                    key={s.title}
                    className="absolute top-0 h-full"
                    style={{ left: `${(s.from / TOTAL_MS) * 100}%`, width: "2px", background: "#FBFAF8" }}
                  />
                ))}
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg, #175134, ${GREEN})` }}
                />
              </div>
              <div
                className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] shadow-md"
                style={{ left: `calc(${pct}% )`, background: "#fff", borderColor: GREEN }}
              />
              <input
                type="range"
                min={0}
                max={TOTAL_MS}
                value={ms}
                onChange={(e) => {
                  setPlaying(false);
                  setMs(Number(e.target.value));
                }}
                className="absolute inset-x-0 -top-2 h-8 w-full cursor-ew-resize opacity-0"
                aria-label="Scrub the 280 millisecond response timeline"
              />
            </div>
            <div className={`${mono} mt-2 flex justify-between text-[10.5px]`} style={{ color: INK_3 }}>
              <span>0 ms</span>
              <span>{TOTAL_MS} ms</span>
            </div>

            {/* Stage cards */}
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {STAGES.map((s, i) => {
                const on = ms > s.from || i === 0;
                const isCurrent = i === stageIndex;
                return (
                  <button
                    key={s.title}
                    onClick={() => {
                      setPlaying(false);
                      setMs(s.to - 1);
                    }}
                    className="rounded-2xl border p-4 text-left transition-all"
                    style={{
                      borderColor: isCurrent ? "rgba(38,115,88,0.5)" : HAIRLINE,
                      background: isCurrent ? GREEN_SOFT : on ? "#F7F5F1" : "#FBF9F6",
                      opacity: on ? 1 : 0.6,
                      boxShadow: isCurrent ? "0 14px 34px -26px rgba(21,20,18,0.45)" : "none",
                    }}
                  >
                    <div className={`${mono} text-[11px] font-semibold`} style={{ color: GREEN }}>
                      {s.from} – {s.to} ms
                    </div>
                    <div className={`${display} mt-1.5 text-[14px] font-semibold`} style={{ color: INK }}>
                      {s.title}
                    </div>
                    <p className="mt-1.5 text-[12px] leading-relaxed" style={{ color: INK_2 }}>
                      {s.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-7 flex justify-center">
              <button
                onClick={() => {
                  setMs(0);
                  setPlaying(true);
                }}
                className="inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13px] font-semibold transition-colors hover:bg-[#F7F4EF]"
                style={{ borderColor: HAIRLINE_2, color: INK, background: CARD }}
              >
                <Play className="h-3.5 w-3.5" style={{ color: GREEN }} />
                Play the 280 ms
              </button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Guardrails: React.FC = () => {
  const cards = [
    {
      icon: Tag,
      title: "No invented pricing",
      body: "She quotes your set fees — never guesses a repair total over the phone. Off-list requests get a callback, not a made-up number.",
    },
    {
      icon: Clock,
      title: "Your hours, enforced",
      body: "A Sunday-midnight call gets Monday priority or your emergency rate — whichever you've set. She cannot talk her way around it.",
    },
    {
      icon: AlertTriangle,
      title: "Hazard escalation",
      body: "Gas smell, sparking breaker, burst pipe: she skips scheduling entirely and transfers to your on-call technician, immediately.",
    },
  ];

  return (
    <section id="guardrails" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <SectionHead
            center
            label="Guardrails"
            title="Your business. Your rules."
            sub="The real fear with AI on the phones is that it says something wrong. OFY takes hard rules that cannot be talked around."
          />
        </Reveal>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.07}>
              <div className="h-full rounded-[20px] border p-6" style={{ borderColor: HAIRLINE, background: "#FDFCFA" }}>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: GREEN_SOFT }}>
                  <c.icon style={{ color: GREEN, width: 18, height: 18 }} />
                </div>
                <h3 className={`${display} mt-4 text-[16.5px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
                  {c.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: INK_2 }}>
                  {c.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-xl text-center text-[12.5px] leading-relaxed" style={{ color: INK_3 }}>
            “Maya” is a sample OFY agent. You write the rules — and the studio shows exactly where each one
            is enforced in every conversation.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

const Privacy: React.FC = () => (
  <section id="privacy" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28" style={{ background: INK }}>
    <div className="mx-auto max-w-[1120px]">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <Reveal>
          <div>
            <Eyebrow tone="dark">Private by design</Eyebrow>
            <h2
              className={`${display} mt-3 text-[clamp(27px,3.3vw,38px)] leading-[1.1] tracking-[-0.02em]`}
              style={{ color: "#F7F5F1", fontWeight: 560, ...displayStyle }}
            >
              Calls that stay in the building.
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed" style={{ color: "#BDB9B1" }}>
              Most voice agents ship every call through a stack of third-party APIs. OFY runs speech,
              language, and voice on your own machine.
            </p>

            <ul className="mt-7 space-y-3.5">
              {[
                "No third-party model calls in the default setup",
                "Network egress off by default — it fails closed",
                "Transcripts, recordings, and bookings live on your hardware",
                "Cloud and telephony integrations are optional, scoped, and audited",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full" style={{ background: "rgba(157,191,173,0.18)" }}>
                    <Check className="h-3 w-3" style={{ color: "#9DBFAD" }} />
                  </span>
                  <span className="text-[13.5px] leading-relaxed" style={{ color: "#DAD6CE" }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-wrap gap-2">
              {["speech · local", "language · local", "voice · local"].map((chip) => (
                <span
                  key={chip}
                  className={`${mono} rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]`}
                  style={{ borderColor: "rgba(247,245,241,0.16)", color: "#C9C5BD" }}
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="rounded-[24px] border p-6 md:p-8" style={{ borderColor: "rgba(247,245,241,0.14)", background: "rgba(247,245,241,0.045)" }}>
            <div className="space-y-3">
              {[
                { icon: Phone, label: "Caller", detail: "Browser or phone line" },
                { icon: Server, label: "Your machine", detail: "Speech → language → voice, all local", accent: true },
                { icon: CalendarCheck, label: "Your calendar & log", detail: "Bookings, transcripts, recordings" },
              ].map((row, i) => (
                <React.Fragment key={row.label}>
                  <div
                    className="flex items-center gap-4 rounded-2xl border px-4 py-3.5"
                    style={
                      row.accent
                        ? { borderColor: "rgba(157,191,173,0.55)", background: "rgba(157,191,173,0.13)", boxShadow: "0 0 0 4px rgba(157,191,173,0.06)" }
                        : { borderColor: "rgba(247,245,241,0.14)", background: "rgba(247,245,241,0.035)" }
                    }
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-xl" style={{ background: "rgba(247,245,241,0.09)" }}>
                      <row.icon className="h-4 w-4" style={{ color: row.accent ? "#9DBFAD" : "#DAD6CE" }} />
                    </span>
                    <div>
                      <div className="text-[13.5px] font-semibold" style={{ color: "#F7F5F1" }}>
                        {row.label}
                      </div>
                      <div className="text-[12px]" style={{ color: "#BDB9B1" }}>
                        {row.detail}
                      </div>
                    </div>
                    {row.accent && (
                      <span
                        className={`${mono} ml-auto hidden rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline-flex`}
                        style={{ background: "rgba(157,191,173,0.18)", color: "#9DBFAD" }}
                      >
                        local
                      </span>
                    )}
                  </div>
                  {i < 2 && (
                    <div className="flex justify-center">
                      <ChevronDown className="h-4 w-4" style={{ color: "rgba(247,245,241,0.38)" }} />
                    </div>
                  )}
                </React.Fragment>
              ))}
              <div className="flex items-center justify-center gap-2.5 pt-3">
                <CloudOff className="h-4 w-4" style={{ color: "#9DBFAD" }} />
                <span className="text-[12px] font-semibold" style={{ color: "#C9C5BD" }}>
                  Third-party model clouds — not in the path
                </span>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
);

const Ledger: React.FC = () => {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <section id="ledger" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[1120px]">
        <Reveal>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <SectionHead
              label="Sample day"
              title="The jobs you didn't miss."
              sub="What one day looks like when every call gets answered. Illustration — sample data."
            />
            <div
              className={`${mono} self-start rounded-full border px-3.5 py-1.5 text-[11px] font-semibold md:self-auto`}
              style={{ borderColor: HAIRLINE_2, color: GREEN, background: GREEN_SOFT }}
            >
              4 calls captured · $3,250 added
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-10 overflow-hidden rounded-[20px] border" style={{ borderColor: HAIRLINE, background: CARD }}>
            <div className="hidden grid-cols-[130px_110px_1fr_110px] gap-4 border-b px-6 py-3 md:grid" style={{ borderColor: HAIRLINE, background: "#FDFCFA" }}>
              {["Time", "Trade", "Call", "Value"].map((h) => (
                <span key={h} className={`${mono} text-[10.5px] font-semibold uppercase tracking-[0.14em]`} style={{ color: INK_2 }}>
                  {h}
                </span>
              ))}
            </div>

            <div>
              {LEDGER_ROWS.map((row, i) => {
                const isOpen = expanded === i;
                return (
                  <div key={row.time} className="border-b last:border-b-0" style={{ borderColor: HAIRLINE }}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : i)}
                      className="grid w-full grid-cols-1 items-center gap-2 px-6 py-4 text-left transition-colors hover:bg-[#FDFCFA] md:grid-cols-[130px_110px_1fr_110px] md:gap-4"
                      aria-expanded={isOpen}
                    >
                      <span className={`${mono} text-[12px]`} style={{ color: INK_3 }}>
                        {row.time}
                      </span>
                      <span className="inline-flex w-fit rounded-md px-2 py-0.5 text-[11px] font-semibold" style={{ background: BAND, color: INK_2 }}>
                        {row.trade}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-semibold" style={{ color: INK }}>
                          {row.caller} — {row.problem}
                        </span>
                      </span>
                      <span className="flex items-center justify-between gap-3 md:justify-end">
                        <span className={`${mono} text-[13px] font-semibold`} style={{ color: GREEN }}>
                          {row.value}
                        </span>
                        <ChevronDown className={`h-4 w-4 flex-none transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: INK_3 }} />
                      </span>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="border-l-2 px-6 pb-5 md:pl-[152px]" style={{ borderColor: GREEN, background: "#FDFCFA" }}>
                            <p className="pt-1 text-[13px]" style={{ color: INK_2 }}>
                              <span className="font-semibold" style={{ color: INK }}>
                                What happened:{" "}
                              </span>
                              {row.resolution}
                            </p>
                            <p className={`${mono} pt-2 text-[11.5px] font-semibold`} style={{ color: SUCCESS }}>
                              ✓ Calendar event written · text confirmation delivered in 42 seconds
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Calculator: React.FC<{ onLaunchStudio: () => void }> = ({ onLaunchStudio }) => {
  const [missed, setMissed] = useState(16);
  const [ticket, setTicket] = useState(850);

  const RECOVERY = 0.35; // share of missed callers who book when someone answers instantly
  const monthly = (missed * 4.33 * RECOVERY * ticket) / 1000;
  const annual = monthly * 12;
  const round = (n: number) => Math.round(n) * 1000;

  return (
    <section className="px-5 py-20 md:px-8 md:py-28" style={{ background: BAND }}>
      <div className="mx-auto max-w-[960px]">
        <Reveal>
          <SectionHead
            center
            label="The math"
            title="What voicemail costs you"
            sub="Every missed call is a customer with a card out, dialing the next shop down the road."
          />
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 grid gap-8 rounded-[24px] border p-6 md:grid-cols-12 md:p-10" style={{ borderColor: HAIRLINE_2, background: CARD }}>
            <div className="space-y-8 md:col-span-7">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold" style={{ color: INK }}>
                    Missed calls each week
                  </span>
                  <span className={`${mono} text-[15px] font-semibold`} style={{ color: GREEN }}>
                    {missed}
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={50}
                  value={missed}
                  onChange={(e) => setMissed(Number(e.target.value))}
                  className="vl-range mt-3 w-full"
                  aria-label="Missed calls each week"
                />
                <div className={`${mono} mt-1.5 flex justify-between text-[10.5px]`} style={{ color: INK_3 }}>
                  <span>4</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[13.5px] font-semibold" style={{ color: INK }}>
                    Average ticket
                  </span>
                  <span className={`${mono} text-[15px] font-semibold`} style={{ color: GREEN }}>
                    ${ticket.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={200}
                  max={2500}
                  step={50}
                  value={ticket}
                  onChange={(e) => setTicket(Number(e.target.value))}
                  className="vl-range mt-3 w-full"
                  aria-label="Average ticket"
                />
                <div className={`${mono} mt-1.5 flex justify-between text-[10.5px]`} style={{ color: INK_3 }}>
                  <span>$200</span>
                  <span>$2,500</span>
                </div>
              </div>

              <p className="text-[12px] leading-relaxed" style={{ color: INK_3 }}>
                Estimate assumes 35% of missed callers book when someone answers instantly — the rest have
                already called the next company. {missed} × 52 wks × ${ticket} × 35%.
              </p>
            </div>

            <div className="md:col-span-5">
              <div className="flex h-full flex-col justify-center rounded-2xl border p-7 text-center" style={{ borderColor: HAIRLINE, background: "#FBF9F6" }}>
                <div className={`${mono} text-[10.5px] font-semibold uppercase tracking-[0.16em]`} style={{ color: INK_3 }}>
                  Recovered revenue · per year
                </div>
                <div className={`${display} mt-2 text-[clamp(34px,4.4vw,46px)] font-semibold tracking-[-0.02em]`} style={{ color: GREEN, ...displayStyle }}>
                  ${round(annual).toLocaleString()}
                </div>
                <div className="mt-1 text-[12px]" style={{ color: INK_2 }}>
                  ≈ ${round(monthly).toLocaleString()} per month
                </div>
                <button
                  onClick={onLaunchStudio}
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3.5 text-[13.5px] font-semibold text-white transition-transform hover:-translate-y-[1px]"
                  style={{ background: INK }}
                >
                  Put OFY on the line
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
};

const Faq: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="scroll-mt-20 px-5 py-20 md:px-8 md:py-28">
      <div className="mx-auto max-w-[760px]">
        <Reveal>
          <SectionHead center label="FAQ" title="Questions, answered." />
        </Reveal>
        <div className="mt-10">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q} className="border-b" style={{ borderColor: HAIRLINE }}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className={`${display} text-[15.5px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
                    {f.q}
                  </span>
                  <ChevronDown className={`h-4 w-4 flex-none transition-transform ${isOpen ? "rotate-180" : ""}`} style={{ color: INK_3 }} />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-5 pr-10 text-[13.5px] leading-relaxed" style={{ color: INK_2 }}>
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

const ClosingCTA: React.FC<{ onLaunchStudio: () => void }> = ({ onLaunchStudio }) => (
  <section className="relative overflow-hidden px-5 py-24 md:px-8 md:py-32" style={{ background: BAND }}>
    <RingField className="pointer-events-none absolute left-1/2 top-1/2 h-[760px] w-[760px] -translate-x-1/2 -translate-y-1/2" strength={0.8} />
    <div className="relative mx-auto max-w-[760px] text-center">
      <Reveal>
        <h2
          className={`${display} text-[clamp(32px,4.6vw,52px)] leading-[1.06] tracking-[-0.024em]`}
          style={{ color: INK, fontWeight: 600, ...displayStyle }}
        >
          Stop losing jobs to empty rings.
        </h2>
      </Reveal>
      <Reveal delay={0.08}>
        <p className="mx-auto mt-5 max-w-lg text-[15.5px] leading-relaxed" style={{ color: INK_2 }}>
          Put OFY on your front desk — try the full studio, or set it up with us and go live on your own
          machine this week.
        </p>
      </Reveal>
      <Reveal delay={0.14}>
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onLaunchStudio}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-4 text-[14.5px] font-semibold text-white transition-transform hover:-translate-y-[1px] sm:w-auto"
            style={{ background: INK, boxShadow: "0 22px 50px -24px rgba(21,20,18,0.55)" }}
          >
            Open the studio
            <ArrowRight className="h-4 w-4" />
          </button>
          <a
            href="#console"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border px-7 py-4 text-[14.5px] font-semibold sm:w-auto"
            style={{ borderColor: HAIRLINE_2, color: INK, background: "rgba(255,255,255,0.65)" }}
          >
            Replay the demo
          </a>
        </div>
        <p className="mt-5 text-[12.5px]" style={{ color: INK_3 }}>
          Local-first · self-hosted · your data stays yours
        </p>
      </Reveal>
    </div>
  </section>
);

const Footer: React.FC<{ onLaunchStudio: () => void }> = ({ onLaunchStudio }) => (
  <footer className="border-t px-5 py-12 md:px-8" style={{ borderColor: HAIRLINE, background: CANVAS }}>
    <div className="mx-auto max-w-[1120px]">
      <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <Mark size={28} />
            <span className={`${display} text-[16px] font-semibold tracking-[-0.01em]`} style={{ color: INK }}>
              OFY
            </span>
          </div>
          <p className="mt-3 max-w-[240px] text-[12.5px] leading-relaxed" style={{ color: INK_2 }}>
            Autonomous inbound dispatch for local service businesses. Answers on ring one, books the job,
            keeps your data at home.
          </p>
        </div>

        <div>
          <div className={`${mono} text-[10.5px] font-semibold uppercase tracking-[0.16em]`} style={{ color: INK_3 }}>
            Product
          </div>
          <ul className="mt-3 space-y-2 text-[13px]">
            {[
              { label: "How it works", href: "#how" },
              { label: "Live demo", href: "#console" },
              { label: "Guardrails", href: "#guardrails" },
              { label: "FAQ", href: "#faq" },
            ].map((l) => (
              <li key={l.href}>
                <a href={l.href} style={{ color: INK_2 }}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className={`${mono} text-[10.5px] font-semibold uppercase tracking-[0.16em]`} style={{ color: INK_3 }}>
            Studio
          </div>
          <ul className="mt-3 space-y-2 text-[13px]">
            <li>
              <button onClick={onLaunchStudio} className="text-left" style={{ color: INK_2 }}>
                Open the studio
              </button>
            </li>
            <li>
              <a href="#privacy" style={{ color: INK_2 }}>
                Privacy model
              </a>
            </li>
            <li>
              <a href="#speed" style={{ color: INK_2 }}>
                How fast it answers
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className={`${mono} text-[10.5px] font-semibold uppercase tracking-[0.16em]`} style={{ color: INK_3 }}>
            Under the hood
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed" style={{ color: INK_2 }}>
            Runs on open models — llama.cpp, faster-whisper, and Piper — on hardware you own.
          </p>
          <div className="mt-3 flex items-center gap-2 text-[12px]" style={{ color: INK_3 }}>
            <Lock className="h-3.5 w-3.5" />
            Local inference · no cloud in the path
          </div>
        </div>
      </div>

      <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 text-[11.5px] md:flex-row" style={{ borderColor: HAIRLINE, color: INK_3 }}>
        <span>© 2026 OddFromYou</span>
        <span className="flex items-center gap-2">
          <ShieldCheck className="h-3.5 w-3.5" />
          Zero-egress private architecture · calendar connected
        </span>
      </div>
    </div>
  </footer>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchStudio }) => (
  <div className="min-h-screen antialiased" style={{ background: CANVAS, color: INK }}>
    <Nav onLaunchStudio={onLaunchStudio} />
    <main>
      <Hero />
      <LiveConsole />
      <div className="px-5 pb-24 pt-0 md:px-8" style={{ background: BAND }}>
        <div className="h-0" />
        <CallPlayer
          src="/demo_conversation.mp3"
          title="Hear a booking call, start to finish — 85 seconds"
          sub="Sample recording — a caller books a same-day repair with the local voice stack."
        />
      </div>
      <HowItWorks />
      <AcousticTimeline />
      <Guardrails />
      <Privacy />
      <Ledger />
      <Calculator onLaunchStudio={onLaunchStudio} />
      <Faq />
      <ClosingCTA onLaunchStudio={onLaunchStudio} />
    </main>
    <Footer onLaunchStudio={onLaunchStudio} />
  </div>
);
