"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  Lock,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const modules = [
  ["Ecommerce Reconciliation", "Match marketplace payouts, bank settlements, SKU leakage and dispute packs.", ReceiptText],
  ["GST Recon Engine", "Cross-check purchase books with GSTR-2B and export exception evidence.", Zap],
  ["Profit Cockpit", "Track SKU economics, returns, COGS drift and revenue leakage.", CircleDollarSign],
  ["Direct Tax Recon", "Unify AIS, TIS, Form 16, bank receipts and remediation tasks.", FileCheck2],
  ["Virtual CFO OS", "Run budgets, forecasts, variance reports, ledger audits and CFO chat locally.", Bot],
] as const;

const pains = [
  "Marketplace reports do not match payouts.",
  "GST credits get blocked due to vendor filing gaps.",
  "SKU margins disappear because of returns, COGS and claims.",
  "Tax evidence is scattered across AIS, TIS, Form 16, bank receipts and books.",
  "Teams waste hours preparing audit packs manually.",
];

const workflow = ["Upload data", "Reconcile", "Review exceptions", "Generate evidence", "Export audit pack"];

const trust = [
  "Local-first processing",
  "Export-ready evidence packs",
  "Audit trail",
  "Role-based review",
  "Built for finance and tax teams",
];

export default function AuthPage() {
  const rootRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (reduceMotion) return;

    const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    let cleanup = () => {};
    const run = async () => {
      const gsapModule = await import("gsap");
      const scrollTriggerModule = await import("gsap/ScrollTrigger");
      const gsap = gsapModule.gsap;
      const ScrollTrigger = scrollTriggerModule.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      // Public marketing page scroll reveals are initialized here.
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>(".public-reveal").forEach((item) => {
          gsap.fromTo(
            item,
            { opacity: 0, y: 48, filter: "blur(14px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: { trigger: item, start: "top 78%", once: true },
            }
          );
        });

        gsap.to(".atmosphere-line", {
          xPercent: 24,
          yPercent: -8,
          ease: "none",
          scrollTrigger: { trigger: rootRef.current, start: "top top", end: "bottom top", scrub: 1 },
        });
      }, rootRef);

      cleanup = () => ctx.revert();
    };
    run();

    return () => {
      cleanup();
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduceMotion]);

  return (
    <main ref={rootRef} className="relative min-h-screen overflow-hidden bg-[#05070B] text-[#F8FAFC]">
      <MarketingAtmosphere />
      <nav className="fixed left-0 right-0 top-0 z-50 border-b border-white/8 bg-[#05070B]/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#8B5CF6]">
              <ShieldCheck className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-black tracking-[-0.03em]">CLIENT</span>
          </div>
          <a href="#signin" className="rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white">
            Login
          </a>
        </div>
      </nav>

      <HeroSection />
      <PainSection />
      <WorkflowSection />
      <ModulesSection />
      <TrustSection />
      <FinalCtaSection />
      <SignInSection />
    </main>
  );
}

function MarketingAtmosphere() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.2),transparent_30%),radial-gradient(circle_at_80%_40%,rgba(34,211,238,0.10),transparent_30%)]" />
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:92px_92px]" />
      <div className="atmosphere-line absolute left-[-20%] top-[18%] h-40 w-[140%] rotate-[-12deg] rounded-full bg-[linear-gradient(90deg,transparent,rgba(139,92,246,0.18),rgba(34,211,238,0.08),transparent)] blur-2xl" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,#05070B_88%)]" />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative z-10 flex min-h-screen items-center px-5 pb-24 pt-28 sm:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1fr_0.82fr]">
        <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
          <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
            <Sparkles className="h-4 w-4 text-[#22D3EE]" />
            <span className="text-xs font-bold tracking-[0.22em] text-[#94A3B8]">AI-POWERED FINANCE SUITE V3.0</span>
          </div>
          <h1 className="max-w-5xl text-[clamp(3.4rem,8vw,7.8rem)] font-black leading-[0.88] tracking-[-0.055em]">
            One command layer for finance, tax and reconciliation.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-[#94A3B8]">
            Reconcile GST credits, marketplace payouts, tax evidence, SKU margins and cash flow from one audit-ready finance suite.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#signin" className="rounded-full bg-[#F8FAFC] px-6 py-3 font-bold text-[#05070B]">Book Demo</a>
            <a href="#modules" className="rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 font-bold text-white">Explore Modules</a>
          </div>
        </motion.div>

        <CommandCoreVisual />
      </div>
    </section>
  );
}

