"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Maximize2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/members/avatar";
import { MemberForm } from "@/components/admin/member-form";
import { Member } from "@/lib/types";

interface CredentialStatus {
  hasPassword: boolean;
  passwordUpdatedAt: string;
}

export function MembersPanel() {
  const [members, setMembers] = useState<Member[] | null>(null);
  const [credentialStatuses, setCredentialStatuses] = useState<Record<string, CredentialStatus>>({});
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAvatarOf, setViewingAvatarOf] = useState<Member | null>(null);

  async function load() {
    const [membersRes, credentialsRes] = await Promise.all([
      fetch("/api/admin/members"),
      fetch("/api/admin/members/credential-status"),
    ]);
    setMembers(await membersRes.json());
    setCredentialStatuses(await credentialsRes.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Remove this member from the site?")) return;
    await fetch(`/api/admin/members/${id}`, { method: "DELETE" });
    load();
  }

  if (!members) return <p className="text-sm text-ink-500 dark:text-white/50">Loading members...</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-white/50">{members.length} members</p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        )}
      </div>

      {adding && (
        <MemberForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => {
          const credential = credentialStatuses[member.id];
          return editingId === member.id ? (
            <div key={member.id} className="sm:col-span-2">
              <MemberForm
                initial={member}
                credential={credential}
                onDone={() => {
                  setEditingId(null);
                  load();
                }}
                onCancel={() => setEditingId(null)}
              />
            </div>
          ) : (
            <div
              key={member.id}
              className="flex items-center gap-3 rounded-2xl border border-ink-900/10 p-4 dark:border-white/10"
            >
              <button
                type="button"
                onClick={() => member.avatar && setViewingAvatarOf(member)}
                aria-label={member.avatar ? `View ${member.name}'s photo` : `${member.name} has no photo`}
                className={member.avatar ? "group relative shrink-0 rounded-full" : "shrink-0 cursor-default"}
              >
                <Avatar name={member.name} avatar={member.avatar} size={44} />
                {member.avatar && (
                  <span className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-full bg-ink-900/0 text-white opacity-0 transition-all group-hover:bg-ink-900/40 group-hover:opacity-100">
                    <Maximize2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.name}</p>
                <p className="truncate text-xs text-ink-500 dark:text-white/50">
                  {member.role} · {member.team}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-ink-500 dark:text-white/40">
                  <KeyRound className="h-3 w-3" />
                  {credential?.hasPassword
                    ? `Password set · ${new Date(credential.passwordUpdatedAt).toLocaleDateString()}`
                    : "No password set yet"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingId(member.id)}
                aria-label={`Edit ${member.name}`}
                className="rounded-full p-2 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(member.id)}
                aria-label={`Remove ${member.name}`}
                className="rounded-full p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={!!viewingAvatarOf} onOpenChange={(open) => !open && setViewingAvatarOf(null)}>
        {viewingAvatarOf && (
          <DialogContent className="sm:max-w-md">
            <div className="p-6">
              <DialogTitle className="font-display text-lg font-medium">
                {viewingAvatarOf.name}&apos;s photo
              </DialogTitle>
              <div className="mt-4 flex justify-center">
                <Avatar name={viewingAvatarOf.name} avatar={viewingAvatarOf.avatar} size={260} className="shadow-raised" />
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
