"use client";

import { motion } from "framer-motion";
import { ArrowRight, Users, CalendarDays, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/members/avatar";
import { Member } from "@/lib/types";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

interface HeroProps {
  members: Member[];
  eventCount: number;
}

export function Hero({ members, eventCount }: HeroProps) {
  const preview = members.slice(0, 5);
  const overflow = members.length - preview.length;

  return (
    <section id="home" className="relative overflow-hidden pt-20 sm:pt-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-gradient-to-b from-brand-100/70 via-transparent to-transparent dark:from-brand-900/25"
      />
      <div className="container grid gap-14 pb-20 sm:pb-28 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <p className="eyebrow">{"// GeeksforGeeks Student Chapter — IKGPTU"}</p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
            Where IKGPTU builds its next generation of engineers.
          </h1>
          <p className="mt-5 max-w-lg text-base text-ink-500 dark:text-white/60 sm:text-lg">
            We run the DSA practice, workshops, hackathons, and mentorship
            that turn first-year curiosity into placement-ready, contest-ready
            engineers — one campus, one community.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button onClick={() => scrollTo("contact")}>
              Join Us <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => scrollTo("members")}>
              Meet the Team
            </Button>
            <Button variant="ghost" onClick={() => scrollTo("events")}>
              Events
            </Button>
            <Button variant="ghost" onClick={() => scrollTo("gallery")}>
              Gallery
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
          className="relative mx-auto w-full max-w-sm"
        >
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">{"// the chapter"}</p>
              <span className="flex items-center gap-1 text-xs text-ink-500 dark:text-white/50">
                <Users className="h-3.5 w-3.5" /> {members.length} members
              </span>
            </div>
            <div className="mt-5 flex -space-x-3">
              {preview.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  className="ring-4 ring-white dark:ring-surface-darkRaised rounded-full"
                >
                  <Avatar name={m.name} avatar={m.avatar} size={56} />
                </motion.div>
              ))}
              {overflow > 0 && (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink-900/5 font-mono text-xs text-ink-500 ring-4 ring-white dark:bg-white/10 dark:text-white/60 dark:ring-surface-darkRaised">
                  +{overflow}
                </div>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <button
                type="button"
                onClick={() => scrollTo("events")}
                className="flex items-center gap-2 rounded-xl bg-ink-900/[0.03] px-3 py-2 text-left transition-colors hover:bg-ink-900/[0.06] dark:bg-white/5 dark:hover:bg-white/10"
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                {eventCount} events run
              </button>
              <button
                type="button"
                onClick={() => scrollTo("gallery")}
                className="flex items-center gap-2 rounded-xl bg-ink-900/[0.03] px-3 py-2 text-left transition-colors hover:bg-ink-900/[0.06] dark:bg-white/5 dark:hover:bg-white/10"
              >
                <Images className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
                Live gallery
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
