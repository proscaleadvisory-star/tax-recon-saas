"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Lenis from "lenis";
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CircleDollarSign,
  FileCheck2,
  LineChart,
  Orbit,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Zap,
  type LucideIcon,
} from "lucide-react";

type ToolKey = "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa";

interface LandingProps {
  onSelectTool: (tool: ToolKey) => void;
}

interface ModuleData {
  key: ToolKey;
  name: string;
  shortName: string;
  copy: string;
  metric: string;
  metricLabel: string;
  icon: LucideIcon;
  accent: string;
  glow: string;
}

const modules: ModuleData[] = [
  {
    key: "taxrecon",
    name: "Ecommerce Reconciliation",
    shortName: "Commerce",
    copy: "Match marketplace payouts, bank settlements, SKU leakage, GST variance and dispute packs in one cockpit.",
    metric: "128K",
    metricLabel: "rows reconciled",
    icon: ReceiptText,
    accent: "#67e8f9",
    glow: "rgba(103,232,249,0.22)",
  },
  {
    key: "gstrecon",
    name: "GST Recon Engine",
    shortName: "GST",
    copy: "Cross-check purchase books with GSTR-2B, tune fuzzy keys, and export exception evidence.",
    metric: "96.8%",
    metricLabel: "match confidence",
    icon: Zap,
    accent: "#a5b4fc",
    glow: "rgba(165,180,252,0.22)",
  },
  {
    key: "profitability",
    name: "Profit Cockpit",
    shortName: "Profit",
    copy: "Track SKU economics, returns, COGS drift, runaway ads and weighted revenue leakage.",
    metric: "+18%",
    metricLabel: "margin visibility",
    icon: CircleDollarSign,
    accent: "#6ee7b7",
    glow: "rgba(110,231,183,0.20)",
  },
  {
    key: "itrecon",
    name: "Direct Tax Recon",
    shortName: "Tax",
    copy: "Reconcile AIS, TIS, Form 16, bank receipts and remediation tasks from a single evidence desk.",
    metric: "317",
    metricLabel: "audit artifacts",
    icon: FileCheck2,
    accent: "#c4b5fd",
    glow: "rgba(196,181,253,0.22)",
  },
  {
    key: "fpa",
    name: "Virtual CFO OS",
    shortName: "CFO",
    copy: "Run budget grids, forecasts, variance reports, ledger audits and CFO chat locally.",
    metric: "5",
    metricLabel: "launch modules",
    icon: Bot,
    accent: "#fde68a",
    glow: "rgba(253,230,138,0.16)",
  },
];

const outcomes = [
  ["74%", "faster reconciliations"],
  ["42%", "lower leakage"],
  ["3.8x", "cleaner audit packs"],
  ["91%", "compliance control"],
];

const spring = {
  type: "spring",
  stiffness: 150,
  damping: 24,
  mass: 0.9,
} as const;

export default function ReelCinematicExperience({ onSelectTool }: LandingProps) {
  return (
    <SmoothScrollProvider>
      <main className="relative isolate overflow-hidden bg-[#020306] text-white">
        <MouseGlow />
        <NoiseAndGrid />
        <CinematicHero onSelectTool={onSelectTool} />
        <ScrollStory onSelectTool={onSelectTool} />
        <ModuleOrbit onSelectTool={onSelectTool} />
        <OutcomeSection />
        <FinalCTA onSelectTool={onSelectTool} />
      </main>
    </SmoothScrollProvider>
  );
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({
      duration: 1.08,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);
    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduceMotion]);

  return <>{children}</>;
}

export function MouseGlow() {
  const x = useMotionValue(50);
  const y = useMotionValue(12);
  const background = useMotionTemplate`radial-gradient(720px circle at ${x}% ${y}%, rgba(103,232,249,0.14), rgba(124,58,237,0.08) 36%, transparent 68%)`;

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      x.set((event.clientX / window.innerWidth) * 100);
      y.set((event.clientY / window.innerHeight) * 100);
    };

    window.addEventListener("pointermove", handleMove);
    return () => window.removeEventListener("pointermove", handleMove);
  }, [x, y]);

  return <motion.div style={{ background }} className="pointer-events-none fixed inset-0 z-0" />;
}

function NoiseAndGrid() {
  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.09),transparent_28%),linear-gradient(180deg,rgba(2,3,6,0.1),rgba(2,3,6,0.96))]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.075] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:88px_88px]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.045] [background-image:repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.7)_3px,transparent_4px)]" />
    </>
  );
}

