import { Search } from "lucide-react";

interface MemberFiltersProps {
  query: string;
  onQueryChange: (value: string) => void;
  team: string;
  onTeamChange: (value: string) => void;
  teams: string[];
  years: string[];
  year: string;
  onYearChange: (value: string) => void;
}

// Team and year options are passed in, derived from the live member
// list (see member-section.tsx) rather than hardcoded here — a fixed
// list previously went stale against real data and broke filtering.
export function MemberFilters({
  query,
  onQueryChange,
  team,
  onTeamChange,
  teams,
  years,
  year,
  onYearChange,
}: MemberFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500 dark:text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search members..."
          className="h-10 w-full rounded-full border border-ink-900/10 bg-white pl-9 pr-4 text-sm outline-none transition-colors focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={team}
          onChange={(e) => onTeamChange(e.target.value)}
          className="h-10 rounded-full border border-ink-900/10 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised"
        >
          <option value="All">All teams</option>
          {teams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(e) => onYearChange(e.target.value)}
          className="h-10 rounded-full border border-ink-900/10 bg-white px-3 text-sm outline-none focus:border-brand-500 dark:border-white/20 dark:bg-surface-darkRaised"
        >
          <option value="All">All years</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
