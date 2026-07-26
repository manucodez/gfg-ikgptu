"use client";

import { useState } from "react";
import { Github, Instagram, Linkedin, Send, CheckCircle2 } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const SOCIALS = [
  { icon: Github, label: "GitHub", href: "https://github.com/" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com/" },
  { icon: Instagram, label: "Instagram", href: "https://instagram.com/" },
];

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = e.currentTarget;
    const data = new FormData(form);

    const res = await fetch("/api/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        email: data.get("email"),
        branch: data.get("branch"),
        year: data.get("year"),
        message: data.get("message"),
      }),
    });

    if (res.ok) {
      setSubmitted(true);
    } else {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Something went wrong — please try again.");
    }
    setSubmitting(false);
  }

  return (
    <section id="contact" className="section-pad">
      <div className="container grid gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            eyebrow="Join"
            title="Want in? Tell us a little about you."
            description="Open to every branch and year — no prior competitive programming experience required."
          />

          <div className="mt-8 flex gap-3">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={social.label}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink-900/10 text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-white/20 dark:text-white/70"
              >
                <social.icon className="h-4.5 w-4.5" />
              </a>
            ))}
          </div>

          <div className="mt-8 card-surface p-5">
            <p className="text-sm text-ink-500 dark:text-white/60">
              Prefer email? Reach the core team directly at{" "}
              <a href="mailto:gfgikgptu@gmail.com" className="font-medium text-brand-700 dark:text-brand-400">
                gfgikgptu@gmail.com
              </a>
            </p>
          </div>
        </div>

        <div className="card-surface p-6 sm:p-8">
          {submitted ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
              <CheckCircle2 className="h-9 w-9 text-brand-600 dark:text-brand-400" />
              <p className="font-display text-lg font-medium">Request received</p>
              <p className="max-w-xs text-sm text-ink-500 dark:text-white/60">
                A core team member will follow up over email within a few days.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="name" placeholder="Full name" required />
                <Input name="email" type="email" placeholder="College email" required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input name="branch" placeholder="Branch (e.g. B.Tech CSE)" required />
                <Input name="year" placeholder="Year (e.g. 2nd Year)" required />
              </div>
              <Textarea
                name="message"
                placeholder="What would you like to contribute or learn?"
                rows={4}
              />
              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-400">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Sending..." : "Submit"} <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
