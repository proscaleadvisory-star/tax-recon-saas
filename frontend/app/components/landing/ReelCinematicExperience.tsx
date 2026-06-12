"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  ReceiptText,
  Scale,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

type ToolKey = "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa";

interface ReelCinematicExperienceProps {
  onSelectTool: (tool: ToolKey) => void;
}

const spring = {
  type: "spring",
  stiffness: 155,
  damping: 24,
  mass: 0.85,
} as const;

const modules = [
  {
    tool: "taxrecon" as const,
    label: "Payout Recon",
    title: "Marketplace payouts",
    value: "128K",
    icon: ReceiptText,
    accent: "from-cyan-300 to-indigo-300",
  },
  {
    tool: "gstrecon" as const,
    label: "GST Engine",
    title: "ITC matching",
    value: "96.8%",
    icon: Zap,
    accent: "from-violet-300 to-indigo-300",
  },
  {
    tool: "itrecon" as const,
    label: "Direct Tax",
    title: "AIS evidence",
    value: "317",
    icon: FileCheck2,
    accent: "from-fuchsia-300 to-violet-300",
  },
  {
    tool: "profitability" as const,
    label: "Margin Radar",
    title: "SKU leakage",
    value: "+18%",
    icon: CircleDollarSign,
    accent: "from-emerald-200 to-cyan-300",
  },
  {
    tool: "fpa" as const,
    label: "CFO OS",
    title: "Forecast room",
    value: "5",
    icon: Bot,
    accent: "from-amber-100 to-violet-200",
  },
];

const trusted = ["PolyAudit", "SegmentIQ", "Sisyphus", "Luminous", "Alt+Shift", "FinOps"];

const bars = [36, 48, 42, 72, 58, 88, 64, 78, 54, 92, 68, 82];
const linePoints = "0,128 45,118 92,138 138,82 184,96 230,54 276,80 322,40 368,62 414,30 460,48";

export default function ReelCinematicExperience({ onSelectTool }: ReelCinematicExperienceProps) {
  return (
    <section className="relative overflow-hidden bg-[#030306] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="satin-ribbon satin-ribbon-a" />
        <div className="satin-ribbon satin-ribbon-b" />
        <div className="satin-ribbon satin-ribbon-c" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.18),transparent_30%),linear-gradient(180deg,rgba(3,3,6,0.12),#030306_82%)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.16)_1px,transparent_1px)] [background-size:72px_72px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1180px] px-5 pb-24 pt-16 sm:px-8 lg:px-10">
        <Hero onSelectTool={onSelectTool} />
        <DashboardMockup onSelectTool={onSelectTool} />
        <LogoStrip />
        <FeatureSection onSelectTool={onSelectTool} />
      </div>

      <style jsx>{`
        .satin-ribbon {
          position: absolute;
          width: 78rem;
          height: 14rem;
          border-radius: 999px;
          filter: blur(10px);
          opacity: 0.62;
          transform-origin: center;
          background:
            linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent),
            radial-gradient(ellipse at 36% 50%, rgba(168,85,247,0.52), transparent 34%),
            linear-gradient(90deg, rgba(12,12,20,0.1), rgba(255,255,255,0.18), rgba(30,20,56,0.2), rgba(255,255,255,0.08));
          box-shadow: inset 0 0 52px rgba(255,255,255,0.08), 0 0 80px rgba(124,58,237,0.2);
        }
        .satin-ribbon-a {
          left: -28rem;
          top: 1rem;
          transform: rotate(-27deg);
        }
        .satin-ribbon-b {
          right: -36rem;
          top: 9rem;
          transform: rotate(-31deg);
        }
        .satin-ribbon-c {
          left: 16rem;
          top: -8rem;
          width: 52rem;
          opacity: 0.34;
          transform: rotate(22deg);
        }
      `}</style>
    </section>
  );
}

function Hero({ onSelectTool }: ReelCinematicExperienceProps) {
  return (
    <div className="mx-auto max-w-4xl pt-10 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.045] px-4 py-2 text-xs font-bold text-slate-300 backdrop-blur-xl"
      >
        <Sparkles className="h-4 w-4 text-violet-200" />
        AI-powered finance operations platform
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 26, filter: "blur(12px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ ...spring, delay: 0.08 }}
        className="font-display text-[clamp(2.8rem,6vw,5.6rem)] font-black leading-[0.95] tracking-[-0.045em]"
      >
        Transform Finance Workflows With Cinematic AI Reconciliation
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.16 }}
        className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base"
      >
        ProScale unifies payout reconciliation, GST credit matching, direct-tax evidence, profitability signals, and CFO planning into one polished client-ready suite.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: 0.24 }}
        className="mt-8 flex flex-wrap items-center justify-center gap-3"
      >
        <button
          onClick={() => onSelectTool("taxrecon")}
          className="rounded-full bg-white px-6 py-3 text-sm font-black text-black shadow-[0_18px_60px_rgba(255,255,255,0.12)] transition-transform hover:-translate-y-1"
        >
          Get Started
        </button>
        <button
          onClick={() => onSelectTool("gstrecon")}
          className="rounded-full border border-white/14 bg-white/[0.035] px-6 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:border-violet-200/45 hover:bg-white/[0.07]"
        >
          Learn More
        </button>
      </motion.div>
    </div>
  );
}

