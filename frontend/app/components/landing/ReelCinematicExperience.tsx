"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useMotionValueEvent,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowUpRight,
  Bot,
  CircleDollarSign,
  FileCheck2,
  Landmark,
  Orbit,
  ReceiptText,
  ScanLine,
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
  stiffness: 170,
  damping: 22,
  mass: 0.9,
} as const;

const scenes = [
  {
    code: "01",
    tool: "taxrecon" as const,
    eyebrow: "Payout signal",
    title: "Ecommerce finance, decoded in motion.",
    line: "Marketplace settlements, bank receipts, SKU leakage, tax variance, and dispute evidence move through one cinematic control layer.",
    metric: "128K",
    metricLabel: "Rows reconciled",
    icon: ReceiptText,
    accent: "#67e8f9",
    wash: "rgba(103,232,249,0.20)",
  },
  {
    code: "02",
    tool: "gstrecon" as const,
    eyebrow: "GST lens",
    title: "Credits align before the audit does.",
    line: "Purchase books meet GSTR-2B with fuzzy matching, tolerance logic, vendor trails, and export-ready exception packets.",
    metric: "96.8%",
    metricLabel: "Auto-match confidence",
    icon: Zap,
    accent: "#a5b4fc",
    wash: "rgba(165,180,252,0.20)",
  },
  {
    code: "03",
    tool: "itrecon" as const,
    eyebrow: "Tax evidence",
    title: "AIS, 26AS, Form 16, bank truth.",
    line: "Direct-tax signals become a guided playbook: explain deltas, create remediation tasks, and download client-ready audit packs.",
    metric: "317",
    metricLabel: "Evidence packets",
    icon: FileCheck2,
    accent: "#c4b5fd",
    wash: "rgba(196,181,253,0.20)",
  },
  {
    code: "04",
    tool: "profitability" as const,
    eyebrow: "Margin radar",
    title: "Profit leaks surface like heat signatures.",
    line: "COGS drift, return weight, runway pressure, channel leakage, and SKU economics become visible before they become expensive.",
    metric: "+18%",
    metricLabel: "Margin signal lift",
    icon: CircleDollarSign,
    accent: "#6ee7b7",
    wash: "rgba(110,231,183,0.18)",
  },
  {
    code: "05",
    tool: "fpa" as const,
    eyebrow: "CFO orbit",
    title: "Planning becomes a living command room.",
    line: "Budget grids, forecasts, ledger audit, reports, and CFO chat sit inside a local-first console built for client handoff.",
    metric: "5",
    metricLabel: "Launch modules",
    icon: Bot,
    accent: "#fef3c7",
    wash: "rgba(254,243,199,0.16)",
  },
];

const headlineWords = ["RECON", "TAX", "MARGIN", "FORECAST", "AUDIT"];

function useSceneGsap(ref: React.RefObject<HTMLElement | null>) {
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
          ".reel-rise",
          { y: 80, opacity: 0, filter: "blur(18px)" },
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 1.1,
            ease: "power4.out",
            stagger: 0.08,
            scrollTrigger: {
              trigger: ref.current,
              start: "top 70%",
              once: true,
            },
          }
        );

        gsap.to(".reel-marquee", {
          xPercent: -28,
          ease: "none",
          scrollTrigger: {
            trigger: ref.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.65,
          },
        });
      }, ref);

      cleanup = () => ctx.revert();
    };

    run();
    return () => cleanup();
  }, [ref]);
}

