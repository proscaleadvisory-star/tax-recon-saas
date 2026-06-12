"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useMotionTemplate, useMotionValue, useScroll, useTransform, type Variants } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  ChevronRight,
  CircleDollarSign,
  DatabaseZap,
  FileSpreadsheet,
  Gauge,
  LineChart,
  Scale,
  ShieldCheck,
  Sparkles,
  TimerReset,
  Zap,
} from "lucide-react";

type ToolKey = "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa";

interface LandingSectionProps {
  onSelectTool: (tool: ToolKey) => void;
}

const spring = {
  type: "spring",
  stiffness: 180,
  damping: 24,
  mass: 0.8,
} as const;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.085,
      delayChildren: 0.1,
    },
  },
};

const wordVariants: Variants = {
  hidden: { opacity: 0, y: 42, filter: "blur(14px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: spring,
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96, filter: "blur(10px)" },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
    transition: spring,
  },
};

const launchProof = [
  { label: "Audit Packs", value: "Export-ready", icon: BadgeCheck },
  { label: "Data Mode", value: "Local-first", icon: DatabaseZap },
  { label: "Client Onboarding", value: "3-step intake", icon: TimerReset },
];

const modules = [
  {
    key: "taxrecon" as const,
    title: "Ecommerce Reconciliation",
    kicker: "Settlement command layer",
    copy: "Match marketplace payouts, bank settlements, SKU leakage, GST variance, and dispute packs in one cockpit.",
    icon: ShieldCheck,
    accent: "emerald",
    signal: "96.8%",
  },
  {
    key: "gstrecon" as const,
    title: "GST Recon Engine",
    kicker: "Input-credit integrity",
    copy: "Cross-check purchase books with GSTR-2B, tune fuzzy keys, and export exception evidence.",
    icon: Zap,
    accent: "indigo",
    signal: "2B",
  },
  {
    key: "profitability" as const,
    title: "Profit Cockpit",
    kicker: "Margin pressure radar",
    copy: "Track SKU economics, returns, COGS drift, runway, and weighted revenue leakage.",
    icon: CircleDollarSign,
    accent: "cyan",
    signal: "+18%",
  },
  {
    key: "itrecon" as const,
    title: "Direct Tax Recon",
    kicker: "AIS / 26AS evidence desk",
    copy: "Reconcile tax credits across AIS, TIS, Form 16, bank receipts, and remediation tasks.",
    icon: Scale,
    accent: "violet",
    signal: "AIS",
  },
  {
    key: "fpa" as const,
    title: "Virtual CFO OS",
    kicker: "Local-first FP&A studio",
    copy: "Run budget grids, ARIMA forecasts, reports, ledger audits, and CFO chat locally.",
    icon: Bot,
    accent: "silver",
    signal: "CFO",
  },
];

const accentMap = {
  emerald: "from-emerald-300/30 via-teal-300/8 to-transparent text-emerald-100 border-emerald-300/24",
  indigo: "from-indigo-300/30 via-blue-300/8 to-transparent text-indigo-100 border-indigo-300/24",
  cyan: "from-cyan-300/30 via-sky-300/8 to-transparent text-cyan-100 border-cyan-300/24",
  violet: "from-violet-300/30 via-fuchsia-300/8 to-transparent text-violet-100 border-violet-300/24",
  silver: "from-slate-100/24 via-slate-400/8 to-transparent text-slate-100 border-slate-200/20",
};

const metrics = [
  { label: "Matched Payouts", value: "128.4K", icon: ShieldCheck, color: "text-emerald-200" },
  { label: "Tax Exposure", value: "Rs 42.8L", icon: Gauge, color: "text-amber-200" },
  { label: "Audit Packets", value: "317", icon: FileSpreadsheet, color: "text-cyan-100" },
];

const streamRows = [
  ["GST-2B", "Vendor credit matched", "99.2%"],
  ["AIS", "TDS delta isolated", "High"],
  ["Payout", "Marketplace variance closed", "Rs 8.4L"],
  ["FP&A", "Runway forecast refreshed", "Live"],
];

function useGsapReveal(scopeRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    let cleanup = () => {};

    const run = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      const ctx = gsap.context(() => {
        gsap.fromTo(
          ".gsap-float",
          { y: 42, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.05,
            ease: "power3.out",
            stagger: 0.09,
            scrollTrigger: {
              trigger: scopeRef.current,
              start: "top 72%",
              once: true,
            },
          }
        );

        gsap.to(".gsap-orbit", {
          rotate: 18,
          yPercent: -7,
          ease: "none",
          scrollTrigger: {
            trigger: scopeRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.8,
          },
        });
      }, scopeRef);

      cleanup = () => ctx.revert();
    };

    run();
    return () => cleanup();
  }, [scopeRef]);
}

