"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SectionHeading } from "@/components/section-heading";
import { MemberFilters } from "@/components/members/member-filters";
import { MemberTile } from "@/components/members/member-tile";
import { MemberProfilePanel } from "@/components/members/member-profile-panel";
import { Member } from "@/lib/types";

interface MemberSectionProps {
  members: Member[];
}

// How many tiles sit in a "full" row at each viewport width — the row
// above/below it always has one fewer, and because both are centered
// within the same width, the shorter row's tiles land exactly in the
// gaps of the longer one. That's the entire trick behind the
// honeycomb look; see groupIntoHoneycombRows below. Listed widest
// breakpoint first since useHoneycombColumns picks the first match.
const COLUMN_BREAKPOINTS = [
  { minWidth: 1280, columns: 6 },
  { minWidth: 1024, columns: 5 },
  { minWidth: 768, columns: 4 },
  { minWidth: 480, columns: 3 },
  { minWidth: 0, columns: 2 },
];

function useHoneycombColumns() {
  // 3 matches the most common phone width — a sane, stable value for
  // the very first render (before we can measure the real viewport)
  // so there's no layout-breaking flash for the most common visitor.
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    function update() {
      const width = window.innerWidth;
      const match = COLUMN_BREAKPOINTS.find((bp) => width >= bp.minWidth);
      setColumns(match?.columns ?? 3);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return columns;
}

/** Groups items into rows that alternate between `columns` items and
 *  `columns - 1` items — see the honeycomb explanation above. The
 *  very last row is whatever's left over, even if that's fewer than
 *  the pattern calls for (it still centers fine on its own). */
function groupIntoHoneycombRows<T>(items: T[], columns: number): T[][] {
  if (columns <= 1) return items.map((item) => [item]);
  const rows: T[][] = [];
  let index = 0;
  let isFullRow = true;
  while (index < items.length) {
    const size = isFullRow ? columns : columns - 1;
    rows.push(items.slice(index, index + size));
    index += size;
    isFullRow = !isFullRow;
  }
  return rows;
}

export function MemberSection({ members }: MemberSectionProps) {
  const [query, setQuery] = useState("");
  const [team, setTeam] = useState<string>("All");
  const [year, setYear] = useState<string>("All");
  const [selected, setSelected] = useState<Member | null>(null);
  const columns = useHoneycombColumns();

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

  const rows = useMemo(() => groupIntoHoneycombRows(filtered, columns), [filtered, columns]);

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

        <AnimatePresence mode="wait">
          <motion.div
            key={`${team}-${year}-${columns}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-10 flex flex-col items-center gap-y-1 sm:gap-y-3"
          >
            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-x-2 sm:gap-x-4">
                {row.map((member) => (
                  <MemberTile key={member.id} member={member} onSelect={setSelected} />
                ))}
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

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
