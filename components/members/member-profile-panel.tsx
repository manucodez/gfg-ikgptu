"use client";

import { Github, Linkedin, Mail, Globe, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Avatar } from "@/components/members/avatar";
import { Badge } from "@/components/ui/badge";
import { isValidEmail, isValidUrl } from "@/lib/validation";
import { Member } from "@/lib/types";

interface MemberProfilePanelProps {
  member: Member | null;
  onOpenChange: (open: boolean) => void;
}

export function MemberProfilePanel({ member, onOpenChange }: MemberProfilePanelProps) {
  const github = member?.socials.github;
  const linkedin = member?.socials.linkedin;
  const portfolio = member?.socials.portfolio;
  const email = member?.socials.email;

  const hasGithub = !!github && isValidUrl(github);
  const hasLinkedin = !!linkedin && isValidUrl(linkedin);
  const hasPortfolio = !!portfolio && isValidUrl(portfolio);
  const hasEmail = !!email && isValidEmail(email);
  const hasAnyLink = hasGithub || hasLinkedin || hasPortfolio || hasEmail;

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      {member && (
        <DialogContent>
          <div className="p-6">
            <div className="flex items-center gap-4 pr-6">
              <Avatar name={member.name} avatar={member.avatar} size={72} className="shadow-soft" />
              <div className="min-w-0">
                <DialogTitle className="break-words font-display text-xl font-medium">
                  {member.name}
                </DialogTitle>
                <DialogDescription className="text-sm text-ink-500 dark:text-white/60">
                  {member.role} · {member.team}
                </DialogDescription>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 dark:text-white/50">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {member.branch} · {member.year}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-ink-700 dark:text-white/70">
              {member.bio}
            </p>

            <div className="mt-5">
              <p className="eyebrow">{"// skills"}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <Badge key={skill} tone="brand">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            {hasAnyLink && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-ink-900/10 pt-5 dark:border-white/10">
                {hasGithub && <SocialLink href={github!} icon={Github} label="GitHub" />}
                {hasLinkedin && <SocialLink href={linkedin!} icon={Linkedin} label="LinkedIn" />}
                {hasPortfolio && <SocialLink href={portfolio!} icon={Globe} label="Portfolio" />}
                {hasEmail && <SocialLink href={`mailto:${email}`} icon={Mail} label="Email" />}
              </div>
            )}
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}

function SocialLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Github;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-1.5 rounded-full border border-ink-900/10 px-3 py-1.5 text-xs font-medium text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-700 dark:border-white/20 dark:text-white/70 dark:hover:text-brand-400"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </a>
  );
}
