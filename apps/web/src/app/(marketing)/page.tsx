import Link from "next/link";
import {
  ArrowRight,
  Camera,
  EyeOff,
  Github,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    icon: Camera,
    title: "1. Capture",
    description:
      "Snap the visible viewport in one click from the Chrome side panel. URL, browser, and viewport size are attached automatically.",
  },
  {
    icon: EyeOff,
    title: "2. Annotate & Blur",
    description:
      "Draw rectangles, arrows, highlights, and text. Blur sensitive tokens, emails, or customer data before anything leaves your browser.",
  },
  {
    icon: Sparkles,
    title: "3. AI Structure",
    description:
      "Turn raw screenshots and optional console errors into a clean, editable report separating observed facts from assumptions.",
  },
  {
    icon: Github,
    title: "4. Export to GitHub",
    description:
      "Review the draft, approve it, and push a clean developer-ready GitHub Issue with screenshot evidence in one click.",
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
      <section className="mx-auto max-w-3xl text-center">
        <Badge variant="secondary" className="mb-5">
          Privacy-first visual bug reporting
        </Badge>
        <h1 className="text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          From bug spotted to bug understood.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-zinc-400 sm:text-lg">
          Go from a screenshot to a clean, private, developer-ready GitHub issue
          in under two minutes. Built for indie developers, small teams, and web
          agencies—without enterprise bloat.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">Open dashboard</Link>
          </Button>
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>
            No silent tracking. Client-side redaction before upload. Least-privilege permissions.
          </span>
        </div>
      </section>

      <section id="workflow" className="mt-24">
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100">
            One focused workflow
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            No session replay tax. No bloated project-management suite.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.title} className="border-zinc-800/70 bg-zinc-900/40">
                <CardContent className="pt-5">
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-black text-white">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