export default function ReelCinematicExperience({ onSelectTool }: ReelCinematicExperienceProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const [active, setActive] = useState(0);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end end"] });
  const activeScene = scenes[active];
  const ActiveIcon = activeScene.icon;
  const sceneProgress = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const stageRotate = useTransform(scrollYProgress, [0, 0.5, 1], [-8, 4, 10]);
  const stageScale = useTransform(scrollYProgress, [0, 0.55, 1], [0.92, 1.04, 0.96]);
  const lensY = useTransform(scrollYProgress, [0, 1], [120, -140]);
  const mouseGlow = useMotionTemplate`radial-gradient(620px circle at ${mouseX}% ${mouseY}%, ${activeScene.wash}, rgba(15,23,42,0.20) 38%, transparent 72%)`;

  useSceneGsap(sectionRef);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const next = Math.min(scenes.length - 1, Math.max(0, Math.floor(latest * scenes.length)));
    setActive(next);
  });

  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, index) => ({
        id: index,
        size: 3 + (index % 4),
        left: 8 + ((index * 17) % 84),
        top: 10 + ((index * 29) % 78),
        delay: index * 0.045,
      })),
    []
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set(((event.clientX - rect.left) / rect.width) * 100);
    mouseY.set(((event.clientY - rect.top) / rect.height) * 100);
  };

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[620vh] overflow-clip bg-[#020306] text-white"
    >
      <motion.div style={{ background: mouseGlow }} className="pointer-events-none fixed inset-0 z-0 opacity-80" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,255,255,0.08),transparent_28%),linear-gradient(180deg,rgba(2,3,6,0.08),rgba(2,3,6,0.92))]" />
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.12] mix-blend-screen [background-image:repeating-linear-gradient(0deg,transparent_0_2px,rgba(255,255,255,0.45)_3px,transparent_4px)]" />

      <div className="sticky top-0 z-10 min-h-screen overflow-hidden">
        <div className="absolute inset-x-0 top-0 z-20 h-24 bg-gradient-to-b from-[#020306] to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-20 h-24 bg-gradient-to-t from-[#020306] to-transparent" />

        <motion.div
          style={{ y: lensY }}
          className="pointer-events-none absolute left-1/2 top-1/2 h-[44rem] w-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/8"
        >
          <div className="absolute inset-12 rounded-full border border-dashed border-white/10" />
          <div className="absolute inset-28 rounded-full border border-white/8" />
          <div className="absolute inset-44 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.14),transparent_68%)]" />
        </motion.div>

        {particles.map((particle) => (
          <motion.span
            key={particle.id}
            className="pointer-events-none absolute rounded-full bg-white"
            style={{
              left: `${particle.left}%`,
              top: `${particle.top}%`,
              height: particle.size,
              width: particle.size,
              boxShadow: `0 0 24px ${activeScene.accent}`,
            }}
            animate={{ opacity: [0.18, 0.9, 0.28], scale: [0.6, 1.5, 0.85] }}
            transition={{ duration: 3.8, repeat: Infinity, delay: particle.delay, ease: "easeInOut" }}
          />
        ))}

        <div className="relative z-30 mx-auto grid min-h-screen w-full max-w-[1720px] grid-rows-[auto_1fr_auto] px-5 py-5 sm:px-9 lg:px-14">
          <div className="flex items-center justify-between gap-4">
            <div className="reel-rise flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: activeScene.accent, boxShadow: `0 0 28px ${activeScene.accent}` }} />
              <span className="font-mono text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">ProScale cinematic finance OS</span>
            </div>
            <div className="reel-rise hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-4 py-2 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-slate-400 md:flex">
              <Sparkles className="h-3.5 w-3.5" style={{ color: activeScene.accent }} />
              Scroll to direct the film
            </div>
          </div>

          <div className="grid items-center gap-8 py-10 lg:grid-cols-[0.86fr_1.14fr]">
            <div className="min-w-0">
              <motion.div
                key={activeScene.code}
                initial={{ opacity: 0, y: 42, filter: "blur(18px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={spring}
                className="max-w-4xl"
              >
                <p className="mb-6 font-mono text-[11px] font-black uppercase tracking-[0.34em]" style={{ color: activeScene.accent }}>
                  {activeScene.code} / {activeScene.eyebrow}
                </p>
                <h1 className="font-display text-[clamp(3.9rem,8.8vw,10.8rem)] font-black uppercase leading-[0.74] tracking-[-0.055em]">
                  {activeScene.title.split(" ").map((word, index) => (
                    <motion.span
                      key={`${activeScene.code}-${word}-${index}`}
                      initial={{ opacity: 0, y: 70, rotateX: -50 }}
                      animate={{ opacity: 1, y: 0, rotateX: 0 }}
                      transition={{ ...spring, delay: index * 0.035 }}
                      className="mr-[0.16em] inline-block origin-bottom"
                    >
                      {word}
                    </motion.span>
                  ))}
                </h1>
                <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300/76 sm:text-lg">
                  {activeScene.line}
                </p>
              </motion.div>

              <div className="reel-rise mt-10 flex flex-wrap items-center gap-4">
                <motion.button
                  whileHover={{ y: -4, scale: 1.035 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => onSelectTool(activeScene.tool)}
                  className="relative h-14 overflow-hidden rounded-full border border-white/18 bg-white text-black px-6 font-black uppercase tracking-[0.18em] shadow-[0_20px_70px_rgba(255,255,255,0.16)]"
                >
                  <span className="relative z-10 flex items-center gap-3">
                    Open {activeScene.eyebrow}
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </motion.button>

                <div className="rounded-full border border-white/10 bg-black/30 px-5 py-4">
                  <p className="font-display text-2xl font-black" style={{ color: activeScene.accent }}>{activeScene.metric}</p>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{activeScene.metricLabel}</p>
                </div>
              </div>
            </div>

            <motion.div style={{ rotate: stageRotate, scale: stageScale }} className="reel-rise relative min-h-[36rem] lg:min-h-[46rem]">
              <div className="absolute inset-0 rounded-[3.2rem] border border-white/12 bg-[linear-gradient(140deg,rgba(255,255,255,0.10),rgba(255,255,255,0.025)_26%,rgba(255,255,255,0.08)_100%)] shadow-[0_42px_180px_rgba(0,0,0,0.68),inset_0_1px_0_rgba(255,255,255,0.20)] backdrop-blur-3xl" />
              <div className="absolute inset-5 rounded-[2.6rem] border border-white/10 bg-[#05070c]/72" />
              <div className="absolute inset-0 rounded-[3.2rem] bg-[linear-gradient(115deg,transparent_0%,rgba(255,255,255,0.12)_45%,transparent_48%)] opacity-70" />

              <div className="absolute left-8 top-8 flex items-center gap-4">
                <motion.div
                  key={`icon-${active}`}
                  initial={{ scale: 0.6, opacity: 0, rotate: -24 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={spring}
                  className="flex h-20 w-20 items-center justify-center rounded-[1.6rem] border border-white/12 bg-white/[0.06]"
                >
                  <ActiveIcon className="h-9 w-9" style={{ color: activeScene.accent }} />
                </motion.div>
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Active scene</p>
                  <p className="mt-1 text-lg font-black uppercase text-white">{activeScene.eyebrow}</p>
                </div>
              </div>

              <div className="absolute right-8 top-8 hidden rounded-full border border-white/10 bg-black/35 px-4 py-3 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-slate-300 sm:block">
                Real-time finance theatre
              </div>

              <div className="absolute left-1/2 top-1/2 h-[24rem] w-[24rem] -translate-x-1/2 -translate-y-1/2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 rounded-full border border-dashed border-white/15"
                />
                <motion.div
                  animate={{ rotate: -360 }}
                  transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-10 rounded-full border border-white/10"
                />
                <div className="absolute inset-24 rounded-full" style={{ background: `radial-gradient(circle, ${activeScene.wash}, transparent 70%)`, boxShadow: `0 0 90px ${activeScene.wash}` }} />
                <Orbit className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/80" />
                {headlineWords.map((word, index) => (
                  <motion.span
                    key={word}
                    animate={{
                      x: Math.cos(((index + active) / headlineWords.length) * Math.PI * 2) * 172,
                      y: Math.sin(((index + active) / headlineWords.length) * Math.PI * 2) * 172,
                      opacity: active === index ? 1 : 0.44,
                    }}
                    transition={spring}
                    className="absolute left-1/2 top-1/2 rounded-full border border-white/10 bg-black/45 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.18em]"
                    style={{ color: active === index ? activeScene.accent : "rgba(226,232,240,0.75)" }}
                  >
                    {word}
                  </motion.span>
                ))}
              </div>

              <div className="absolute inset-x-8 bottom-8 grid gap-3 sm:grid-cols-3">
                {["Import", "Match", "Deliver"].map((label, index) => (
                  <motion.div
                    key={`${activeScene.code}-${label}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ ...spring, delay: index * 0.055 }}
                    className="rounded-2xl border border-white/10 bg-black/35 p-4"
                  >
                    <div className="mb-5 h-1 overflow-hidden rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, 42 + active * 13 + index * 18)}%` }}
                        transition={{ ...spring, delay: 0.1 + index * 0.06 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: activeScene.accent }}
                      />
                    </div>
                    <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
                    <p className="mt-1 text-sm font-bold text-white">{["clean", "explain", "launch"][index]}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>

          <div className="reel-rise grid gap-4">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <motion.div style={{ width: sceneProgress, backgroundColor: activeScene.accent }} className="h-full rounded-full" />
            </div>
            <div className="grid gap-2 sm:grid-cols-5">
              {scenes.map((scene, index) => (
                <button
                  key={scene.code}
                  onClick={() => {
                    setActive(index);
                    onSelectTool(scene.tool);
                  }}
                  className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all duration-300 ${
                    index === active
                      ? "border-white/24 bg-white/[0.08] text-white"
                      : "border-white/8 bg-white/[0.025] text-slate-500 hover:border-white/20 hover:text-slate-200"
                  }`}
                >
                  <span>
                    <span className="block font-mono text-[10px] font-black uppercase tracking-[0.22em]">{scene.code}</span>
                    <span className="mt-1 block text-xs font-bold uppercase">{scene.eyebrow}</span>
                  </span>
                  <span className="h-2 w-2 rounded-full transition-transform group-hover:scale-150" style={{ backgroundColor: scene.accent }} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute left-0 top-1/2 z-20 w-[220vw] -translate-y-1/2 overflow-hidden opacity-[0.055]">
          <div className="reel-marquee whitespace-nowrap font-display text-[18vw] font-black uppercase leading-none tracking-[-0.08em] text-white">
            {headlineWords.join(" / ")} / {headlineWords.join(" / ")} /
          </div>
        </div>
      </div>
    </section>
  );
}