function SplitWords({ text }: { text: string }) {
  return (
    <>
      {text.split(" ").map((word, index) => (
        <motion.span key={`${word}-${index}`} variants={wordVariants} className="mr-[0.22em] inline-block">
          {word}
        </motion.span>
      ))}
    </>
  );
}

export function HeroSection({ onSelectTool }: LandingSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -90]);
  const orbitY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const glow = useMotionTemplate`radial-gradient(560px circle at ${mouseX}% ${mouseY}%, rgba(103,232,249,0.18), rgba(139,92,246,0.08) 34%, transparent 66%)`;

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(((event.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((event.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative grid min-h-[calc(100vh-92px)] items-center gap-12 overflow-hidden py-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(560px,1.05fr)]"
    >
      <motion.div style={{ background: glow }} className="pointer-events-none absolute inset-0 opacity-90" />
      <motion.div style={{ y: orbitY }} className="gsap-orbit pointer-events-none absolute right-[4vw] top-[4vh] hidden h-[34rem] w-[34rem] rounded-full border border-cyan-200/12 lg:block">
        <div className="absolute inset-10 rounded-full border border-dashed border-white/12" />
        <div className="absolute inset-24 rounded-full border border-violet-200/16" />
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-100 shadow-[0_0_46px_rgba(103,232,249,0.65)]" />
      </motion.div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ y: heroY }}
        className="relative z-10 max-w-5xl"
      >
        <motion.div variants={cardVariants} className="mb-8 inline-flex items-center gap-3 rounded-full border border-cyan-200/20 bg-cyan-200/[0.055] px-4 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
          <Sparkles size={15} className="text-cyan-100" />
          <span className="font-mono text-[11px] font-black uppercase tracking-[0.28em] text-cyan-100">
            AI-powered finance suite v3.0
          </span>
        </motion.div>

        <motion.h1 className="font-display text-[clamp(3.35rem,7.4vw,9rem)] font-black uppercase leading-[0.78] tracking-[-0.035em] text-slate-100">
          <SplitWords text="Client" />
          <span className="block bg-[linear-gradient(115deg,#f8fafc_0%,#94a3b8_18%,#67e8f9_45%,#c4b5fd_70%,#f8fafc_100%)] bg-clip-text text-transparent">
            <SplitWords text="War Room" />
          </span>
        </motion.h1>

        <motion.p variants={cardVariants} className="mt-8 max-w-2xl text-balance text-lg leading-8 text-slate-300/78">
          A cinematic command suite for finance and tax teams: reconcile payouts, GST credits, AIS/26AS evidence, SKU margins, forecasts, and audit packs from one launch-ready client console.
        </motion.p>

        <motion.div variants={cardVariants} className="mt-10 flex flex-wrap items-center gap-4">
          <motion.button
            whileHover={{ y: -3, scale: 1.025 }}
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => onSelectTool("taxrecon")}
            className="group metal-button h-14 rounded-full px-6 text-sm font-black uppercase tracking-[0.18em] text-slate-50"
          >
            Enter Suite
            <ArrowRight size={17} className="transition duration-300 group-hover:translate-x-1" />
          </motion.button>
          <motion.div whileHover={{ scale: 1.02 }} transition={spring} className="flex items-center gap-3 rounded-full border border-white/10 bg-black/25 px-4 py-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
            Production deployment live
          </motion.div>
        </motion.div>

        <motion.div variants={containerVariants} className="mt-9 grid gap-3 sm:grid-cols-3">
          {launchProof.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.label}
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.025 }}
                transition={spring}
                className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
              >
                <Icon className="mb-4 h-5 w-5 text-cyan-100" />
                <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-100">{item.value}</p>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="relative z-10 grid gap-5 sm:grid-cols-2">
        {modules.map((mod, index) => {
          const Icon = mod.icon;
          const accent = accentMap[mod.accent as keyof typeof accentMap];
          return (
            <motion.button
              key={mod.key}
              variants={cardVariants}
              whileHover={{ y: -8, rotateX: 2, rotateY: index % 2 === 0 ? -2 : 2, scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              transition={spring}
              onClick={() => onSelectTool(mod.key)}
              className={`cinematic-card group relative min-h-[272px] overflow-hidden rounded-[1.65rem] border bg-[#080a0f]/82 p-6 text-left shadow-[0_22px_90px_rgba(0,0,0,0.42)] backdrop-blur-xl ${accent} ${
                index === 0 ? "sm:row-span-2 sm:min-h-[566px]" : ""
              }`}
            >
              <div className={`absolute -right-16 -top-16 h-44 w-44 rounded-full bg-gradient-to-br blur-[2px] transition duration-700 group-hover:scale-125 ${accent}`} />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              <div className="relative flex h-full flex-col">
                <div className="mb-7 flex items-start justify-between gap-5">
                  <span className="flex h-13 w-13 items-center justify-center rounded-2xl border border-current bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.13)]">
                    <Icon size={22} />
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.035] px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">
                    {mod.signal}
                  </span>
                </div>

                <p className="mb-3 font-mono text-[11px] font-black uppercase tracking-[0.24em] opacity-90">{mod.kicker}</p>
                <h2 className="font-display text-2xl font-black uppercase leading-[0.95] tracking-[-0.03em] text-slate-100 sm:text-3xl">
                  {mod.title}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-slate-400">{mod.copy}</p>

                <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-5">
                  <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Launch module</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.045] text-slate-100 transition duration-300 group-hover:translate-x-1 group-hover:border-white/35">
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </section>
  );
}

export function InteractiveDashboardSection({ onSelectTool }: LandingSectionProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [activeMetric, setActiveMetric] = useState(0);
  useGsapReveal(sectionRef);

  return (
    <section ref={sectionRef} className="relative grid gap-8 py-14 lg:grid-cols-[0.84fr_1.16fr] lg:py-20">
      <div className="gsap-float max-w-2xl">
        <p className="font-mono text-[11px] font-black uppercase tracking-[0.3em] text-cyan-100">Interactive command preview</p>
        <h2 className="mt-5 font-display text-[clamp(2.4rem,5vw,5.4rem)] font-black uppercase leading-[0.86] tracking-[-0.035em] text-white">
          Live finance signals, not static screenshots.
        </h2>
        <p className="mt-6 text-base leading-8 text-slate-400">
          The preview behaves like a real control room: animated KPIs, live exception streams, matching progress, and module switching are all designed to feel responsive and premium.
        </p>

        <div className="mt-8 grid gap-3">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            const active = activeMetric === index;
            return (
              <motion.button
                key={metric.label}
                onClick={() => setActiveMetric(index)}
                whileHover={{ x: 6, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={spring}
                className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-colors ${
                  active ? "border-cyan-200/35 bg-cyan-200/[0.07]" : "border-white/10 bg-white/[0.025] hover:border-white/18"
                }`}
              >
                <span className="flex items-center gap-4">
                  <span className={`flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-black/24 ${metric.color}`}>
                    <Icon size={19} />
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-slate-100">{metric.label}</span>
                    <span className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Click to focus dashboard</span>
                  </span>
                </span>
                <span className="font-display text-2xl font-black text-white">{metric.value}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <motion.div
        className="gsap-float relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#060810]/90 p-4 shadow-[0_28px_120px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-2xl"
        whileHover={{ y: -6, scale: 1.005 }}
        transition={spring}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(103,232,249,0.18),transparent_32%),radial-gradient(circle_at_92%_72%,rgba(167,139,250,0.14),transparent_38%)]" />
        <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/45 to-transparent" />

        <div className="relative rounded-[1.55rem] border border-white/10 bg-black/30 p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">ProScale live console</p>
              <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-[-0.03em] text-white">Recon intelligence mesh</h3>
            </div>
            <motion.button
              onClick={() => onSelectTool("gstrecon")}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              className="metal-button h-11 rounded-full px-4 text-xs font-black uppercase tracking-[0.16em]"
            >
              Open GST
              <ArrowRight size={14} />
            </motion.button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;
              const active = activeMetric === index;
              return (
                <motion.div
                  key={metric.label}
                  animate={{ y: active ? -5 : 0, borderColor: active ? "rgba(103,232,249,0.36)" : "rgba(255,255,255,0.1)" }}
                  transition={spring}
                  className="rounded-2xl border bg-white/[0.035] p-4"
                >
                  <Icon className={`mb-5 h-5 w-5 ${metric.color}`} />
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{metric.label}</p>
                  <p className="mt-2 font-display text-3xl font-black text-white">{metric.value}</p>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-white/10 bg-black/24 p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Exception clearance curve</span>
                <LineChart className="h-5 w-5 text-cyan-100" />
              </div>
              <div className="flex h-48 items-end gap-2">
                {[38, 52, 47, 68, 61, 78, 72, 88, 82, 94, 91, 98].map((height, index) => (
                  <motion.div
                    key={index}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${height}%` }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: index * 0.035 }}
                    className="flex-1 rounded-t-full bg-gradient-to-t from-cyan-400/22 via-cyan-200/62 to-white shadow-[0_0_24px_rgba(103,232,249,0.18)]"
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/24 p-5">
              <div className="mb-5 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200">Live data stream</span>
                <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.8)]" />
              </div>
              <div className="space-y-3">
                {streamRows.map((row, index) => (
                  <motion.div
                    key={row.join("-")}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ ...spring, delay: 0.15 + index * 0.07 }}
                    className="rounded-xl border border-white/8 bg-white/[0.035] p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100">{row[0]}</span>
                      <span className="text-xs font-bold text-white">{row[2]}</span>
                    </div>
                    <p className="text-xs leading-5 text-slate-400">{row[1]}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