export function CinematicHero({ onSelectTool }: LandingProps) {
  return (
    <section className="relative z-10 flex min-h-screen items-center px-5 py-28 sm:px-8 lg:px-14">
      <FloatingFragments />
      <div className="mx-auto grid w-full max-w-[1560px] items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
        <motion.div
          initial={{ opacity: 0, y: 32, filter: "blur(16px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={spring}
          className="max-w-5xl"
        >
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 backdrop-blur-xl">
            <Sparkles className="h-4 w-4 text-cyan-100" />
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100">
              AI-powered finance suite v3.0
            </span>
          </div>

          <h1 className="font-display text-[clamp(3.6rem,8vw,9.7rem)] font-black uppercase leading-[0.78] tracking-[-0.055em]">
            Finance command layer for modern operators.
          </h1>

          <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300/76 sm:text-lg">
            ProScale Advisory turns reconciliations, tax evidence, profitability signals and CFO planning into a cinematic operating system for finance teams.
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <MagneticButton onClick={() => onSelectTool("taxrecon")} label="Enter Suite" primary />
            <MagneticButton
              onClick={() => document.getElementById("module-story")?.scrollIntoView({ behavior: "smooth" })}
              label="View Modules"
            />
          </div>
        </motion.div>

        <CommandCore />
      </div>
    </section>
  );
}

function FloatingFragments() {
  const fragments = ["AIS", "GSTR-2B", "COGS", "26AS", "PAYOUT", "TDS", "SKU", "ARIMA"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {fragments.map((fragment, index) => (
        <motion.span
          key={fragment}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: [0.18, 0.58, 0.22], y: [0, -18, 0] }}
          transition={{ duration: 5 + index * 0.4, repeat: Infinity, delay: index * 0.18 }}
          className="absolute rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 backdrop-blur-md"
          style={{ left: `${8 + ((index * 13) % 82)}%`, top: `${18 + ((index * 19) % 64)}%` }}
        >
          {fragment}
        </motion.span>
      ))}
    </div>
  );
}

