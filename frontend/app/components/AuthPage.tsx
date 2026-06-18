"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "../lib/supabase";

type ToolKey = "taxrecon" | "gstrecon" | "itrecon" | "profitability" | "fpa";

const modules = [
  {
    id: "ecom",
    tool: "taxrecon" as ToolKey,
    num: "01",
    label: "Ecommerce Reconciliation",
    title: "Match Every Payout.\nCatch Every Leak.",
    desc: "Match marketplace payouts, bank settlements, SKU leakage, GST variance and dispute packs in one unified cockpit.",
    accent: "#38BDF8",
    accentDim: "rgba(56,189,248,0.10)",
    features: [
      "Multi-platform payout matching",
      "SKU-level leakage detection",
      "Bank settlement reconciliation",
      "GST variance auto-flagging",
    ],
  },
  {
    id: "gst",
    tool: "gstrecon" as ToolKey,
    num: "02",
    label: "GST Recon Engine",
    title: "Cross-Check Books.\nExport Evidence.",
    desc: "Cross-check purchase books with GSTR-2B, tune fuzzy matching keys, and export exception-ready evidence packs.",
    accent: "#A78BFA",
    accentDim: "rgba(167,139,250,0.10)",
    features: [
      "GSTR-2B vs Purchase auto-match",
      "Fuzzy key tuning engine",
      "Exception evidence export",
      "HSN-wise variance reports",
    ],
  },
  {
    id: "profit",
    tool: "profitability" as ToolKey,
    num: "03",
    label: "Profit Cockpit",
    title: "See Every Rupee.\nStop the Drift.",
    desc: "Track SKU economics, returns, COGS drift, runaway ads and weighted revenue leakage in real time.",
    accent: "#38BDF8",
    accentDim: "rgba(56,189,248,0.10)",
    features: [
      "SKU-level P&L drill-down",
      "COGS drift monitoring",
      "Ad spend ROI tracking",
      "Weighted revenue leakage alerts",
    ],
  },
  {
    id: "tax",
    tool: "itrecon" as ToolKey,
    num: "04",
    label: "Direct Tax Recon",
    title: "One Evidence Desk.\nZero Surprises.",
    desc: "Reconcile AIS, TIS, Form 16, bank receipts and remediation tasks from a single evidence desk.",
    accent: "#A78BFA",
    accentDim: "rgba(167,139,250,0.10)",
    features: [
      "AIS/TIS auto-reconciliation",
      "Form 16 cross-verification",
      "Bank receipt matching",
      "Remediation task tracker",
    ],
  },
  {
    id: "cfo",
    tool: "fpa" as ToolKey,
    num: "05",
    label: "Virtual CFO OS",
    title: "Finance Intelligence.\nOn Demand.",
    desc: "Run budget grids, rolling forecasts, variance reports, ledger audits and CFO chat - all from one operating system.",
    accent: "#38BDF8",
    accentDim: "rgba(56,189,248,0.10)",
    features: [
      "Budget vs Actuals grid",
      "90-day rolling forecast",
      "Automated ledger audits",
      "AI CFO Chat assistant",
    ],
  },
];

const outcomes = [
  { value: 94, suffix: "%", label: "Faster\nReconciliations" },
  { value: 100, suffix: "%", label: "Cleaner\nAudit Packs" },
  { value: 3, suffix: "x", label: "Margin\nVisibility" },
  { value: 62, suffix: "%", label: "Lower\nLeakage" },
  { value: 100, suffix: "%", label: "Compliance\nControl" },
];

const pricing = [
  {
    name: "Starter",
    price: "INR 0",
    per: "/mo",
    feats: ["All 5 modules", "50 invoices/mo", "1 user", "Community support"],
    btn: "Get Started",
    pop: false,
  },
  {
    name: "Professional",
    price: "INR 1,499",
    per: "/mo",
    feats: ["All 5 modules", "1,000 invoices/mo", "5 users", "AI insights", "Priority support"],
    btn: "Start Trial",
    pop: true,
  },
  {
    name: "Enterprise",
    price: "INR 3,999",
    per: "/mo",
    feats: ["All 5 modules", "Unlimited invoices", "Unlimited users", "Custom integrations", "Dedicated manager"],
    btn: "Contact Sales",
    pop: false,
  },
];

const heroCapabilities = [
  {
    label: "Marketplace payout scan",
    headline: "Amazon, Flipkart and Shopify settlements matched against bank credits.",
    metric: "47 exceptions",
    value: "INR 2.41L",
    accent: "#38BDF8",
    chips: ["PAYOUT", "BANK", "CLAIMS"],
  },
  {
    label: "GST credit intelligence",
    headline: "Vendor filing gaps and blocked ITC surfaced before month-end close.",
    metric: "ITC unlocked",
    value: "INR 31.2L",
    accent: "#A78BFA",
    chips: ["GSTR-2B", "ITC", "VENDOR"],
  },
  {
    label: "Profit cockpit",
    headline: "SKU margin, returns, COGS drift and ad ROAS move into one live layer.",
    metric: "Margin recovered",
    value: "INR 7.8L",
    accent: "#10B981",
    chips: ["SKU", "COGS", "ROAS"],
  },
  {
    label: "CFO forecast",
    headline: "Cash runway, variance reports and budget signals refresh continuously.",
    metric: "Runway",
    value: "14 months",
    accent: "#22D3EE",
    chips: ["BUDGET", "CASH", "AUDIT"],
  },
];

