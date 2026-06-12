"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowRight,
  Bot,
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
  stiffness: 150,
  damping: 24,
  mass: 0.9,
} as const;

const scenes = [
  {
    id: "01",
    tool: "taxrecon" as const,
    label: "Payouts",
    title: "Reconcile commerce without the chaos.",
    subtitle: "Marketplace settlements, bank receipts, SKU leakage, and dispute evidence flow into one calm control surface.",
    metric: "128K",
    caption: "rows processed",
    icon: ReceiptText,
    accent: "#67e8f9",
    wash: "rgba(103,232,249,0.18)",
  },
  {
    id: "02",
    tool: "gstrecon" as const,
    label: "GST",
    title: "Turn credits into audit-ready confidence.",
    subtitle: "GSTR-2B, purchase books, tolerance rules, vendor trails, and exports become a guided reconciliation film.",
    metric: "96.8%",
    caption: "match confidence",
    icon: Zap,
    accent: "#a5b4fc",
    wash: "rgba(165,180,252,0.18)",
  },
  {
    id: "03",
    tool: "itrecon" as const,
    label: "Tax",
    title: "Make AIS and 26AS explain themselves.",
    subtitle: "Direct-tax deltas become clean tasks, client notes, prefill handoff, and downloadable evidence packs.",
    metric: "317",
    caption: "evidence packs",
    icon: FileCheck2,
    accent: "#c4b5fd",
    wash: "rgba(196,181,253,0.18)",
  },
  {
    id: "04",
    tool: "profitability" as const,
    label: "Margin",
    title: "Reveal profit leaks before they spread.",
    subtitle: "COGS drift, returns, channel variance, and SKU pressure appear as clear operational signals.",
    metric: "+18%",
    caption: "margin signal",
    icon: CircleDollarSign,
    accent: "#6ee7b7",
    wash: "rgba(110,231,183,0.16)",
  },
  {
    id: "05",
    tool: "fpa" as const,
    label: "CFO",
    title: "Hand clients a living finance room.",
    subtitle: "Forecasts, budget grids, reports, ledger audits, and CFO chat sit inside one local-first experience.",
    metric: "5",
    caption: "launch modules",
    icon: Bot,
    accent: "#fde68a",
    wash: "rgba(253,230,138,0.15)",
  },
];

