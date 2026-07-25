import { Trophy } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Achievement } from "@/lib/types";
import { formatDisplayDate } from "@/lib/utils";

interface AchievementsSectionProps {
  achievements: Achievement[];
}

export function AchievementsSection({ achievements }: AchievementsSectionProps) {
  return (
    <section id="achievements" className="section-pad">
      <div className="container">
        <SectionHeading
          eyebrow="Achievements"
          title="Chapter highlights, in order."
          description="A running record of wins and milestones — most recent first."
        />

        {achievements.length === 0 ? (
          <p className="mt-12 text-center text-sm text-ink-500 dark:text-white/50">
            No achievements posted yet.
          </p>
        ) : (
          <ol className="mt-12 space-y-8 border-l border-ink-900/10 pl-8 dark:border-white/20">
            {achievements.map((item) => (
              <li key={item.id} className="relative">
                <span className="absolute -left-[calc(2rem+5px)] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-white ring-4 ring-paper dark:ring-surface-dark">
                  <Trophy className="h-3 w-3" />
                </span>
                <p className="font-mono text-xs text-brand-600 dark:text-brand-400">{formatDisplayDate(item.date)}</p>
                <h3 className="mt-1 font-display text-lg font-medium">{item.title}</h3>
                <p className="mt-1 max-w-2xl text-sm text-ink-500 dark:text-white/60">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
