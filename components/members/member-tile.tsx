"use client";

import { motion } from "framer-motion";
import { Avatar } from "@/components/members/avatar";
import { Member } from "@/lib/types";

interface MemberTileProps {
  member: Member;
  onSelect: (member: Member) => void;
}

/** A single watch-launcher-style tile: circular avatar, name and
 *  role revealed on hover/focus (desktop) or shown as a caption
 *  under the tile (touch), tapping opens the full profile panel. */
export function MemberTile({ member, onSelect }: MemberTileProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(member)}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="group flex flex-col items-center gap-2 rounded-2xl p-2 text-center focus-visible:outline-none"
    >
      <div className="relative">
        <Avatar
          name={member.name}
          avatar={member.avatar}
          size={84}
          className="shadow-soft ring-2 ring-transparent transition-all group-hover:ring-brand-400 group-focus-visible:ring-brand-400"
        />
        <div className="pointer-events-none absolute inset-0 hidden items-end justify-center rounded-full bg-ink-900/70 opacity-0 transition-opacity group-hover:flex group-hover:opacity-100">
          <span className="mb-2 px-1 text-[10px] font-medium leading-tight text-white">
            {member.role}
          </span>
        </div>
      </div>
      <div className="max-w-[92px]">
        <p className="truncate text-xs font-medium">{member.name}</p>
        <p className="truncate text-[11px] text-ink-500 dark:text-white/50">{member.role}</p>
      </div>
    </motion.button>
  );
}
