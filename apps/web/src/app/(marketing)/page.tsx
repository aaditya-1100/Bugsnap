import Link from "next/link";
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  EyeOff,
  Github,
  Lock,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Camera,
    title: "1. Snip or Capture",
    description:
      "Drag a box over any broken UI element or snap the full viewport. URL, browser, and viewport size are attached automatically.",
  },
  {
    icon: EyeOff,
    title: "2. Annotate & Redact",
    description:
      "Draw crisp arrows and highlights in the full-screen editor. Pixelate sensitive emails, tokens, or PII before upload.",
  },
  {
    icon: Sparkles,
    title: "3. AI Structure",
    description:
      "Convert raw screenshots and optional console errors into a clean, editable report separating observed facts from assumptions.",
  },
  {
    icon: Github,
    title: "4. Export to GitHub",
    description:
      "Review the AI draft, approve it, and create a developer-ready GitHub Issue with screenshot evidence in one click.",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle monochrome radial spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 h-[480px] bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.09),transparent_65%)]"
      />

      <div className="relative mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <section className="mx-auto max-w-3xl text-center">
          <Badge
            variant="secondary"
            className="mb-6 rounded-full border-[#2f3336] bg-[#16181c] px-3.5 py-1 text-xs text-[#e7e9ea]"
          >
            Privacy-first visual bug reporting
          </Badge>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl">
            From bug spotted to bug understood.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-[#71767b] sm:text-lg">
            Go from a screenshot to a clean, private, developer-ready GitHub
            issue in under two minutes. Built for indie developers, small teams,
            and agencies—without enterprise bloat.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button size="lg" className="rounded-full px-6" asChild>
              <Link href="/signup">
                Start free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-[#2f3336] bg-[#16181c] px-6 hover:bg-[#202327]"
              asChild
            >
              <Link href="/login">Open dashboard</Link>
            </Button>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#71767b]">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>
              No silent session replay · Client-side redaction · Least-privilege permissions
            </span>
          </div>
        </section>

        {/* Product Preview Card */}
        <section className="mt-16">
          <div className="overflow-hidden rounded-2xl border border-[#2f3336] bg-[#16181c] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2f3336] bg-black px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
              </div>
              <span className="font-mono text-[11px] text-[#71767b]">
                bugsnap.app / reports / #BS-104
              </span>
              <span className="rounded-full border border-[#2f3336] px-2 py-0.5 text-[10px] text-emerald-400">
                Exported to GitHub
              </span>
            </div>
            <div className="grid gap-6 p-6 md:grid-cols-5">
              <div className="flex flex-col justify-between rounded-xl border border-[#2f3336] bg-black p-4 md:col-span-3">
                <div className="flex items-center justify-between text-xs text-[#71767b]">
                  <span>Captured Viewport · 1440×900</span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-white">
                    2 Redactions Baked
                  </span>
                </div>
                <div className="my-6 space-y-3 rounded-lg border border-dashed border-[#2f3336] p-5">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-24 rounded bg-zinc-800" />
                    <span className="h-3 w-14 rounded bg-amber-400/30 ring-1 ring-amber-400" />
                  </div>
                  <div className="h-8 w-44 rounded-lg border border-amber-400 bg-amber-400/10 px-3 py-1.5 text-xs text-amber-300">
                    Checkout button unresponsive
                  </div>
                  <div className="h-4 w-36 rounded bg-zinc-800/80 blur-[2px]" />
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#71767b]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span>Console error attached: TypeError at checkout.ts:42</span>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-[#2f3336] bg-black p-4 md:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    AI Structured Draft
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-black">
                    Reviewed
                  </span>
                </div>
                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#71767b]">
                      Observed
                    </div>
                    <p className="mt-0.5 text-[#e7e9ea]">
                      Clicking &ldquo;Checkout&rdquo; throws a TypeError and
                      leaves the button disabled.
                    </p>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#71767b]">
                      Reproduction
                    </div>
                    <ol className="mt-0.5 list-decimal space-y-0.5 pl-4 text-[#71767b]">
                      <li>Open /checkout on Chrome 130</li>
                      <li>Click Checkout button</li>
                    </ol>
                  </div>
                </div>
                <div className="pt-2">
                  <div className="flex items-center justify-center gap-1.5 rounded-full bg-white py-2 text-xs font-semibold text-black">
                    <Github className="h-3.5 w-3.5" />
                    GitHub Issue #42 Created
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4-Step Workflow */}
        <section id="workflow" className="mt-24">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              One focused workflow
            </h2>
            <p className="mt-2 text-sm text-[#71767b]">
              No session replay tax. No bloated project-management suite.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <Card
                  key={step.title}
                  className="transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600"
                >
                  <CardContent className="pt-5">
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-[#2f3336] bg-black text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h3 className="text-sm font-semibold text-white">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[#71767b]">
                      {step.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Privacy & Speed Pillars */}
        <section id="security" className="mt-24">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-5">
                <Lock className="mb-3 h-5 w-5 text-white" />
                <h3 className="text-sm font-semibold text-white">
                  Privacy by default
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#71767b]">
                  Never collects cookies, passwords, or localStorage. Sensitive
                  areas are pixelated client-side before upload.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <Zap className="mb-3 h-5 w-5 text-white" />
                <h3 className="text-sm font-semibold text-white">
                  Under two minutes
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#71767b]">
                  Snip the exact bug, add an arrow, let AI structure the steps,
                  and ship straight to GitHub Issues.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <Github className="mb-3 h-5 w-5 text-white" />
                <h3 className="text-sm font-semibold text-white">
                  GitHub-first workflow
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#71767b]">
                  Share read-only links with clients or export reviewed tickets
                  directly into your team&apos;s repository.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
