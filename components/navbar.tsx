"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { LogoMark } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/members/avatar";
import type { Member } from "@/lib/types";

const NAV_LINKS = [
  { href: "#about", label: "About" },
  { href: "#members", label: "Members" },
  { href: "#gallery", label: "Gallery" },
  { href: "#events", label: "Events" },
  { href: "#achievements", label: "Achievements" },
];

interface NavbarProps {
  /** The signed-in member, if the visitor has a valid member session. */
  loggedInMember?: Member | null;
}

export function Navbar({ loggedInMember }: NavbarProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-900/10 bg-paper dark:border-white/10 dark:bg-surface-dark">
      <div className="container flex h-16 items-center justify-between">
        <Link href="#home" className="flex items-center gap-2">
          <LogoMark className="h-8 w-auto" />
          <span className="font-display text-sm font-semibold leading-tight">
            GFG Campus Chapter
            <span className="block text-[11px] font-mono font-normal text-ink-500 dark:text-white/50">
              IKGPTU
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-ink-700 transition-colors hover:text-brand-600 dark:text-white/70 dark:hover:text-brand-400"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <ThemeToggle />
          {loggedInMember ? (
            <Link href="/dashboard" aria-label="Your profile" className="group">
              <Avatar
                name={loggedInMember.name}
                avatar={loggedInMember.avatar}
                size={36}
                className="ring-2 ring-transparent transition-all group-hover:ring-brand-400"
              />
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium text-ink-700 transition-colors hover:text-brand-600 dark:text-white/70 dark:hover:text-brand-400"
            >
              Login
            </Link>
          )}
          <Button
            size="sm"
            onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
          >
            Join Us
          </Button>
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink-900/10 dark:border-white/20"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-ink-900/10 bg-paper px-6 py-4 dark:border-white/10 dark:bg-surface-dark md:hidden">
          <div className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm text-ink-700 dark:text-white/70"
              >
                {link.label}
              </a>
            ))}
            {loggedInMember ? (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm font-medium text-ink-700 dark:text-white/70"
              >
                <Avatar name={loggedInMember.name} avatar={loggedInMember.avatar} size={28} />
                My profile
              </Link>
            ) : (
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-ink-700 dark:text-white/70"
              >
                Login
              </Link>
            )}
            <Button
              size="sm"
              onClick={() => {
                setOpen(false);
                document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Join Us
            </Button>
          </div>
        </nav>
      )}
    </header>
  );
}
