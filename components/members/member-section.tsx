"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/section-heading";
import { MemberFilters } from "@/components/members/member-filters";
import { MemberTile } from "@/components/members/member-tile";
import { MemberProfilePanel } from "@/components/members/member-profile-panel";
import { Member } from "@/lib/types";

interface MemberSectionProps {
  members: Member[];
}

export function MemberSection({ members }: MemberSectionProps) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [selected, setSelected] = useState<Member | null>(null);

  // Filter options are always derived from the members actually on
  // the page, so a team added (or renamed) in the admin dashboard
  // shows up here automatically — nothing to keep in sync by hand.
  const teams = useMemo(
    () => Array.from(new Set(members.map((m) => m.team))).sort(),
    [members]
  );
  const years = useMemo(
    () => Array.from(new Set(members.map((m) => m.year))),
    [members]
  );

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesQuery =
        query.trim() === "" ||
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.role.toLowerCase().includes(query.toLowerCase());
      const matchesTeam = team === "All" || m.team === team;
      const matchesYear = year === "All" || m.year === year;
      return matchesQuery && matchesTeam && matchesYear;
    });
  }, [members, query, team, year]);

  return (
    <section id="members" className="section-pad bg-white dark:bg-surface-darkRaised">
      <div className="container">
        <SectionHeading
          eyebrow="Members"
          title="The people running the chapter."
          description="Tap any profile for contact details, skills, and links. Filter by team or year to find someone specific."
        />

        <div className="mt-8">
          <MemberFilters
            query={query}
            onQueryChange={setQuery}
            team={team}
            onTeamChange={setTeam}
            teams={teams}
            years={years}
            year={year}
            onYearChange={setYear}
          />
        </div>

        <motion.div
          layout
          className="mt-10 flex flex-wrap justify-center gap-x-2 gap-y-5 sm:gap-x-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((member) => (
              <motion.div
                key={member.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.25 }}
              >
                <MemberTile member={member} onSelect={setSelected} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {filtered.length === 0 && (
          <p className="mt-10 text-center text-sm text-ink-500 dark:text-white/50">
            No members match those filters.
          </p>
        )}
      </div>

      <MemberProfilePanel member={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </section>
  );
}
