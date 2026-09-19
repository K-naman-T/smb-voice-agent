import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, ChevronDown, CloudOff, Clock, Lock, Menu, Mic, Pause, Phone, Play, RotateCcw, Server, ShieldCheck, Tag, X } from "lucide-react";

interface LandingPageProps { onLaunchStudio: () => void; }
type Theme = "paper" | "carbon";
type CallStep = "ready" | "inquiry" | "pivot" | "booked";
const ART = "/assets/art/bell-marks";

const PRESETS = {
  hvac: {
    tab: "HVAC", business: "CoolAir Climate Systems", category: "Heating & Cooling", caller: "Sarah M.",
    greeting: "Thank you for calling CoolAir Climate Systems — this is Maya at the front desk. Is your AC acting up, or would you like to schedule service?",
    inquiry: "Our outdoor unit stopped spinning, and water is pooling under the indoor vent onto the floor.",
    response: "I'm sorry — that usually means a backed-up condensate line or a frozen coil. I have a technician in your neighborhood between 1:30 and 3:30 today. The diagnostic is $79 and it's credited toward the repair. May I hold that window?",
    interrupt: "Wait — my husband won't be home from work until 5. Do you have anything after 5:30?",
    pivot: "Of course. Our evening technician has 5:30 to 7:00 open tonight — would that suit him better?",
    booked: "Booked — tonight, 5:30 to 7:00 PM. Confirmation CL-402 is in the schedule. I've texted the details and your technician tracker.",
    bookingChip: "Tue · 5:30–7:00 PM · reserved", value: "$920 job captured",
  },
  plumbing: {
    tab: "PLUMBING", business: "Titan Plumbing Co.", category: "Commercial & Home Plumbing", caller: "Marcus T.",
    greeting: "Titan Plumbing — this is Maya. Do you have an active leak, or would you like to schedule a service visit?",
    inquiry: "The main floor drain is backing up into the utility room right now — water is starting to spread.",
    response: "That's a priority — I can send the hydro-jet crew straight out, arrival within about 35 minutes. Before I dispatch, can you confirm the address on file?",
    interrupt: "Wait — will that mean shutting off the water for the whole building?",
    pivot: "No — we isolate just the utility riser valve, so the rest of the building keeps full pressure. Confirming the emergency dispatch now — crew ETA 32 minutes.",
    booked: "Crew dispatched — priority unit TTN-049 is locked in, ETA 32 minutes. I've texted you a live tracking link and notified the on-call supervisor.",
    bookingChip: "Today · crew ETA 32 min · dispatched", value: "$1,450 emergency job",
  },
  dental: {
    tab: "DENTAL", business: "Metropolitan Dental Group", category: "Family & Emergency Dental", caller: "Elena R.",
    greeting: "Metropolitan Dental — this is Maya. Are you an existing patient, or would you like to book an appointment?",
    inquiry: "I cracked an upper premolar at lunch and it throbs whenever anything cold touches it.",
    response: "Ouch — I'm sorry. Dr. Chen keeps priority slots open for dental trauma. There's an opening today at 3:15 PM to relieve the pain and take imaging. Would you like that chair?",
    interrupt: "Do you take Delta Dental Premier? I don't want a surprise bill.",
    pivot: "Yes — we're in-network with Delta Dental Premier, and the emergency exam is billed under standard preventive terms. Shall I reserve 3:15 PM?",
    booked: "Reserved — 3:15 PM today with Dr. Chen, patient file MET-708 locked into the clinic calendar. I've sent the intake forms to your phone.",
    bookingChip: "Today · 3:15 PM · reserved", value: "$380 visit booked",
  },
} as const;