export default function AuthPage() {
  const [activeMod, setActiveMod] = useState("ecom");
  const [navVisible, setNavVisible] = useState(false);
  const [showModuleMap, setShowModuleMap] = useState(false);
  const [heroCapabilityIndex, setHeroCapabilityIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const redirectTo = typeof window !== "undefined" ? window.location.origin : undefined;

  useEffect(() => {
    if (shouldReduceMotion) return;

    const interval = window.setInterval(() => {
      setHeroCapabilityIndex((index) => (index + 1) % heroCapabilities.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, [shouldReduceMotion]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(".hero-eyebrow", { y: 30, opacity: 0, duration: 0.8 })
        .from(".hero-word", { y: 80, opacity: 0, duration: 1, stagger: 0.12 }, "<0.15")
        .from(".hero-sub", { y: 25, opacity: 0, duration: 0.7 }, "<0.2")
        .from(".hero-btns", { y: 25, opacity: 0, duration: 0.7 }, "<0.15");

      document.querySelectorAll(".mod-section").forEach((sec) => {
        gsap.from(sec.querySelectorAll(".mod-num,.mod-title,.mod-desc,.mod-feat"), {
          scrollTrigger: { trigger: sec, start: "top 72%" },
          y: 50,
          opacity: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
        });
        gsap.from(sec.querySelector(".mod-dash"), {
          scrollTrigger: { trigger: sec, start: "top 68%" },
          scale: 0.9,
          opacity: 0,
          duration: 1,
          ease: "power3.out",
        });
      });

      ScrollTrigger.create({
        trigger: "#mod-start",
        start: "top top+=80",
        end: "bottom bottom",
        onEnter: () => setNavVisible(true),
        onLeaveBack: () => setNavVisible(false),
      });

      modules.forEach((mod) => {
        ScrollTrigger.create({
          trigger: `#mod-${mod.id}`,
          start: "top 42%",
          end: "bottom 58%",
          onEnter: () => setActiveMod(mod.id),
          onEnterBack: () => setActiveMod(mod.id),
        });
      });

      ScrollTrigger.create({
        trigger: "#outcomes",
        start: "top 70%",
        once: true,
        onEnter: () => {
          document.querySelectorAll<HTMLElement>(".outcome-counter").forEach((el) => {
            const target = Number(el.dataset.target || "0");
            gsap.to(el, {
              innerText: target,
              duration: 1.8,
              snap: { innerText: 1 },
              ease: "power2.out",
            });
          });
        },
      });

      gsap.from(".outcome-item", {
        scrollTrigger: { trigger: "#outcomes", start: "top 65%" },
        y: 50,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".pricing-card", {
        scrollTrigger: { trigger: "#pricing", start: "top 65%" },
        y: 44,
        opacity: 0,
        duration: 0.7,
        stagger: 0.1,
        ease: "power3.out",
      });

      gsap.from(".cta-content", {
        scrollTrigger: { trigger: "#cta", start: "top 70%" },
        y: 50,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
      });
    });

    return () => {
      ctx.revert();
      lenis.destroy();
      cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let frame = 0;
    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      vx: (Math.random() - 0.5) * 0.24,
      vy: Math.random() * 0.18 + 0.04,
      size: Math.random() * 1.6 + 0.4,
    }));

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y > height + 10 || p.x < -10 || p.x > width + 10) {
          p.x = Math.random() * width;
          p.y = -10;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,212,255,.34)";
        ctx.fill();
        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const dx = p.x - other.x;
          const dy = p.y - other.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = `rgba(0,212,255,${0.04 * (1 - dist / 130)})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      });
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const scrollToModules = () => {
    setShowModuleMap(true);
    setTimeout(() => document.querySelector("#module-map")?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  return (
    <main className="hermes-page relative min-h-screen overflow-x-hidden bg-black text-[#ededed]">
      <div className="noise-overlay" />
      <div className="grid-bg" />
      <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[2] opacity-40" />

      <header className="absolute left-0 right-0 top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="#" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-white p-1">
              <img src="/proscale-logo.png" alt="ProScale Advisory logo" className="h-full w-full object-contain" />
            </span>
            <span className="text-base font-bold tracking-[-0.02em] text-white">ProScale Advisory</span>
          </a>
          <div className="hidden items-center gap-7 text-sm font-medium text-[#A7B0BE] md:flex">
            <a href="#mod-start" className="transition hover:text-white">Modules</a>
            <a href="#outcomes" className="transition hover:text-white">Outcomes</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </div>
          <a href="#hero-auth" className="rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black transition hover:bg-[#DFF7FF]">
            Sign up
          </a>
        </div>
      </header>

      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-500 ${
          navVisible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0"
        }`}
      >
        <div className="mx-auto flex max-w-[1280px] items-center gap-1 overflow-x-auto px-6 py-3">
          <span className="mr-4 text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#666]">Modules</span>
          {modules.map((mod) => (
            <a
              key={mod.id}
              href={`#mod-${mod.id}`}
              className="flex-shrink-0 rounded-full px-3.5 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider transition-all duration-300"
              style={{
                color: activeMod === mod.id ? mod.accent : "#666",
                background: activeMod === mod.id ? mod.accentDim : "transparent",
                border: activeMod === mod.id ? `1px solid ${mod.accent}40` : "1px solid transparent",
              }}
            >
              {mod.num} {mod.id === "ecom" ? "Ecom" : mod.id === "gst" ? "GST" : mod.id === "profit" ? "Profit" : mod.id === "tax" ? "Tax" : "CFO"}
            </a>
          ))}
          <a href="#pricing" className="ml-auto flex-shrink-0 rounded-full border border-white/10 px-4 py-1.5 text-[0.65rem] font-semibold uppercase tracking-wider text-[#a0a0a0]">
            Pricing
          </a>
        </div>
      </nav>

      <section className="relative flex min-h-screen items-center overflow-hidden bg-black pb-16 pt-28 lg:pb-20 lg:pt-32">
        <div className="absolute left-[18%] top-[28%] h-[540px] w-[540px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-28 blur-[110px] hero-glow" />
        <div className="absolute right-[-8rem] top-[24%] h-[520px] w-[520px] rounded-full bg-[#A78BFA]/10 blur-[130px]" />
        <HeroCommandVisual signal={heroCapabilities[heroCapabilityIndex]} />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black to-transparent" />
        <div className="container-cinematic relative z-10 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_430px] xl:gap-16">
          <motion.div
            className="max-w-3xl"
            initial={shouldReduceMotion ? false : { opacity: 0, y: 26 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="hero-eyebrow mb-5 inline-flex rounded-full border border-[#38BDF8]/25 bg-[#38BDF8]/10 px-4 py-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[#38BDF8]">
              AI-Powered Finance Suite
            </p>
            <h1 className="mb-6 text-[clamp(2.35rem,5vw,5rem)] font-black leading-[0.98] tracking-[-0.045em]">
              <span className="hero-word block text-white">Reconcile finance, tax and margin</span>
              <span className="hero-word gradient-text block">from one operating suite.</span>
            </h1>
            <p className="hero-sub mb-7 max-w-2xl text-[clamp(1rem,1.25vw,1.15rem)] leading-8 text-[#B6C0CC]">
              ProScale Advisory brings ecommerce payouts, GST credits, profit visibility, direct tax evidence and CFO workflows into one launch-ready SaaS workspace.
            </p>
            <div className="hero-btns flex flex-wrap items-center gap-3">
              <motion.a href="#hero-auth" className="btn-cyan" whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={{ scale: 0.98 }}>Create account</motion.a>
              <motion.button type="button" onClick={scrollToModules} className="btn-ghost" whileHover={shouldReduceMotion ? undefined : { y: -3 }} whileTap={{ scale: 0.98 }}>See All Modules</motion.button>
            </div>
            <div className="mt-9 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Audit-ready evidence", "All 5 modules", "Google sign-in"].map((item, index) => (
                <motion.div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.025] px-4 py-3 text-sm font-medium text-[#CBD5E1]"
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                  animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.45 }}
                >
                  {item}
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div
            id="hero-auth"
            className="auth-card w-full rounded-[1.6rem] border border-white/10 bg-[#05070B]/95 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
            initial={shouldReduceMotion ? false : { opacity: 0, x: 30, scale: 0.98 }}
            animate={shouldReduceMotion ? undefined : { opacity: 1, x: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-5">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#38BDF8]">Start here</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">Sign up to enter</h2>
              <p className="mt-2 text-sm leading-6 text-[#94A3B8]">Create your workspace or sign in if you already have access.</p>
            </div>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: "#38BDF8",
                      brandAccent: "#0EA5E9",
                      brandButtonText: "#020617",
                      inputBackground: "#020617",
                      inputBorder: "rgba(255,255,255,0.12)",
                      inputText: "#F8FAFC",
                      inputPlaceholder: "#64748B",
                      messageText: "#94A3B8",
                      anchorTextColor: "#38BDF8",
                      dividerBackground: "rgba(255,255,255,0.10)",
                    },
                    radii: {
                      inputBorderRadius: "12px",
                      buttonBorderRadius: "12px",
                    },
                  },
                },
                style: {
                  button: { height: "44px", fontWeight: 700 },
                  input: { height: "44px" },
                  label: { color: "#CBD5E1", fontSize: "13px" },
                  anchor: { fontWeight: 600 },
                  container: { width: "100%" },
                },
              }}
              providers={["google"]}
              view="sign_up"
              redirectTo={redirectTo}
            />
          </motion.div>
        </div>
      </section>

      {showModuleMap && <ModuleMap id="module-map" compact />}

      <div id="mod-start" />

      {modules.map((mod) => (
        <section key={mod.id} id={`mod-${mod.id}`} className="mod-section relative py-20 lg:py-28">
          <ModuleBackdrop type={mod.id} accent={mod.accent} />
          <motion.a
            href="#hero-auth"
            className="container-cinematic group grid cursor-pointer items-center gap-10 rounded-[2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/70 lg:grid-cols-2 lg:gap-16"
            aria-label={`Sign in to view ${mod.label} in the module hub`}
            whileHover={shouldReduceMotion ? undefined : { y: -4 }}
            whileTap={{ scale: 0.992 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
          >
            <div>
              <div className="mod-num mb-3 flex items-center gap-2">
                <span className="text-[0.6rem] font-semibold uppercase tracking-[0.25em]" style={{ color: mod.accent }}>
                  {mod.label}
                </span>
                <span className="font-mono text-[0.55rem] font-bold opacity-50" style={{ color: mod.accent }}>
                  {mod.num}/05
                </span>
              </div>
              <h2 className="mod-title mb-4 whitespace-pre-line text-[clamp(2rem,3.5vw,3rem)] font-black leading-[1.05] tracking-[-0.03em]">
                {mod.title}
              </h2>
              <p className="mod-desc mb-5 max-w-[460px] text-[clamp(0.85rem,1.05vw,0.95rem)] leading-relaxed text-[#a0a0a0]">
                {mod.desc}
              </p>
              <ul className="flex flex-col gap-2">
                {mod.features.map((feature) => (
                  <li key={feature} className="mod-feat flex items-start gap-2.5 text-[0.8rem] text-[#a0a0a0]">
                    <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full" style={{ background: mod.accent, boxShadow: `0 0 12px ${mod.accent}` }} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mod-dash flex justify-center lg:justify-end">
              <div className="w-full max-w-[520px]">
                <ModuleVisual type={mod.id} accent={mod.accent} />
                <span className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-white/10 bg-white/[0.035] px-4 py-3 text-center text-sm font-bold text-white transition group-hover:border-cyan-300/35 group-hover:bg-cyan-300/10">
                  View all modules after sign in&nbsp;-&gt;
                </span>
              </div>
            </div>
          </motion.a>
        </section>
      ))}

      <ModuleMap id="all-modules" />

      <section id="outcomes" className="relative py-20 lg:py-28">
        <div className="container-cinematic">
          <p className="mb-3 text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#666]">Proven Outcomes</p>
          <h2 className="mb-14 text-center text-[clamp(2rem,3.5vw,2.8rem)] font-black leading-[1.05] tracking-[-0.03em]">
            Business Impact, <span className="gradient-text">Measured</span>
          </h2>
          <div className="relative grid grid-cols-2 gap-6 md:grid-cols-5">
            <div className="absolute left-[8%] right-[8%] top-7 hidden h-px bg-gradient-to-r from-transparent via-cyan-300/10 to-transparent md:block" />
            {outcomes.map((outcome) => (
              <div key={outcome.label} className="outcome-item relative flex flex-col items-center text-center">
                <div className="mb-4 h-2 w-2 rounded-full bg-[#00D4FF] shadow-[0_0_10px_rgba(0,212,255,0.3)]" />
                <div className="flex items-baseline gap-0.5">
                  <span className="outcome-counter gradient-text font-mono text-[clamp(2rem,3vw,2.8rem)] font-black leading-none" data-target={outcome.value}>
                    0
                  </span>
                  <span className="text-lg font-bold text-[#666]">{outcome.suffix}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-center text-[0.68rem] leading-tight text-[#a0a0a0]">{outcome.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative py-20 lg:py-28">
        <div className="container-cinematic">
          <p className="mb-3 text-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#666]">Pricing</p>
          <h2 className="mb-14 text-center text-[clamp(2rem,3.5vw,2.8rem)] font-black leading-[1.05] tracking-[-0.03em]">
            All modules.<br /><span className="gradient-text">One price.</span>
          </h2>
          <div className="mx-auto grid max-w-[900px] gap-5 md:grid-cols-3">
            {pricing.map((plan) => (
              <div
                key={plan.name}
                className="pricing-card relative rounded-2xl border p-6 text-center transition-all duration-300 hover:-translate-y-1"
                style={{
                  borderColor: plan.pop ? "#00D4FF" : "rgba(255,255,255,0.06)",
                  background: plan.pop ? "rgba(0,0,0,0.92)" : "rgba(0,0,0,0.72)",
                  boxShadow: plan.pop ? "0 0 40px rgba(0,212,255,0.1)" : "none",
                  transform: plan.pop ? "scale(1.04)" : "none",
                }}
              >
                {plan.pop && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#00D4FF] px-3 py-0.5 text-[0.6rem] font-bold text-[#030303]">Popular</div>}
                <div className="mb-1 text-sm font-bold">{plan.name}</div>
                <div className="text-3xl font-black">
                  {plan.price}<span className="text-xs font-normal text-[#666]">{plan.per}</span>
                </div>
                <ul className="my-5 space-y-1.5 text-left text-[0.75rem] text-[#a0a0a0]">
                  {plan.feats.map((feature) => (
                    <li key={feature} className="flex items-center gap-1.5">
                      <span className="text-[#10B981]">✓</span>{feature}
                    </li>
                  ))}
                </ul>
                <a
                  href="#hero-auth"
                  className={`block rounded-full py-2.5 text-[0.8rem] font-semibold transition-all ${
                    plan.pop ? "text-[#030303]" : "border border-white/10 text-[#a0a0a0]"
                  }`}
                  style={plan.pop ? { background: "linear-gradient(135deg, #00D4FF, #0099cc)" } : undefined}
                >
                  {plan.btn}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="cta" className="relative flex min-h-[72vh] items-center justify-center py-20">
        <div className="absolute inset-0 opacity-25 cta-glow" />
        <div className="cta-content container-cinematic relative z-10 flex flex-col items-center text-center">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#666]">Deploy Today</p>
          <h2 className="mb-5 text-[clamp(2.5rem,5.5vw,5rem)] font-black leading-[0.95] tracking-[-0.04em]">
            Deploy your<br />
            <span className="gradient-text">finance command</span><br />
            layer.
          </h2>
          <p className="mb-8 max-w-[440px] text-[clamp(0.85rem,1.1vw,0.95rem)] leading-relaxed text-[#a0a0a0]">
            Five modules. One core. Zero compromise. Step into the future of finance operations.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a href="#hero-auth" className="btn-cyan px-8 py-3.5 text-base">Launch Demo -&gt;</a>
            <a href="#hero-auth" className="btn-ghost px-8 py-3.5 text-base">Talk to Us</a>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-8">
        <div className="container-cinematic flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-[#00D4FF] shadow-[0_0_8px_rgba(0,212,255,0.3)]" />
            <span className="text-sm font-bold">ProScale Advisory</span>
          </div>
          <div className="flex flex-wrap gap-5">
            {modules.map((mod) => (
              <a key={mod.id} href={`#mod-${mod.id}`} className="text-[0.7rem] text-[#666] transition-colors hover:text-[#a0a0a0]">
                {mod.id === "ecom" ? "Ecommerce" : mod.label.replace(" Recon Engine", "").replace(" Recon", "").replace(" OS", "")}
              </a>
            ))}
          </div>
          <p className="text-[0.65rem] text-[#444]">© {new Date().getFullYear()} ProScale Advisory</p>
        </div>
      </footer>

      <style jsx global>{`
        .hermes-page {
          --cyan: #00D4FF;
          --cyan-glow: rgba(0, 212, 255, 0.25);
          font-family: Inter, Sora, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          background: #000;
        }
        .hermes-page nav {
          background: rgba(0, 0, 0, 0.86);
          backdrop-filter: blur(16px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }
        .container-cinematic {
          max-width: 1280px;
          margin: 0 auto;
          padding: 0 2rem;
          position: relative;
          z-index: 1;
        }
        .noise-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          pointer-events: none;
          opacity: 0.022;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          background-size: 256px 256px;
        }
        .grid-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          opacity: 0.018;
          background-image:
            linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px);
          background-size: 64px 64px;
          mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 70%);
        }
        .hero-glow {
          background: radial-gradient(circle, rgba(0,212,255,0.16) 0%, rgba(139,92,246,0.08) 32%, rgba(244,63,94,0.05) 54%, transparent 70%);
        }
        .hero-command {
          background:
            linear-gradient(90deg, rgba(0,0,0,0.34), transparent 38%, rgba(0,0,0,0.15)),
            repeating-linear-gradient(0deg, rgba(255,255,255,0.018) 0, rgba(255,255,255,0.018) 1px, transparent 1px, transparent 5px);
          mask-image: linear-gradient(to bottom, black 0%, black 78%, transparent 100%);
        }
        .hero-data-rail {
          opacity: 0.28;
          transform: rotate(-4deg);
          mask-image: linear-gradient(90deg, transparent, black 14%, black 86%, transparent);
        }
        .hero-data-row {
          display: flex;
          width: max-content;
          gap: 0.75rem;
          margin-bottom: 0.75rem;
          animation: dataRail 24s linear infinite;
        }
        .hero-data-row:nth-child(2) {
          animation-duration: 30s;
          animation-direction: reverse;
          margin-left: -8rem;
          opacity: 0.72;
        }
        .hero-data-row:nth-child(3) {
          animation-duration: 36s;
          margin-left: -16rem;
          opacity: 0.5;
        }
        .hero-data-pill {
          border: 1px solid rgba(56,189,248,0.16);
          border-radius: 999px;
          background: rgba(2,6,23,0.62);
          padding: 0.48rem 0.86rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          color: rgba(186,230,253,0.7);
          box-shadow: 0 0 28px rgba(56,189,248,0.05);
          text-transform: uppercase;
          white-space: nowrap;
        }
        .hero-orbit {
          border: 1px solid rgba(56,189,248,0.10);
          background:
            radial-gradient(circle at 50% 50%, rgba(56,189,248,0.12), transparent 34%),
            radial-gradient(circle at 50% 50%, transparent 39%, rgba(56,189,248,0.045) 40%, transparent 60%);
          box-shadow: inset 0 0 90px rgba(56,189,248,0.07);
          animation: orbitDrift 14s ease-in-out infinite;
        }
        .hero-orbit::before,
        .hero-orbit::after {
          content: "";
          position: absolute;
          inset: 8%;
          border-radius: 999px;
          border: 1px dashed rgba(255,255,255,0.11);
        }
        .hero-orbit::after {
          inset: 2%;
          border-style: solid;
          border-color: rgba(167,139,250,0.10);
          animation: orbitSpin 24s linear infinite;
        }
        .hero-orbit-chip {
          position: absolute;
          left: 50%;
          top: 50%;
          margin-left: -2.15rem;
          margin-top: -0.85rem;
          width: 4.3rem;
          border: 1px solid rgba(56,189,248,0.18);
          border-radius: 999px;
          background: rgba(2,6,23,0.70);
          padding: 0.38rem 0;
          text-align: center;
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.62rem;
          font-weight: 900;
          letter-spacing: 0.18em;
          color: rgba(186,230,253,0.74);
          box-shadow: 0 0 30px rgba(56,189,248,0.08);
        }
        .hero-profit-panel,
        .hero-mini-card {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 90px rgba(0,0,0,0.42);
        }
        .hero-profit-line {
          stroke-dasharray: 520;
          stroke-dashoffset: 520;
          animation: drawForecast 4.6s ease-in-out infinite;
        }
        .hero-profit-area {
          animation: forecastGlow 4.6s ease-in-out infinite;
        }
        .hero-mini-card {
          animation: miniCardFloat 4.8s ease-in-out infinite;
        }
        .mod-section {
          background:
            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.018), transparent 34%),
            linear-gradient(180deg, #000 0%, #030303 45%, #000 100%);
        }
        .mod-section::after {
          content: "";
          position: absolute;
          inset: auto 8vw 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
        }
        .module-backdrop {
          z-index: 0;
          opacity: 0.82;
        }
        .floating-fragments {
          position: absolute;
          inset: 0;
        }
        .floating-fragment {
          position: absolute;
          border: 1px solid currentColor;
          border-radius: 999px;
          background: rgba(0,0,0,0.42);
          padding: 0.38rem 0.7rem;
          font-size: 0.56rem;
          font-weight: 900;
          letter-spacing: 0.2em;
          opacity: 0.18;
          filter: blur(0.2px);
          animation: fragmentDrift 8s ease-in-out infinite;
        }
        .mod-dash {
          position: relative;
          animation: previewFloat 5s ease-in-out infinite;
        }
        .mod-dash::before {
          content: "LIVE RESULT PREVIEW";
          position: absolute;
          right: 0;
          top: -2.4rem;
          z-index: 2;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 999px;
          padding: 0.35rem 0.7rem;
          color: #777;
          background: rgba(0,0,0,0.86);
          font-size: 0.58rem;
          font-weight: 800;
          letter-spacing: 0.18em;
        }
        .mod-dash::after {
          content: "";
          position: absolute;
          inset: -1rem;
          pointer-events: none;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.10) 48%, transparent 54%);
          transform: translateX(-120%);
          animation: scannerSweep 3.6s ease-in-out infinite;
          opacity: 0.55;
        }
        .result-card {
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.08), 0 22px 70px rgba(0,0,0,0.4);
        }
        .capability-shell {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: 1.75rem;
          background:
            radial-gradient(circle at 85% 15%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 36%),
            linear-gradient(145deg, rgba(15,23,42,0.92), rgba(0,0,0,0.94));
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.08),
            0 34px 110px rgba(0,0,0,0.55),
            0 0 0 1px color-mix(in srgb, var(--accent) 10%, transparent);
        }
        .capability-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(circle at 50% 30%, black, transparent 78%);
          opacity: 0.28;
        }
        .capability-shell > * {
          position: relative;
          z-index: 1;
        }
        .data-node {
          animation: nodePulse 2.8s ease-in-out infinite;
        }
        .animated-bar {
          position: relative;
          overflow: hidden;
        }
        .animated-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.42), transparent);
          transform: translateX(-100%);
          animation: barScan 2.6s ease-in-out infinite;
        }
        .india-heatmap {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.55rem;
        }
        .heat-cell {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.95rem;
          border: 1px solid rgba(255,255,255,0.10);
          font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
          font-size: 0.72rem;
          font-weight: 900;
          color: rgba(248,250,252,0.9);
          animation: heatPulse 2.9s ease-in-out infinite;
        }
        .heat-1 { background: rgba(16,185,129,0.16); box-shadow: 0 0 18px rgba(16,185,129,0.08); }
        .heat-2 { background: rgba(56,189,248,0.16); box-shadow: 0 0 18px rgba(56,189,248,0.09); }
        .heat-3 { background: rgba(245,158,11,0.18); box-shadow: 0 0 22px rgba(245,158,11,0.11); }
        .heat-4 { background: rgba(244,63,94,0.18); box-shadow: 0 0 24px rgba(244,63,94,0.12); }
        .radar-polygon {
          transform-origin: 160px 112px;
          animation: radarBreathe 3.6s ease-in-out infinite;
        }
        .evidence-row {
          margin-bottom: 0.7rem;
          animation: evidenceSlide 3.8s ease-in-out infinite;
        }
        .forecast-line {
          stroke-dasharray: 520;
          stroke-dashoffset: 520;
          animation: drawForecast 4.2s ease-in-out infinite;
        }
        .forecast-area {
          animation: forecastGlow 4.2s ease-in-out infinite;
        }
        .auth-card form,
        .auth-card [data-supabase-auth] {
          width: 100%;
        }
        .auth-card button,
        .auth-card input {
          width: 100%;
        }
        .auth-card input {
          background: #050505 !important;
        }
        .auth-card a {
          color: #38BDF8 !important;
        }
        .mod-dash .h-full.rounded-full {
          transform-origin: left center;
          animation: barBreath 2.4s ease-in-out infinite;
        }
        .cta-glow {
          background: radial-gradient(ellipse 50% 40% at 50% 50%, rgba(0,212,255,0.05), transparent 70%);
        }
        .gradient-text {
          background: linear-gradient(135deg, #00D4FF, #8B5CF6, #00D4FF);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientShift 4s ease-in-out infinite;
        }
        .btn-cyan {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 9999px;
          padding: 0.85rem 2rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #030303;
          text-decoration: none;
          background: linear-gradient(135deg, #00D4FF, #0099cc);
          box-shadow: 0 0 40px rgba(0,212,255,0.25), 0 4px 16px rgba(0,212,255,0.12);
          transition: all 0.3s;
        }
        .btn-cyan:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 60px rgba(0,212,255,0.25), 0 8px 24px rgba(0,212,255,0.2);
        }
        .btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          border-radius: 9999px;
          padding: 0.85rem 2rem;
          font-size: 0.9rem;
          font-weight: 600;
          color: #a0a0a0;
          text-decoration: none;
          border: 1px solid rgba(255,255,255,0.06);
          transition: all 0.3s;
        }
        .btn-ghost:hover {
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.03);
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes previewFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes orbitDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
          50% { transform: translate3d(-18px, 12px, 0) scale(1.02); }
        }
        @keyframes orbitSpin {
          to { transform: rotate(360deg); }
        }
        @keyframes miniCardFloat {
          0%, 100% { transform: translateY(0); opacity: 0.72; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        @keyframes dataRail {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        @keyframes scannerSweep {
          0%, 18% { transform: translateX(-120%); opacity: 0; }
          42%, 58% { opacity: 0.55; }
          82%, 100% { transform: translateX(120%); opacity: 0; }
        }
        @keyframes fragmentDrift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.12; }
          50% { transform: translate3d(12px, -18px, 0) scale(1.04); opacity: 0.3; }
        }
        @keyframes nodePulse {
          0%, 100% { transform: scale(1); opacity: 0.78; }
          50% { transform: scale(1.06); opacity: 1; }
        }
        @keyframes barScan {
          0%, 18% { transform: translateX(-100%); opacity: 0; }
          45%, 65% { opacity: 0.8; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        @keyframes heatPulse {
          0%, 100% { transform: translateY(0); filter: brightness(0.92); }
          50% { transform: translateY(-3px); filter: brightness(1.25); }
        }
        @keyframes radarBreathe {
          0%, 100% { transform: scale(0.96); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
        }
        @keyframes evidenceSlide {
          0%, 100% { transform: translateX(0); opacity: 0.86; }
          50% { transform: translateX(6px); opacity: 1; }
        }
        @keyframes drawForecast {
          0% { stroke-dashoffset: 520; opacity: 0.35; }
          42%, 72% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -520; opacity: 0.35; }
        }
        @keyframes forecastGlow {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.78; }
        }
        @keyframes barBreath {
          0%, 100% { filter: brightness(0.95); }
          50% { filter: brightness(1.45); }
        }
        @media (prefers-reduced-motion: reduce) {
          .floating-fragment,
          .mod-dash,
          .data-node,
          .animated-bar::after,
          .heat-cell,
          .radar-polygon,
          .evidence-row,
          .forecast-line,
          .forecast-area,
          .hero-orbit,
          .hero-orbit::after,
          .hero-profit-line,
          .hero-profit-area,
          .hero-mini-card,
          .hero-data-row {
            animation: none !important;
          }
        }
        @media (max-width: 768px) {
          .container-cinematic { padding: 0 1.25rem; }
          .floating-fragment { display: none; }
          .capability-shell { border-radius: 1.25rem; }
          .india-heatmap { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        }
      `}</style>
    </main>
  );
}

function ModuleMap({ id, compact = false }: { id: string; compact?: boolean }) {
  return (
    <section id={id} className={`relative bg-black ${compact ? "py-14" : "py-24 lg:py-32"}`}>
      <div className="container-cinematic">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-[#666]">
            {compact ? "All Modules" : "Enter Any Module"}
          </p>
          <h2 className="text-[clamp(2rem,4.5vw,4.4rem)] font-black leading-[0.95] tracking-[-0.045em]">
            {compact ? "Choose the command layer you want to inspect." : "All modules visible. Pick your operating desk."}
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {modules.map((mod) => (
            <a
              key={mod.id}
              href={compact ? `#mod-${mod.id}` : "#hero-auth"}
              className="group relative min-h-[230px] overflow-hidden rounded-[1.4rem] border border-white/10 bg-black p-5 transition duration-300 hover:-translate-y-1"
              style={{ boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px ${mod.accent}12` }}
            >
              <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full blur-3xl transition duration-300 group-hover:scale-125" style={{ background: mod.accentDim }} />
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-8 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold" style={{ color: mod.accent }}>{mod.num}/05</span>
                  <span className="h-2 w-2 rounded-full" style={{ background: mod.accent, boxShadow: `0 0 18px ${mod.accent}` }} />
                </div>
                <h3 className="text-2xl font-black leading-tight tracking-[-0.035em]" style={{ color: mod.accent }}>
                  {mod.label}
                </h3>
                <p className="mt-4 flex-1 text-sm leading-6 text-[#a0a0a0]">{mod.desc}</p>
                <span className="mt-6 text-sm font-semibold text-white">
                  {compact ? "Scroll to module ->" : "Sign in to view ->"}
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

function HeroCommandVisual({ signal }: { signal: (typeof heroCapabilities)[number] }) {
  const railItems = heroCapabilities.flatMap((item) => [
    item.label,
    item.value,
    ...item.chips,
  ]);

  return (
    <div className="hero-command pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      <div className="hero-data-rail absolute left-0 right-0 top-[16%] hidden md:block">
        {[0, 1, 2].map((row) => (
          <div key={row} className="hero-data-row" style={{ animationDelay: `${row * -5}s` }}>
            {[...railItems, ...railItems].map((item, index) => (
              <span key={`${row}-${item}-${index}`} className="hero-data-pill">
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>

      <div className="hero-orbit absolute right-[5vw] top-[17%] hidden h-[560px] w-[560px] rounded-full lg:block">
        <div className="absolute inset-[12%] rounded-full border border-cyan-200/10" />
        <div className="absolute inset-[25%] rounded-full border border-violet-200/10" />
        <div className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300/10 blur-2xl" />
        {signal.chips.concat(["AI", "AUDIT"]).slice(0, 5).map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="hero-orbit-chip"
            style={{
              transform: `rotate(${index * 72}deg) translateX(238px) rotate(-${index * 72}deg)`,
              borderColor: `${signal.accent}42`,
              color: signal.accent,
            }}
          >
            {label}
          </span>
        ))}
      </div>

      <div className="hero-profit-panel absolute bottom-[9%] left-[8vw] hidden w-[360px] rounded-3xl border border-white/10 bg-black/50 p-4 backdrop-blur-md">
        <AnimatePresence mode="wait">
          <motion.div
            key={signal.label}
            className="mb-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[0.6rem] font-black uppercase tracking-[0.22em] text-slate-500">{signal.label}</span>
              <span className="rounded-full px-2 py-1 font-mono text-[0.62rem] font-black" style={{ color: signal.accent, background: `${signal.accent}18` }}>
                {signal.metric}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-400">{signal.headline}</p>
          </motion.div>
        </AnimatePresence>
        <svg viewBox="0 0 320 120" className="h-28 w-full overflow-visible">
          <defs>
            <linearGradient id="heroProfitLine" x1="0" x2="1">
              <stop offset="0%" stopColor={signal.accent} />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
          </defs>
          {[24, 48, 72, 96].map((y) => <line key={y} x1="0" x2="320" y1={y} y2={y} stroke="rgba(255,255,255,.06)" />)}
          <path className="hero-profit-area" d="M0 96 C38 82 58 92 90 64 C124 34 156 54 190 40 C238 20 272 36 320 16 L320 120 L0 120 Z" fill="rgba(56,189,248,.10)" />
          <path className="hero-profit-line" d="M0 96 C38 82 58 92 90 64 C124 34 156 54 190 40 C238 20 272 36 320 16" fill="none" stroke="url(#heroProfitLine)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="hero-mini-stack absolute right-[8vw] bottom-[10%] hidden w-[320px] space-y-3">
        <AnimatePresence mode="popLayout">
          {[signal, ...heroCapabilities.filter((item) => item.label !== signal.label).slice(0, 2)].map((item, index) => (
            <motion.div
              key={item.label}
              className="hero-mini-card rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-md"
              style={{ animationDelay: `${index * 0.22}s` }}
              initial={{ opacity: 0, x: 18 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -18 }}
              transition={{ duration: 0.35, delay: index * 0.05 }}
            >
              <div className="text-[0.58rem] uppercase tracking-[0.18em] text-slate-500">{item.metric}</div>
              <div className="mt-1 font-mono text-lg font-black" style={{ color: item.accent }}>{item.value}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ModuleBackdrop({ type, accent }: { type: string; accent: string }) {
  const fragments =
    type === "ecom"
      ? ["PAYOUT MATCH", "BANK SETTLEMENT", "SKU CLAIM", "GST VARIANCE"]
      : type === "gst"
        ? ["2B LEDGER", "ITC BLOCK", "VENDOR RISK", "HSN DRIFT"]
        : type === "profit"
          ? ["COGS DRIFT", "RETURN COST", "AD ROAS", "SKU MARGIN"]
          : type === "tax"
            ? ["AIS", "TIS", "FORM 16", "BANK RECEIPT"]
            : ["BUDGET", "FORECAST", "RUNWAY", "LEDGER AUDIT"];

  return (
    <div className="module-backdrop pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute right-[5vw] top-10 h-72 w-72 rounded-full blur-[110px]" style={{ background: `${accent}18` }} />
      <div className="absolute left-[4vw] top-1/3 h-52 w-52 rounded-full blur-[100px]" style={{ background: `${accent}10` }} />
      <div className="floating-fragments">
        {fragments.map((item, index) => (
          <span
            key={item}
            className="floating-fragment"
            style={{
              color: accent,
              left: `${10 + index * 21}%`,
              top: `${16 + (index % 2) * 58}%`,
              animationDelay: `${index * 0.7}s`,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ModuleVisual({ type, accent }: { type: string; accent: string }) {
  if (type === "ecom") {
    return (
      <div className="capability-shell w-full max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">Marketplace Control</div>
            <div className="mt-1 text-sm font-bold text-white">Payout vs Bank Reconciliation</div>
          </div>
          <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[0.65rem] text-cyan-200">LIVE</div>
        </div>
        <div className="grid gap-4 p-5 md:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-3">
            {[
              ["Amazon", "Matched", "INR 18.4L", "94%"],
              ["Flipkart", "Claim Hold", "INR 6.8L", "62%"],
              ["Shopify", "Bank Settled", "INR 9.1L", "87%"],
              ["Meesho", "GST Variance", "INR 2.4L", "48%"],
            ].map(([name, status, value, width], index) => (
              <div key={name} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-white">{name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider ${index === 0 || index === 2 ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="animated-bar h-full rounded-full" style={{ width, background: `linear-gradient(90deg, ${accent}, #10B981)` }} />
                  </div>
                  <span className="font-mono text-[0.68rem] text-slate-400">{value}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="relative min-h-[260px] rounded-3xl border border-white/10 bg-black/60 p-4">
            <div className="absolute inset-x-7 top-1/2 h-px bg-cyan-300/20" />
            {["Report", "Payout", "Bank", "Claim"].map((node, index) => (
              <div
                key={node}
                className="data-node absolute flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-center text-[0.58rem] font-black uppercase tracking-wider text-cyan-100"
                style={{
                  left: index % 2 === 0 ? "12%" : "58%",
                  top: `${10 + index * 21}%`,
                  animationDelay: `${index * 0.25}s`,
                }}
              >
                {node}
              </div>
            ))}
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-3">
              <div className="text-[0.58rem] uppercase tracking-wider text-rose-200">Leakage flagged</div>
              <div className="mt-1 font-mono text-2xl font-black text-rose-200">INR 2.41L</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "gst") {
    return (
      <div className="capability-shell w-full max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">India ITC Heatmap</div>
            <div className="mt-1 text-sm font-bold text-white">Vendor Filing Risk by Region</div>
          </div>
          <div className="font-mono text-xs text-violet-200">GSTR-2B</div>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[0.95fr_1.05fr]">
          <div className="india-heatmap rounded-3xl border border-white/10 bg-black/55 p-4">
            {[
              ["DL", 4], ["RJ", 2], ["UP", 3], ["GJ", 1], ["MP", 2],
              ["MH", 4], ["KA", 3], ["TN", 2], ["TG", 1], ["WB", 3],
              ["KL", 2], ["PB", 1],
            ].map(([state, level], index) => (
              <div
                key={state}
                className={`heat-cell heat-${level}`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                {state}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[
              ["Vendor filed late", "43 invoices", "#F59E0B"],
              ["ITC blocked", "INR 8.6L", "#F43F5E"],
              ["Ready to claim", "INR 31.2L", "#10B981"],
            ].map(([label, value, color], index) => (
              <div key={`${label}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="text-[0.62rem] uppercase tracking-wider text-slate-500">{label}</div>
                <div className="mt-1 font-mono text-xl font-black" style={{ color }}>{value}</div>
              </div>
            ))}
            <div className="rounded-2xl border border-violet-300/20 bg-violet-400/10 p-4">
              <div className="mb-3 flex items-center justify-between text-[0.62rem] uppercase tracking-wider text-violet-200">
                <span>Evidence pack readiness</span><span>91%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="animated-bar h-full w-[91%] rounded-full bg-violet-300" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (type === "profit") {
    return (
      <div className="capability-shell w-full max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">SKU Margin Radar</div>
          <div className="mt-1 text-sm font-bold text-white">Returns, COGS, claims and ad spend in one view</div>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[285px] rounded-3xl border border-white/10 bg-black/55 p-4">
            <svg viewBox="0 0 320 220" className="h-full w-full overflow-visible">
              <defs>
                <linearGradient id="marginFill" x1="0" x2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="0.16" />
                </linearGradient>
              </defs>
              {[40, 70, 100].map((r) => (
                <circle key={r} cx="160" cy="112" r={r} fill="none" stroke="rgba(255,255,255,.08)" />
              ))}
              {["Returns", "COGS", "Ads", "Claims", "Margin"].map((label, index) => {
                const angle = (-90 + index * 72) * (Math.PI / 180);
                return (
                  <text key={`${label}-${index}`} x={160 + Math.cos(angle) * 126} y={116 + Math.sin(angle) * 118} textAnchor="middle" fill="rgba(203,213,225,.65)" fontSize="10" fontWeight="700">
                    {label}
                  </text>
                );
              })}
              <polygon className="radar-polygon" points="160,30 241,88 219,178 105,184 78,92" fill="url(#marginFill)" stroke={accent} strokeWidth="2" />
            </svg>
            <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3">
              <div className="text-[0.62rem] uppercase tracking-wider text-emerald-200">Margin recovered</div>
              <div className="mt-1 font-mono text-2xl font-black text-emerald-200">INR 7.8L</div>
            </div>
          </div>
          <div className="space-y-3">
            {[
              ["COGS drift", "12.4%", "#F43F5E"],
              ["Return leakage", "6.8%", "#F59E0B"],
              ["Ad ROAS", "3.1x", "#38BDF8"],
              ["Weighted margin", "28.6%", "#10B981"],
            ].map(([label, value, color], index) => (
              <div key={`${label}-${index}`} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <span className="text-sm text-slate-300">{label}</span>
                <span className="font-mono text-lg font-black" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (type === "tax") {
    return (
      <div className="capability-shell w-full max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">Evidence Assembly</div>
          <div className="mt-1 text-sm font-bold text-white">AIS, TIS, Form 16, bank receipts and books</div>
        </div>
        <div className="p-5">
          <div className="relative mb-5 min-h-[230px] rounded-3xl border border-white/10 bg-black/55 p-4">
            <div className="absolute bottom-10 left-10 top-10 w-px bg-gradient-to-b from-violet-300/0 via-violet-300/40 to-violet-300/0" />
            {[
              ["AIS import", "Matched PAN credits"],
              ["TIS check", "Income head aligned"],
              ["Form 16", "3 remediation tasks"],
              ["Bank proof", "Receipts attached"],
            ].map(([title, body], index) => (
              <div key={title} className="evidence-row relative ml-10 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-3" style={{ animationDelay: `${index * 0.16}s` }}>
                <span className="absolute -left-[2.85rem] h-3 w-3 rounded-full bg-violet-300 shadow-[0_0_18px_rgba(167,139,250,.75)]" />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{title}</div>
                  <div className="mt-0.5 text-xs text-slate-500">{body}</div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[0.58rem] font-bold text-emerald-300">READY</span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {["Audit trail", "Export pack", "Review queue"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3 text-center text-xs font-bold text-slate-300">{item}</div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="capability-shell w-full max-w-[520px]" style={{ "--accent": accent } as CSSProperties}>
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div>
          <div className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-slate-500">CFO Command Layer</div>
          <div className="mt-1 text-sm font-bold text-white">Cashflow forecast, budget grid and variance signals</div>
        </div>
        <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 font-mono text-[0.65rem] text-cyan-200">90D</div>
      </div>
      <div className="grid gap-5 p-5 md:grid-cols-[1.2fr_0.8fr]">
        <div className="relative min-h-[285px] rounded-3xl border border-white/10 bg-black/55 p-4">
          <svg viewBox="0 0 360 220" className="h-full w-full overflow-visible">
            <defs>
              <linearGradient id="cashGlow" x1="0" x2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#A78BFA" />
              </linearGradient>
            </defs>
            {[45, 90, 135, 180].map((y) => <line key={y} x1="18" x2="342" y1={y} y2={y} stroke="rgba(255,255,255,.07)" />)}
            <path className="forecast-area" d="M20 180 C70 150 90 168 125 128 C160 84 190 108 220 78 C265 36 305 58 340 34 L340 205 L20 205 Z" fill="rgba(56,189,248,.10)" />
            <path className="forecast-line" d="M20 180 C70 150 90 168 125 128 C160 84 190 108 220 78 C265 36 305 58 340 34" fill="none" stroke="url(#cashGlow)" strokeWidth="4" strokeLinecap="round" />
            <path d="M20 155 C84 128 116 148 152 112 C190 76 236 108 270 74 C300 44 322 64 340 52" fill="none" stroke="rgba(16,185,129,.55)" strokeWidth="2" strokeDasharray="5 8" />
          </svg>
          <div className="absolute left-5 top-5 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
            <div className="text-[0.55rem] uppercase tracking-wider text-cyan-200">Cash runway</div>
            <div className="font-mono text-xl font-black text-cyan-100">14 mo</div>
          </div>
        </div>
        <div className="space-y-3">
          {[
            ["Budget variance", "+8.2%", "#10B981"],
            ["Burn alert", "Stable", "#38BDF8"],
            ["Ledger audit", "12 flags", "#F59E0B"],
            ["CFO chat", "Ready", "#A78BFA"],
          ].map(([label, value, color], index) => (
            <div key={`${label}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="text-[0.62rem] uppercase tracking-wider text-slate-500">{label}</div>
              <div className="mt-1 font-mono text-xl font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