function CommandCore() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.86, rotate: -6 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      transition={{ ...spring, delay: 0.18 }}
      className="relative mx-auto aspect-square w-full max-w-[42rem]"
    >
      <div className="absolute inset-0 rounded-full border border-cyan-100/14 bg-cyan-300/[0.035] shadow-[0_0_140px_rgba(103,232,249,0.16)]" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
        className="absolute inset-10 rounded-full border border-dashed border-white/14"
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 42, repeat: Infinity, ease: "linear" }}
        className="absolute inset-24 rounded-full border border-violet-200/16"
      />
      <div className="absolute inset-36 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.25),rgba(103,232,249,0.16)_38%,transparent_70%)] shadow-[0_0_90px_rgba(103,232,249,0.28)]" />

      <div className="absolute left-1/2 top-1/2 w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-[2.2rem] border border-white/12 bg-[#060911]/78 p-5 shadow-[0_42px_140px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
        <div className="mb-5 flex items-center justify-between">
          <span className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">AI finance core</span>
          <Orbit className="h-5 w-5 text-white/45" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {["Capture", "Explain", "Deploy"].map((label, index) => (
            <div key={`${label}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
              <div className="mb-8 h-1 rounded-full bg-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${54 + index * 18}%` }}
                  transition={{ ...spring, delay: 0.4 + index * 0.08 }}
                  className="h-full rounded-full bg-cyan-100"
                />
              </div>
              <p className="text-xs font-black text-white">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function ScrollStory({ onSelectTool }: LandingProps) {
  const storyRef = useRef<HTMLDivElement | null>(null);
  const panelsRef = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    let cleanup = () => {};

    const run = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // GSAP pinned module-story animation starts here.
      const ctx = gsap.context(() => {
        const scenes = gsap.utils.toArray<HTMLElement>(".module-scene");
        gsap.set(scenes, { opacity: 0, scale: 0.9, y: 80, filter: "blur(18px)" });
        gsap.set(scenes[0], { opacity: 1, scale: 1, y: 0, filter: "blur(0px)" });

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: storyRef.current,
            start: "top top",
            end: `+=${modules.length * 720}`,
            pin: true,
            scrub: 1,
          },
        });

        scenes.forEach((scene, index) => {
          if (index === 0) return;
          timeline
            .to(scenes[index - 1], { opacity: 0, scale: 0.86, y: -90, filter: "blur(20px)", duration: 0.7 })
            .to(scene, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 0.85 }, "<0.16");
        });

        gsap.to(".story-connector", {
          strokeDashoffset: 0,
          scrollTrigger: {
            trigger: storyRef.current,
            start: "top center",
            end: "bottom center",
            scrub: 1,
          },
        });
      }, storyRef);

      cleanup = () => ctx.revert();
    };

    run();
    return () => cleanup();
  }, [reduceMotion]);

  return (
    <section id="module-story" ref={storyRef} className="relative z-10 min-h-screen overflow-hidden px-5 py-20 sm:px-8 lg:px-14">
      <div className="mx-auto grid min-h-[80vh] max-w-[1560px] items-center gap-10 lg:grid-cols-[0.72fr_1.28fr]">
        <div>
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100">Pinned scroll story</p>
          <h2 className="mt-5 font-display text-[clamp(2.6rem,5.8vw,6.4rem)] font-black uppercase leading-[0.82] tracking-[-0.045em]">
            Five systems. One command layer.
          </h2>
          <p className="mt-6 max-w-md text-sm leading-7 text-slate-400">
            Scroll through each operating module as data lines, metrics and panels move into focus.
          </p>
        </div>

        <div ref={panelsRef} className="relative min-h-[34rem] lg:min-h-[44rem]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-50" viewBox="0 0 900 620">
            <path
              className="story-connector"
              d="M90 520 C 240 140, 410 700, 810 120"
              fill="none"
              stroke="url(#storyGradient)"
              strokeWidth="2"
              strokeDasharray="1200"
              strokeDashoffset="1200"
            />
            <defs>
              <linearGradient id="storyGradient" x1="0" x2="1">
                <stop offset="0%" stopColor="#67e8f9" />
                <stop offset="55%" stopColor="#a5b4fc" />
                <stop offset="100%" stopColor="#6ee7b7" />
              </linearGradient>
            </defs>
          </svg>

          {modules.map((module, index) => (
            <ModuleScene key={module.key} module={module} index={index} onSelectTool={onSelectTool} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function ModuleScene({ module, index, onSelectTool }: { module: ModuleData; index: number; onSelectTool: (tool: ToolKey) => void }) {
  const Icon = module.icon;

  return (
    <div className="module-scene absolute inset-0 flex items-center justify-center">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-[2.2rem] border border-white/10 bg-[#070a12]/82 p-6 shadow-[0_38px_140px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.14)] backdrop-blur-2xl">
        <div className="absolute inset-0 opacity-80" style={{ background: `radial-gradient(circle at 82% 18%, ${module.glow}, transparent 42%)` }} />
        <div className="relative grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-8 flex items-center gap-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.045]">
                <Icon className="h-7 w-7" style={{ color: module.accent }} />
              </span>
              <div>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Scene 0{index + 1}</p>
                <p className="text-sm font-black uppercase text-white">{module.name}</p>
              </div>
            </div>
            <p className="text-xl leading-8 text-slate-200">{module.copy}</p>
            <button
              onClick={() => onSelectTool(module.key)}
              className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white transition hover:bg-white hover:text-black"
            >
              Open module
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-[1.6rem] border border-white/10 bg-black/24 p-5">
            <div className="mb-5 flex items-center justify-between">
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Live module telemetry</p>
              <p className="font-display text-4xl font-black" style={{ color: module.accent }}>{module.metric}</p>
            </div>
            <div className="flex h-56 items-end gap-2">
              {[28, 52, 40, 74, 58, 88, 64, 80, 48, 96, 72, 84].map((height, barIndex) => (
                <div
                  key={barIndex}
                  className="flex-1 rounded-t-full"
                  style={{
                    height: `${Math.max(14, height - index * 2 + (barIndex % 3) * 4)}%`,
                    background: `linear-gradient(to top, ${module.glow}, ${module.accent})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModuleOrbit({ onSelectTool }: LandingProps) {
  const [active, setActive] = useState(0);
  const activeModule = modules[active];
  const ActiveIcon = activeModule.icon;

  return (
    <section className="relative z-10 px-5 py-28 sm:px-8 lg:px-14">
      <div className="mx-auto grid max-w-[1500px] items-center gap-14 lg:grid-cols-[1fr_0.72fr]">
        <div className="relative mx-auto aspect-square w-full max-w-[44rem]">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-16 rounded-full border border-dashed border-white/10" />
          <div className="absolute inset-32 rounded-full bg-[radial-gradient(circle,rgba(103,232,249,0.14),transparent_72%)]" />

          <div className="absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[2rem] border border-white/12 bg-white/[0.05] shadow-[0_0_80px_rgba(103,232,249,0.18)] backdrop-blur-xl">
            <Orbit className="h-12 w-12 text-cyan-100" />
          </div>

          {modules.map((module, index) => {
            const angle = (index / modules.length) * Math.PI * 2 - Math.PI / 2;
            const x = Math.cos(angle) * 40;
            const y = Math.sin(angle) * 40;
            const Icon = module.icon;
            return (
              <motion.button
                key={module.key}
                onMouseEnter={() => setActive(index)}
                onClick={() => onSelectTool(module.key)}
                whileHover={{ scale: 1.08 }}
                transition={spring}
                className="absolute flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-3xl border border-white/10 bg-[#080b13]/86 text-center shadow-[0_18px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl"
                style={{ left: `${50 + x}%`, top: `${50 + y}%` }}
              >
                <Icon className="mb-2 h-5 w-5" style={{ color: module.accent }} />
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-300">{module.shortName}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="max-w-xl">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100">Interactive module orbit</p>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,5vw,5.8rem)] font-black uppercase leading-[0.84] tracking-[-0.045em]">
            Select the system in motion.
          </h2>
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
            <ActiveIcon className="mb-6 h-9 w-9" style={{ color: activeModule.accent }} />
            <h3 className="text-2xl font-black text-white">{activeModule.name}</h3>
            <p className="mt-4 leading-7 text-slate-400">{activeModule.copy}</p>
            <div className="mt-6 flex items-end justify-between border-t border-white/10 pt-5">
              <div>
                <p className="font-display text-4xl font-black" style={{ color: activeModule.accent }}>{activeModule.metric}</p>
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{activeModule.metricLabel}</p>
              </div>
              <button onClick={() => onSelectTool(activeModule.key)} className="rounded-full bg-white px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black">
                Launch
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function OutcomeSection() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1450px]">
        <div className="mb-12 max-w-3xl">
          <p className="font-mono text-[10px] font-black uppercase tracking-[0.32em] text-cyan-100">Proof of control</p>
          <h2 className="mt-5 font-display text-[clamp(2.6rem,5vw,5.8rem)] font-black uppercase leading-[0.84] tracking-[-0.045em]">
            Outcomes that move through the business.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {outcomes.map(([value, label], index) => (
            <motion.div
              key={`${label}-${index}`}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-120px" }}
              transition={{ ...spring, delay: index * 0.06 }}
              className="relative overflow-hidden rounded-[1.6rem] border border-white/10 bg-white/[0.035] p-6 backdrop-blur-xl"
            >
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/60 to-transparent" />
              <p className="font-display text-5xl font-black text-white">{value}</p>
              <p className="mt-4 text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCTA({ onSelectTool }: LandingProps) {
  return (
    <section className="relative z-10 px-5 pb-28 pt-20 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1180px] overflow-hidden rounded-[2.4rem] border border-white/10 bg-[radial-gradient(circle_at_50%_0%,rgba(103,232,249,0.18),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0.025))] p-8 text-center shadow-[0_40px_150px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:p-14">
        <Target className="mx-auto mb-7 h-10 w-10 text-cyan-100" />
        <h2 className="font-display text-[clamp(2.4rem,5.8vw,6.4rem)] font-black uppercase leading-[0.84] tracking-[-0.045em]">
          Deploy your finance command layer.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <MagneticButton onClick={() => onSelectTool("taxrecon")} label="Launch Demo" primary />
          <MagneticButton onClick={() => onSelectTool("fpa")} label="Talk to Us" />
        </div>
      </div>
    </section>
  );
}

function MagneticButton({ label, onClick, primary = false }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <motion.button
      whileHover={{ scale: 1.035, y: -3 }}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      onClick={onClick}
      className={`inline-flex h-14 items-center gap-3 rounded-full px-6 text-sm font-black uppercase tracking-[0.18em] ${
        primary
          ? "bg-white text-black shadow-[0_20px_80px_rgba(255,255,255,0.16)]"
          : "border border-white/12 bg-white/[0.04] text-white backdrop-blur-xl hover:bg-white/[0.08]"
      }`}
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </motion.button>
  );
}