const LEDGER_ROWS = [
  ["06:15", "DENTAL", "Elena R.", "Cracked molar / trauma chair reserved", "$420", "3:15 PM chair reserved with Dr. Chen; insurance pre-verified; intake forms sent"],
  ["11:02", "PLUMBING", "Marcus T.", "Kitchen drain / sewer backflow", "$1,400", "Emergency crew dispatched in 35 minutes; riser-valve guidance given; supervisor notified"],
  ["14:40", "AUTO", "Dave K.", "Brake squeal / rotor grinding", "$580", "Bay 2 reserved for Thursday 8:30 AM; overnight key-drop confirmed"],
  ["20:14", "HVAC", "Sarah M.", "Compressor freeze / ceiling drywall", "$850", "Evening slot reserved for tomorrow, 5:30–7:00 PM; SMS + tracker sent"],
] as const;

const FAQS = [
  ["Where does Bellmaker actually run?", "On your machine — a GPU box, a mini-PC, or the computer behind your desk. Speech, language, and voice models all run locally; nothing is sent to third-party model APIs in the default setup."],
  ["Does she sound like a robot?", "She sounds like a calm, competent receptionist — not a movie star. Local voices trade a little warmth for complete privacy, and you can swap in higher-quality voices without changing anything else."],
  ["Can she handle Hindi and English?", "Yes — English and Hindi voice profiles are supported and certified independently, so you can enable either or both."],
  ["What happens when she can't help?", "She hands off to a human with the full transcript and context — and for safety matters (gas, sparks, flooding) she escalates immediately, by rule."],
  ["How do I go live?", "Start in the browser today. When you're ready for a real number, telephony connects through an optional adapter — off by default, enabled per number."],
] as const;

const fade = { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-50px" }, transition: { duration: 0.42 } };

function SectionLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return <div className="spec-label"><span>{number}</span><span>{children}</span></div>;
}
function RuleHeading({ number, title, note }: { number: string; title: string; note?: string }) {
  return <div className="rule-heading"><SectionLabel number={number}>{title}</SectionLabel>{note && <span className="rule-note">{note}</span>}</div>;
}
function Button({ children, onClick, href, solid = false, className = "" }: { children: React.ReactNode; onClick?: () => void; href?: string; solid?: boolean; className?: string }) {
  const props = { className: "sheet-button " + (solid ? "sheet-button--solid " : "") + className, onClick };
  return href ? <a {...props} href={href}>{children}</a> : <button {...props}>{children}</button>;
}
function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div {...fade} className={className}>{children}</motion.div>;
}
function Waveform({ active }: { active: boolean }) {
  return <div className={"waveform " + (active ? "waveform--active" : "")} aria-hidden="true">{Array.from({ length: 28 }, (_, i) => <i key={i} style={{ height: (10 + ((i * 17) % 24)) + "%" }} />)}</div>;
}