function DashboardMockup({ onSelectTool }: ReelCinematicExperienceProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 44, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ ...spring, delay: 0.34 }}
      className="mx-auto mt-16 max-w-[940px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-[#0b0d14]/92 p-3 shadow-[0_42px_140px_rgba(0,0,0,0.72),0_0_80px_rgba(124,58,237,0.12)] backdrop-blur-2xl"
    >
      <div className="rounded-[1.25rem] border border-white/8 bg-[#11131b]">
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-violet-300" />
            <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">ProScale console</span>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-black/24 px-3 py-1.5 text-[10px] text-slate-500 sm:flex">
            System live
          </div>
        </div>

        <div className="grid min-h-[480px] grid-cols-1 md:grid-cols-[180px_1fr]">
          <aside className="border-b border-white/8 bg-black/18 p-4 md:border-b-0 md:border-r">
            <div className="mb-6 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 p-4">
              <ShieldCheck className="mb-8 h-5 w-5" />
              <p className="text-xs font-bold">Finance OS</p>
              <p className="mt-1 text-[10px] text-white/70">Launch-ready cockpit</p>
            </div>
            <div className="space-y-2">
              {modules.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => onSelectTool(item.tool)}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {modules.slice(0, 4).map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{item.title}</p>
                  <p className={`mt-3 bg-gradient-to-r ${item.accent} bg-clip-text font-display text-2xl font-black text-transparent`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_1.05fr]">
              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-xs font-black text-white">Active variance trend</p>
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                </div>
                <div className="flex h-40 items-end gap-2">
                  {bars.map((height, index) => (
                    <motion.div
                      key={index}
                      initial={{ height: 8 }}
                      animate={{ height: `${height}%` }}
                      transition={{ ...spring, delay: 0.45 + index * 0.035 }}
                      className="flex-1 rounded-t-full bg-gradient-to-t from-violet-500/20 via-violet-300/70 to-white"
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.035] p-4">
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-xs font-black text-white">Reconciliation curve</p>
                  <Scale className="h-4 w-4 text-violet-200" />
                </div>
                <svg viewBox="0 0 460 170" className="h-40 w-full overflow-visible">
                  <defs>
                    <linearGradient id="curveFill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.48" />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={`M ${linePoints} L 460,170 L 0,170 Z`} fill="url(#curveFill)" />
                  <polyline points={linePoints} fill="none" stroke="#c4b5fd" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points="0,142 45,132 92,125 138,136 184,118 230,126 276,92 322,112 368,86 414,98 460,74" fill="none" stroke="#67e8f9" strokeWidth="2" strokeOpacity="0.72" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {["Audit pack ready", "GST delta resolved", "Forecast refreshed"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                  <p className="text-xs font-bold text-slate-300">{item}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-600">Completed just now</p>
                </div>
              ))}
            </div>
          </main>
        </div>
      </div>
    </motion.div>
  );
}

function LogoStrip() {
  return (
    <div className="mx-auto mt-20 max-w-5xl text-center">
      <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Powering finance teams</p>
      <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-5">
        {trusted.map((item) => (
          <div key={item} className="flex items-center gap-2 text-sm font-black text-slate-400">
            <span className="h-3 w-3 rounded-full border border-violet-300/70" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureSection({ onSelectTool }: ReelCinematicExperienceProps) {
  return (
    <div className="mx-auto mt-24 max-w-5xl">
      <div className="mb-10 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-violet-200">Workflow clarity</p>
        <h2 className="mt-4 font-display text-[clamp(2rem,4vw,3.8rem)] font-black leading-tight tracking-[-0.035em]">
          Streamline your workflow with our AI platform
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Automated matching", "Reconcile payout, GST, AIS and ledger events using tolerance-aware matching.", "taxrecon" as const],
          ["Evidence exports", "Turn every mismatch into a client-ready audit trail and remediation pack.", "itrecon" as const],
          ["CFO cockpit", "Forecast runway, budgets, reports and anomalies from one local-first workspace.", "fpa" as const],
        ].map(([title, copy, tool]) => (
          <button
            key={title}
            onClick={() => onSelectTool(tool as ToolKey)}
            className="group rounded-2xl border border-white/10 bg-white/[0.035] p-5 text-left backdrop-blur-xl transition hover:-translate-y-1 hover:border-violet-200/35 hover:bg-white/[0.06]"
          >
            <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/12 text-violet-200">
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
            <h3 className="text-lg font-black text-white">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