function CommandCoreVisual() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
      <div className="absolute inset-0 rounded-full border border-white/10 bg-[#0B1018]/60 shadow-[0_0_140px_rgba(34,211,238,0.14)]" />
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 36, repeat: Infinity, ease: "linear" }} className="absolute inset-10 rounded-full border border-dashed border-white/12" />
      <motion.div animate={{ rotate: -360 }} transition={{ duration: 46, repeat: Infinity, ease: "linear" }} className="absolute inset-24 rounded-full border border-[#8B5CF6]/25" />
      <div className="absolute inset-36 rounded-full bg-[radial-gradient(circle,rgba(248,250,252,0.28),rgba(34,211,238,0.16)_42%,transparent_70%)]" />
      {["GST", "AIS", "SKU", "TDS", "COGS"].map((item, index) => (
        <span
          key={item}
          className="absolute rounded-full border border-white/10 bg-[#111827]/80 px-3 py-1 text-xs font-semibold text-[#94A3B8]"
          style={{
            left: `${50 + Math.cos((index / 5) * Math.PI * 2) * 39}%`,
            top: `${50 + Math.sin((index / 5) * Math.PI * 2) * 39}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          {item}
        </span>
      ))}
    </div>
  );
}

function PainSection() {
  return (
    <section className="relative z-10 px-5 py-28 sm:px-8">
      <div className="public-reveal mx-auto max-w-5xl">
        <p className="mb-5 text-sm font-bold text-[#22D3EE]">The operational drag</p>
        <h2 className="max-w-4xl text-[clamp(2.4rem,5vw,5rem)] font-black leading-[0.94] tracking-[-0.04em]">
          Finance teams are reconciling fragments, not systems.
        </h2>
        <div className="mt-12 grid gap-4">
          {pains.map((pain) => (
            <div key={pain} className="border-b border-[#1F2937] py-5 text-xl text-[#CBD5E1]">
              {pain}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowSection() {
  return (
    <section className="relative z-10 px-5 py-28 sm:px-8">
      <div className="public-reveal mx-auto max-w-6xl">
        <p className="mb-5 text-sm font-bold text-[#22D3EE]">Workflow</p>
        <h2 className="text-[clamp(2.3rem,5vw,4.8rem)] font-black leading-none tracking-[-0.04em]">From raw files to audit pack.</h2>
        <div className="mt-14 grid gap-4 md:grid-cols-5">
          {workflow.map((step, index) => (
            <div key={step} className="relative rounded-3xl border border-[#1F2937] bg-[#0B1018]/80 p-6">
              <div className="mb-12 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#111827] text-[#22D3EE]">
                {index === 0 ? <UploadCloud size={20} /> : index === 4 ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
              </div>
              <p className="text-lg font-bold">{step}</p>
              {index < workflow.length - 1 && <div className="absolute right-[-1rem] top-1/2 hidden h-px w-8 bg-[#1F2937] md:block" />}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ModulesSection() {
  return (
    <section id="modules" className="relative z-10 px-5 py-28 sm:px-8">
      <div className="public-reveal mx-auto max-w-6xl">
        <p className="mb-5 text-sm font-bold text-[#22D3EE]">Modules</p>
        <h2 className="max-w-4xl text-[clamp(2.4rem,5vw,5rem)] font-black leading-[0.94] tracking-[-0.04em]">
          Five focused layers for finance control.
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(([title, copy, Icon]) => (
            <div key={title} className="rounded-[1.75rem] border border-[#1F2937] bg-[#0B1018]/80 p-6">
              <div className="mb-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-[#8B5CF6]">
                <Icon size={22} />
              </div>
              <h3 className="text-2xl font-black tracking-[-0.03em]">{title}</h3>
              <p className="mt-4 leading-7 text-[#94A3B8]">{copy}</p>
              <a href="#signin" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-[#22D3EE]">
                View module <ArrowRight size={16} />
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="relative z-10 px-5 py-28 sm:px-8">
      <div className="public-reveal mx-auto max-w-5xl rounded-[2rem] border border-[#1F2937] bg-[#0B1018]/72 p-8 sm:p-12">
        <p className="mb-5 text-sm font-bold text-[#22D3EE]">Trust layer</p>
        <div className="grid gap-5 md:grid-cols-5">
          {trust.map((item) => (
            <div key={item} className="flex gap-3 text-[#CBD5E1]">
              <Lock className="mt-1 h-4 w-4 shrink-0 text-[#8B5CF6]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCtaSection() {
  return (
    <section className="relative z-10 px-5 pb-20 pt-28 sm:px-8">
      <div className="public-reveal mx-auto max-w-5xl text-center">
        <h2 className="text-[clamp(2.8rem,6vw,6.6rem)] font-black leading-[0.86] tracking-[-0.055em]">
          Deploy your finance command layer.
        </h2>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a href="#signin" className="rounded-full bg-[#F8FAFC] px-6 py-3 font-bold text-[#05070B]">Book Demo</a>
          <a href="#signin" className="rounded-full border border-white/12 bg-white/[0.04] px-6 py-3 font-bold text-white">Join Waitlist</a>
        </div>
      </div>
    </section>
  );
}

function SignInSection() {
  return (
    <section id="signin" className="relative z-10 px-5 pb-28 sm:px-8">
      <div className="mx-auto max-w-md rounded-[1.5rem] border border-[#1F2937] bg-[#0B1018] p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#111827] text-[#8B5CF6]">
            <Lock size={22} />
          </div>
          <h2 className="text-2xl font-bold">Access CLIENT</h2>
          <p className="mt-2 text-sm text-[#94A3B8]">Sign in to your finance suite workspace.</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: "#8B5CF6",
                  brandAccent: "#7C3AED",
                  brandButtonText: "#F8FAFC",
                  inputBackground: "#111827",
                  inputBorder: "#1F2937",
                  inputText: "#F8FAFC",
                  inputPlaceholder: "#64748B",
                  messageText: "#94A3B8",
                  anchorTextColor: "#22D3EE",
                  dividerBackground: "#1F2937",
                },
                radii: {
                  inputBorderRadius: "10px",
                  buttonBorderRadius: "999px",
                },
              },
            },
          }}
          providers={["google"]}
          view="sign_up"
          redirectTo="https://tax-recon-saas.vercel.app"
        />
      </div>
    </section>
  );
}