export default function ReelCinematicExperience({ onSelectTool }: ReelCinematicExperienceProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(0);
  const pointerX = useMotionValue(50);
  const pointerY = useMotionValue(50);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const activeScene = scenes[active];
  const ActiveIcon = activeScene.icon;

  const progress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const stageY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const stageRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-5, 0, 5]);
  const coreScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.86, 1.08, 0.92]);
  const glow = useMotionTemplate`radial-gradient(760px circle at ${pointerX}% ${pointerY}%, ${activeScene.wash}, transparent 62%)`;

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActive(Math.min(scenes.length - 1, Math.max(0, Math.floor(value * scenes.length))));
  });

  const bars = useMemo(() => [28, 52, 36, 74, 46, 88, 60, 96, 68, 84, 56, 78], []);

  const handlePointerMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - rect.left) / rect.width) * 100);
    pointerY.set(((event.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handlePointerMove}
      className="relative min-h-[560vh] overflow-clip bg-[#020306] text-white"
    >
      <motion.div style={{ background: glow }} className="pointer-events-none fixed inset-0 z-0" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(2,3,6,0.1),rgba(2,3,6,0.94))]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:96px_96px]" />

      <div className="sticky top-0 z-10 min-h-screen overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-20 h-28 bg-gradient-to-b from-[#020306] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-20 h-32 bg-gradient-to-t from-[#020306] to-transparent" />

        <div className="relative z-30 mx-auto grid min-h-screen w-full max-w-[1680px] grid-rows-[1fr_auto] px-5 pb-6 pt-24 sm:px-9 lg:px-14">
          <div className="grid items-center gap-10 lg:grid-cols-[0.92fr_1.08fr]">
            <motion.div
              key={activeScene.id}
              initial={{ opacity: 0, y: 34, filter: "blur(16px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={spring}
              className="max-w-5xl"
            >
              <div className="mb-8 flex items-center gap-4">
                <span className="h-px w-16 bg-white/25" />
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.34em]" style={{ color: activeScene.accent }}>
                  {activeScene.id} / {activeScene.label}
                </span>
              </div>

              <h1 className="font-display text-[clamp(3.35rem,8vw,9.5rem)] font-black uppercase leading-[0.78] tracking-[-0.055em]">
                {activeScene.title}
              </h1>

              <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300/72 sm:text-lg">
                {activeScene.subtitle}
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <motion.button
                  whileHover={{ scale: 1.035, y: -3 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => onSelectTool(activeScene.tool)}
                  className="group flex h-14 items-center gap-3 rounded-full bg-white px-6 text-sm font-black uppercase tracking-[0.18em] text-black shadow-[0_24px_80px_rgba(255,255,255,0.15)]"
                >
                  Open Module
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </motion.button>

                <div className="rounded-full border border-white/10 bg-white/[0.035] px-5 py-3 backdrop-blur-xl">
                  <p className="font-display text-2xl font-black" style={{ color: activeScene.accent }}>{activeScene.metric}</p>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{activeScene.caption}</p>
                </div>
              </div>
            </motion.div>

            <motion.div style={{ y: stageY, rotate: stageRotate }} className="relative min-h-[38rem] lg:min-h-[48rem]">
              <motion.div
                style={{ scale: coreScale }}
                className="absolute left-1/2 top-1/2 h-[min(74vw,42rem)] w-[min(74vw,42rem)] -translate-x-1/2 -translate-y-1/2"
              >
                <div className="absolute inset-0 rounded-full border border-white/10" />
                <div className="absolute inset-12 rounded-full border border-dashed border-white/10" />
                <div className="absolute inset-28 rounded-full border border-white/8" />
                <div className="absolute inset-40 rounded-full" style={{ background: `radial-gradient(circle, ${activeScene.wash}, transparent 68%)`, boxShadow: `0 0 110px ${activeScene.wash}` }} />
              </motion.div>

              <motion.div
                key={`panel-${activeScene.id}`}
                initial={{ opacity: 0, scale: 0.9, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={spring}
                className="absolute inset-x-0 top-1/2 mx-auto max-w-[42rem] -translate-y-1/2 overflow-hidden rounded-[2.4rem] border border-white/12 bg-[#070a10]/78 p-5 shadow-[0_42px_150px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl"
              >
                <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.12)_48%,transparent_51%)] opacity-60" />
                <div className="relative">
                  <div className="mb-10 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.055]">
                        <ActiveIcon className="h-7 w-7" style={{ color: activeScene.accent }} />
                      </span>
                      <div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Active system</p>
                        <p className="text-sm font-black uppercase text-white">{activeScene.label}</p>
                      </div>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-white/45" />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {["Capture", "Reconcile", "Export"].map((item, index) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-black/28 p-4">
                        <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(100, 44 + active * 10 + index * 18)}%` }}
                            transition={{ ...spring, delay: index * 0.05 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: activeScene.accent }}
                          />
                        </div>
                        <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-5">
                    <div className="mb-5 flex items-center justify-between">
                      <span className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Signal curve</span>
                      <Sparkles className="h-4 w-4" style={{ color: activeScene.accent }} />
                    </div>
                    <div className="flex h-32 items-end gap-2">
                      {bars.map((bar, index) => (
                        <motion.div
                          key={`${active}-${index}`}
                          initial={{ height: 8, opacity: 0.25 }}
                          animate={{ height: `${Math.min(100, bar + active * 6 - (index % 3) * 5)}%`, opacity: 1 }}
                          transition={{ ...spring, delay: index * 0.018 }}
                          className="flex-1 rounded-full"
                          style={{ background: `linear-gradient(to top, ${activeScene.wash}, ${activeScene.accent})` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>

          <div className="relative z-40">
            <div className="mb-4 h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div style={{ width: progress, backgroundColor: activeScene.accent }} className="h-full rounded-full" />
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {scenes.map((scene, index) => (
                <button
                  key={scene.id}
                  onClick={() => setActive(index)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                    active === index
                      ? "border-white/22 bg-white/[0.08] text-white"
                      : "border-white/8 bg-white/[0.025] text-slate-500 hover:border-white/18 hover:text-slate-200"
                  }`}
                >
                  <span className="block font-mono text-[10px] font-black uppercase tracking-[0.22em]">{scene.id}</span>
                  <span className="mt-1 block text-xs font-black uppercase">{scene.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-0 top-1/2 z-0 w-[180vw] -translate-y-1/2 overflow-hidden opacity-[0.045]">
          <div className="whitespace-nowrap font-display text-[17vw] font-black uppercase leading-none tracking-[-0.08em]">
            ProScale / Finance / Tax / Evidence / Forecast / ProScale / Finance /
          </div>
        </div>
      </div>
    </section>
  );
}