function Header({ onLaunchStudio, theme, setTheme }: { onLaunchStudio: () => void; theme: Theme; setTheme: (t: Theme) => void }) {
  const [open, setOpen] = useState(false);
  const links = [["#how", "HOW IT WORKS"], ["#console", "LIVE CALL"], ["#guardrails", "GUARDRAILS"], ["#faq", "FAQ"]];
  return <header className="site-header"><div className="header-inner">
    <a className="wordmark" href="#top" aria-label="Bellmaker home">BELLMAKER</a>
    <div className="header-meta">LOCAL-PRIVATE VOICE AGENTS · EST. 2026 · INK #151412 / PAPER #FBFAF8</div>
    <nav className={open ? "header-nav header-nav--open" : "header-nav"} aria-label="Main navigation">
      {links.map(([href, label]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      <Button onClick={onLaunchStudio} solid>OPEN STUDIO <ArrowRight size={13} /></Button>
    </nav>
    <div className="header-actions">
      <button className="theme-switch" onClick={() => setTheme(theme === "paper" ? "carbon" : "paper")} aria-label="Toggle paper and carbon theme"><span className={theme === "paper" ? "active" : ""}>PAPER</span><span className={theme === "carbon" ? "active" : ""}>CARBON</span></button>
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label={open ? "Close menu" : "Open menu"}>{open ? <X size={18} /> : <Menu size={18} />}</button>
    </div>
  </div></header>;
}

function Hero({ onLaunchStudio }: { onLaunchStudio: () => void }) {
  return <section id="top" className="hero sheet-section"><div className="sheet-wrap">
    <SectionLabel number="01">HERO / INBOUND FRONT DESK</SectionLabel>
    <div className="hero-grid">
      <Reveal className="hero-copy"><div className="hero-kicker">LOCAL-PRIVATE VOICE AGENTS / OPERATOR EDITION</div><h1>Never miss<br /><em>the ring.</em></h1><p className="hero-lede">Bellmaker answers your business phone on ring one, handles the interruption, and books the work — on a local stack you can inspect.</p><div className="hero-actions"><Button href="#console" solid>HEAR THE LIVE CALL <ArrowRight size={14} /></Button><Button onClick={onLaunchStudio}>OPEN THE STUDIO</Button></div><p className="hero-footnote">NO SIGNUP · BROWSER DEMO · SAMPLE DATA ONLY</p></Reveal>
      <Reveal className="hero-plate"><div className="plate-meta"><span>PLATE A / MAKER MOTIF</span><span>01 / 02</span></div><div className="hero-art-frame"><img src={ART + "/lockups/mark_maker.png"} alt="Bellmaker maker mark" /></div><div className="plate-caption"><span>MARK_MAKER / APPROVED</span><span>LINEWORK + BELL</span></div></Reveal>
    </div>
    <div className="hero-ledger"><div><span>RESPONSE PATH</span><strong>CALL → LOCAL STACK → BOOKED</strong></div><div><span>FIRST AUDIO</span><strong>280 MS TARGET</strong></div><div><span>DEFAULT MODE</span><strong>NETWORK EGRESS OFF</strong></div><div><span>LANGUAGES</span><strong>ENGLISH + HINDI</strong></div></div>
  </div></section>;
}

function LiveConsole() {
  const [vertical, setVertical] = useState<keyof typeof PRESETS>("hvac");
  const [step, setStep] = useState<CallStep>("ready");
  const [playing, setPlaying] = useState(false);
  const preset = PRESETS[vertical];
  const order: CallStep[] = ["ready", "inquiry", "pivot", "booked"];
  useEffect(() => {
    if (!playing) return;
    if (step === "ready") { const id = window.setTimeout(() => setStep("inquiry"), 800); return () => clearTimeout(id); }
    if (step === "inquiry") { const id = window.setTimeout(() => setStep("pivot"), 2800); return () => clearTimeout(id); }
    if (step === "pivot") { const id = window.setTimeout(() => setStep("booked"), 2800); return () => clearTimeout(id); }
    setPlaying(false);
  }, [playing, step]);
  const reset = () => { setStep("ready"); setPlaying(false); };
  const advance = (target: CallStep) => { if (order.indexOf(target) <= order.indexOf(step) + 1) { setPlaying(false); setStep(target); } };
  const turn = (label: string, text: string, kind: "agent" | "caller") => <motion.div key={label + text} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={"console-turn console-turn--" + kind}><span>{label}</span><p>{text}</p></motion.div>;
  return <section id="console" className="sheet-section section-band"><div className="sheet-wrap">
    <Reveal><RuleHeading number="02 / LIVE CALL" title="THE OPERATOR CONSOLE" note="SCRIPTED WALKTHROUGH / SAMPLE DATA" /></Reveal>
    <Reveal className="call-card"><div className="call-card-head"><div><strong><span className="status-mark" />{preset.business}</strong><small>{preset.category} · INBOUND LINE · CALENDAR CONNECTED</small></div><div className="preset-tabs">{(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((key) => <button key={key} className={vertical === key ? "active" : ""} onClick={() => { setVertical(key); reset(); }}>{PRESETS[key].tab}</button>)}</div></div>
      <div className="call-wave"><Waveform active={step !== "ready"} /><span>{step === "booked" ? "CALL ENDED · 0:34" : step === "ready" ? "WAITING FOR CALLER" : "SPEAKING / LISTENING"}</span></div>
      <div className="transcript">{turn("BELLMAKER · FRONT DESK · 0:01", preset.greeting, "agent")}{step !== "ready" && turn("CALLER · " + preset.caller + " · 0:08", preset.inquiry, "caller")}{(step === "pivot" || step === "booked") && turn("BELLMAKER · FRONT DESK · 0:14", preset.response, "agent")}{(step === "pivot" || step === "booked") && turn("[ MID-SENTENCE INTERRUPTION ] · 0:18", preset.interrupt, "caller")}{step === "booked" && turn("BELLMAKER · FRONT DESK · 0:21", preset.pivot, "agent")}{step === "booked" && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="booking-result"><span>CALENDAR · WRITE CONFIRMED · 0:28</span><p>{preset.booked}</p><div><b>{preset.bookingChip}</b><b>SMS CONFIRMATION SENT</b><b>{preset.value}</b></div></motion.div>}</div>
      <div className="call-controls"><div className="step-buttons">{([["inquiry", "01 / CALLER PROBLEM", <Play size={12} />], ["pivot", "02 / INTERRUPT HER", <Mic size={12} />], ["booked", "03 / CONFIRM BOOKING", <Check size={12} />]] as const).map(([target, label, icon]) => <button key={target} disabled={order.indexOf(target) > order.indexOf(step) + 1} className={step === target || order.indexOf(step) > order.indexOf(target) ? "done" : ""} onClick={() => advance(target)}>{icon}{label}</button>)}</div><div className="call-utility"><button onClick={() => { if (playing) setPlaying(false); else { reset(); setPlaying(true); } }}>{playing ? <Pause size={12} /> : <Play size={12} />}{playing ? "PAUSE" : "PLAY WHOLE CALL"}</button><button onClick={reset}><RotateCcw size={12} />RESET</button></div></div>
    </Reveal><p className="section-footnote">SCRIPTED WALKTHROUGH WITH SAMPLE DATA. THE SAME FLOW RUNS LIVE IN THE STUDIO AGAINST THE LOCAL STACK.</p>
  </div></section>;
}

function CallPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(85);
  useEffect(() => { const audio = audioRef.current; if (!audio) return; const onTime = () => setTime(audio.currentTime); const onMeta = () => setDuration(audio.duration || 85); const onEnd = () => setPlaying(false); audio.addEventListener("timeupdate", onTime); audio.addEventListener("loadedmetadata", onMeta); audio.addEventListener("ended", onEnd); const onPlay = () => { void audio.play(); setPlaying(true); }; window.addEventListener("bellmaker:play-call", onPlay); return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("loadedmetadata", onMeta); audio.removeEventListener("ended", onEnd); window.removeEventListener("bellmaker:play-call", onPlay); }; }, []);
  const toggle = () => { const audio = audioRef.current; if (!audio) return; if (audio.paused) { void audio.play(); setPlaying(true); } else { audio.pause(); setPlaying(false); } };
  const fmt = (s: number) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");
  return <Reveal><div id="call" className="audio-card"><audio ref={audioRef} src="/demo_conversation.mp3" preload="metadata" /><button className="audio-play" onClick={toggle} aria-label={playing ? "Pause sample call" : "Play sample call"}>{playing ? <Pause size={17} /> : <Play size={17} />}</button><div className="audio-body"><div className="audio-top"><strong>REAL RECORDING / BOOKING CALL</strong><span>{fmt(time)} / {fmt(duration)}</span></div><p>Sample recording — a caller books a same-day repair with the local voice stack.</p><div className="audio-track"><span style={{ width: (duration ? (time / duration) * 100 : 0) + "%" }} /><Waveform active={playing} /></div></div></div></Reveal>;
}

function HowItWorks() {
  const steps = [["01", "WRITE THE BRIEF", "Services, hours, prices, policies — and the things the agent must never do."], ["02", "COMPILE THE AGENT", "The brief becomes a versioned, checksummed configuration. Every change is reviewable."], ["03", "TEST BEFORE ANSWERING", "Run deterministic simulations, then take a live test call in the studio."], ["04", "GO LIVE", "Start in the browser, add a phone number when ready. Bookings land in your calendar."]];
  return <section id="how" className="sheet-section"><div className="sheet-wrap"><Reveal><RuleHeading number="03 / WORKFLOW" title="FROM BRIEF TO LIVE FRONT DESK" note="FOUR CONTROLLED STAGES" /></Reveal><div className="four-grid">{steps.map(([n, title, body]) => <Reveal key={n}><article className="catalog-cell"><span>{n}</span><h3>{title}</h3><p>{body}</p><small>LOCAL STACK / VERIFIED</small></article></Reveal>)}</div></div></section>;
}

function Speed() {
  const [ms, setMs] = useState(280);
  const [playing, setPlaying] = useState(false);
  useEffect(() => { if (!playing) return; const started = performance.now(); let id = 0; const tick = (now: number) => { setMs(Math.min(280, Math.round(((now - started) / 2600) * 280))); if (now - started < 2600) id = requestAnimationFrame(tick); else setPlaying(false); }; id = requestAnimationFrame(tick); return () => cancelAnimationFrame(id); }, [playing]);
  const stages = [["00—040 MS", "HEARS YOU", "Voice detection strips background noise."], ["040—110 MS", "WRITES IT DOWN", "Local speech-to-text makes the transcript."], ["110—200 MS", "CHECKS THE FACTS", "Availability, prices, and rules are checked."], ["200—280 MS", "ANSWERS", "First audio plays. The caller hears a reply."]];
  return <section id="speed" className="sheet-section section-band"><div className="sheet-wrap"><Reveal><RuleHeading number="04 / RESPONSE TIME" title="WHAT HAPPENS IN 280 MILLISECONDS" note="LOCAL PIPELINE / NO CLOUD ROUND-TRIPS" /></Reveal><Reveal className="speed-panel"><div className="speed-readout"><span>RESPONSE BUDGET</span><strong>{ms} MS</strong></div><div className="timeline"><span style={{ width: (ms / 280) * 100 + "%" }} /><input type="range" min="0" max="280" value={ms} onChange={(e) => { setPlaying(false); setMs(Number(e.target.value)); }} aria-label="Scrub the 280 millisecond response timeline" /></div><div className="timeline-labels"><span>0 MS</span><span>280 MS</span></div><div className="speed-grid">{stages.map(([time, title, body], i) => <button key={time} className={ms >= [40, 110, 200, 280][i] || (i === 0 && ms > 0) ? "active" : ""} onClick={() => { setPlaying(false); setMs([39, 109, 199, 280][i]); }}><span>{time}</span><strong>{title}</strong><p>{body}</p></button>)}</div><Button onClick={() => { setMs(0); setPlaying(true); }}><Play size={12} /> PLAY THE 280 MS</Button></Reveal></div></section>;
}

function Guardrails() {
  const rows = [[Tag, "NO INVENTED PRICING", "She quotes your set fees — never guesses a repair total over the phone."], [Clock, "YOUR HOURS, ENFORCED", "A Sunday-midnight call gets Monday priority or your emergency rate — whichever you've set."], [ShieldCheck, "HAZARD ESCALATION", "Gas smell, sparking breaker, burst pipe: she skips scheduling and transfers immediately."]];
  return <section id="guardrails" className="sheet-section"><div className="sheet-wrap"><Reveal><RuleHeading number="05 / GUARDRAILS" title="YOUR BUSINESS. YOUR RULES." note="HARD CONSTRAINTS / ALWAYS ON" /></Reveal><div className="three-grid">{rows.map(([Icon, title, body]) => <Reveal key={title as string}><article className="guardrail-cell"><Icon size={17} /><h3>{title as string}</h3><p>{body as string}</p><small>RULESET / ENFORCED</small></article></Reveal>)}</div><p className="section-footnote">“MAYA” IS A SAMPLE BELLMAKER AGENT. YOU WRITE THE RULES — THE STUDIO SHOWS WHERE EACH ONE IS ENFORCED.</p></div></section>;
}

function Privacy() {
  const rows = [[Phone, "CALLER", "Browser or phone line"], [Server, "YOUR MACHINE", "Speech → language → voice, all local"], [Lock, "YOUR CALENDAR + LOG", "Bookings, transcripts, recordings"]];
  return <section id="privacy" className="sheet-section section-carbon"><div className="sheet-wrap"><Reveal><RuleHeading number="06 / PRIVACY" title="CALLS THAT STAY IN THE BUILDING" note="CARBON PLATE / ZERO-EGRESS DEFAULT" /></Reveal><div className="privacy-grid"><div className="privacy-copy"><p>Most voice agents ship every call through a stack of third-party APIs. Bellmaker runs speech, language, and voice on your own machine.</p><ul>{["No third-party model calls in the default setup", "Network egress off by default — it fails closed", "Transcripts, recordings, and bookings live on your hardware", "Cloud and telephony integrations are optional, scoped, and audited"].map((item) => <li key={item}><Check size={13} />{item}</li>)}</ul></div><div className="privacy-flow">{rows.map(([Icon, title, body], i) => <React.Fragment key={title as string}><div className={i === 1 ? "flow-row flow-row--local" : "flow-row"}><Icon size={15} /><div><strong>{title as string}</strong><span>{body as string}</span></div>{i === 1 && <b>LOCAL</b>}</div>{i < 2 && <div className="flow-rule" />}</React.Fragment>)}<div className="privacy-note"><CloudOff size={15} /> THIRD-PARTY MODEL CLOUDS — NOT IN THE PATH</div></div></div></div></section>;
}

function Ledger() {
  const [expanded, setExpanded] = useState(0);
  return <section id="ledger" className="sheet-section"><div className="sheet-wrap"><Reveal><RuleHeading number="07 / LEDGER" title="THE JOBS YOU DIDN'T MISS" note="SAMPLE DAY / ILLUSTRATION" /></Reveal><Reveal className="ledger-panel"><div className="ledger-summary"><span>4 CALLS CAPTURED</span><strong>$3,250 ADDED</strong></div><div className="ledger-head"><span>TIME</span><span>TRADE</span><span>CALLER / PROBLEM</span><span>VALUE</span></div>{LEDGER_ROWS.map((row, i) => <div className="ledger-row" key={row[0]}><button onClick={() => setExpanded(expanded === i ? -1 : i)} aria-expanded={expanded === i}><span>{row[0]}</span><b>{row[1]}</b><strong>{row[2]} — {row[3]}</strong><em>{row[4]}</em><ChevronDown size={14} /></button><AnimatePresence initial={false}>{expanded === i && <motion.div className="ledger-detail" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p><strong>WHAT HAPPENED:</strong> {row[5]}</p><small>✓ CALENDAR EVENT WRITTEN · TEXT CONFIRMATION DELIVERED IN 42 SECONDS</small></motion.div>}</AnimatePresence></div>)}</Reveal></div></section>;
}

function Calculator({ onLaunchStudio }: { onLaunchStudio: () => void }) {
  const [missed, setMissed] = useState(16);
  const [ticket, setTicket] = useState(850);
  const annual = Math.round(missed * 52 * 0.35 * ticket / 1000) * 1000;
  const monthly = Math.round(annual / 12 / 1000) * 1000;
  return <section className="sheet-section section-band"><div className="sheet-wrap"><Reveal><RuleHeading number="08 / CALCULATOR" title="WHAT VOICEMAIL COSTS YOU" note="35% RECOVERY ASSUMPTION" /></Reveal><Reveal className="calculator"><div className="calc-inputs"><label>MISSED CALLS EACH WEEK <output>{missed}</output><input type="range" min="4" max="50" value={missed} onChange={(e) => setMissed(Number(e.target.value))} /></label><label>AVERAGE TICKET <output>{ "$" + ticket.toLocaleString() }</output><input type="range" min="200" max="2500" step="50" value={ticket} onChange={(e) => setTicket(Number(e.target.value))} /></label><p>ESTIMATE ASSUMES 35% OF MISSED CALLERS BOOK WHEN SOMEONE ANSWERS INSTANTLY.</p></div><div className="calc-result"><span>RECOVERED REVENUE / YEAR</span><strong>{ "$" + annual.toLocaleString() }</strong><small>{ "≈ $" + monthly.toLocaleString() } / MONTH</small><Button onClick={onLaunchStudio} solid>PUT BELLMAKER ON THE LINE <ArrowRight size={13} /></Button></div></Reveal></div></section>;
}

function Faq() {
  const [open, setOpen] = useState(0);
  return <section id="faq" className="sheet-section"><div className="sheet-wrap faq-wrap"><Reveal><RuleHeading number="09 / FAQ" title="QUESTIONS, ANSWERED" note="OPERATOR NOTES" /></Reveal><div className="faq-list">{FAQS.map(([question, answer], i) => <div className="faq-row" key={question}><button onClick={() => setOpen(open === i ? -1 : i)} aria-expanded={open === i}><span>{String(i + 1).padStart(2, "0")} /</span><strong>{question}</strong><ChevronDown size={15} /></button><AnimatePresence initial={false}>{open === i && <motion.div className="faq-answer" initial={{ height: 0, opacity: 1 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}><p>{answer}</p></motion.div>}</AnimatePresence></div>)}</div></div></section>;
}

function Closing({ onLaunchStudio }: { onLaunchStudio: () => void }) {
  return <section className="closing sheet-section"><div className="sheet-wrap"><div className="closing-box"><SectionLabel number="10">FINAL NOTICE / OPERATOR ACTION</SectionLabel><h2>STOP LOSING JOBS<br /><em>TO EMPTY RINGS.</em></h2><p>Put Bellmaker on your front desk — try the full studio, or set it up on your own machine this week.</p><div><Button onClick={onLaunchStudio} solid>OPEN THE STUDIO <ArrowRight size={13} /></Button><Button href="#console">REPLAY THE DEMO</Button></div></div></div></section>;
}

function Footer({ onLaunchStudio }: { onLaunchStudio: () => void }) {
  return <footer className="site-footer"><div className="sheet-wrap"><div className="footer-top"><div><a className="wordmark" href="#top">BELLMAKER</a><p>Autonomous inbound dispatch for local service businesses. Answers on ring one, books the job, keeps your data at home.</p></div><div><span>INDEX</span><a href="#how">HOW IT WORKS</a><a href="#console">LIVE CALL</a><a href="#guardrails">GUARDRAILS</a><a href="#faq">FAQ</a></div><div><span>STUDIO</span><button onClick={onLaunchStudio}>OPEN THE STUDIO</button><a href="#privacy">PRIVACY MODEL</a><a href="#speed">RESPONSE TIME</a></div><div><span>UNDER THE HOOD</span><p>Runs on open models — llama.cpp, faster-whisper, and Piper — on hardware you own.</p><small><Lock size={12} /> LOCAL INFERENCE · NO CLOUD IN THE PATH</small></div></div><div className="footer-bottom"><span>BELLMAKER — SPECIMEN PAGE · 2026-09-19</span><span>INK #151412 / PAPER #FBFAF8</span></div></div></footer>;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLaunchStudio }) => {
  const [theme, setTheme] = useState<Theme>("paper");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 20); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  useEffect(() => { document.title = "Bellmaker — Local-private voice agents"; }, []);
  const shell = useMemo(() => "bellmaker-shell theme-" + theme + (scrolled ? " is-scrolled" : ""), [theme, scrolled]);
  return <div className={shell}><Header onLaunchStudio={onLaunchStudio} theme={theme} setTheme={setTheme} /><main><Hero onLaunchStudio={onLaunchStudio} /><LiveConsole /><div className="sheet-band-wrap"><div className="sheet-wrap"><RuleHeading number="02A / RECORDING" title="A REAL CALL, START TO FINISH" note="85 SEC SAMPLE" /><CallPlayer /></div></div><HowItWorks /><Speed /><Guardrails /><Privacy /><Ledger /><Calculator onLaunchStudio={onLaunchStudio} /><Faq /><Closing onLaunchStudio={onLaunchStudio} /></main><Footer onLaunchStudio={onLaunchStudio} /></div>;
};
