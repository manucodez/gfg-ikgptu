"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Pencil, Trash2, Maximize2, KeyRound, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar } from "@/components/members/avatar";
import { MemberForm } from "@/components/admin/member-form";
import { cn } from "@/lib/utils";
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
  const [savingOrder, setSavingOrder] = useState(false);

  // MouseSensor covers mouse/trackpad with a small move-distance
  // threshold (so a plain click on the handle doesn't register as a
  // drag). TouchSensor is configured separately with a short
  // press-and-hold delay instead — the standard way to let a touch
  // scroll gesture and a drag gesture coexist on the same element
  // without one accidentally triggering the other. KeyboardSensor
  // makes the same reordering possible with Tab + Space + arrow keys.
  //
  // Deliberately MouseSensor here, not PointerSensor: PointerSensor
  // also receives touch input (it's built on the Pointer Events API,
  // which unifies mouse/touch/pen), so pairing it with TouchSensor
  // means both sensors race to claim the same touch — on a phone the
  // 8px-distance PointerSensor constraint tends to win before
  // TouchSensor's 200ms hold delay ever gets a chance, which is what
  // was breaking dragging on mobile. MouseSensor only ever receives
  // mouse events, so it can't collide with TouchSensor this way.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!members || !over || active.id === over.id) return;

    const oldIndex = members.findIndex((m) => m.id === active.id);
    const newIndex = members.findIndex((m) => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistic update — reorder locally immediately so dragging
    // feels instant, then persist; roll back by reloading from the
    // server if the save actually fails.
    const reordered = arrayMove(members, oldIndex, newIndex);
    setMembers(reordered);

    setSavingOrder(true);
    const res = await fetch("/api/admin/members/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((m) => m.id) }),
    });
    setSavingOrder(false);
    if (!res.ok) load();
  }

  if (!members) return <p className="text-sm text-ink-500 dark:text-white/50">Loading members...</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-500 dark:text-white/50">
          {members.length} members
          {savingOrder && <span className="ml-2 text-brand-600 dark:text-brand-400">Saving order...</span>}
        </p>
        {!adding && (
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Add member
          </Button>
        )}
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink-500 dark:text-white/40">
        <GripVertical className="h-3.5 w-3.5 shrink-0" />
        Drag the handle on any member to change the order they appear in on the site.
      </p>

      {adding && (
        <MemberForm
          onDone={() => {
            setAdding(false);
            load();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={members.map((m) => m.id)} strategy={rectSortingStrategy}>
          <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,360px),1fr))] gap-3">
            {members.map((member) => {
              const credential = credentialStatuses[member.id];
              return editingId === member.id ? (
                <div key={member.id} className="col-span-full">
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
                <SortableMemberRow
                  key={member.id}
                  member={member}
                  credential={credential}
                  onEdit={() => setEditingId(member.id)}
                  onDelete={() => handleDelete(member.id)}
                  onViewAvatar={() => member.avatar && setViewingAvatarOf(member)}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Dialog open={!!viewingAvatarOf} onOpenChange={(open) => !open && setViewingAvatarOf(null)}>
        {viewingAvatarOf && (
          <DialogContent className="sm:max-w-md">
            <div className="p-6">
              <DialogTitle className="break-words pr-6 font-display text-lg font-medium">
                {viewingAvatarOf.name}&apos;s photo
              </DialogTitle>
              <div className="mt-4 flex justify-center">
                <Avatar
                  name={viewingAvatarOf.name}
                  avatar={viewingAvatarOf.avatar}
                  size={260}
                  className="shadow-raised"
                />
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

interface SortableMemberRowProps {
  member: Member;
  credential?: CredentialStatus;
  onEdit: () => void;
  onDelete: () => void;
  onViewAvatar: () => void;
}

function SortableMemberRow({ member, credential, onEdit, onDelete, onViewAvatar }: SortableMemberRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: member.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 overflow-hidden rounded-2xl border border-ink-900/10 bg-white p-3 dark:border-white/10 dark:bg-surface-darkRaised sm:p-4",
        isDragging && "relative z-10 opacity-60 shadow-raised"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag to reorder ${member.name}`}
        className="flex h-10 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-lg text-ink-400 hover:bg-ink-900/5 active:cursor-grabbing dark:text-white/30 dark:hover:bg-white/10"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <button
        type="button"
        onClick={onViewAvatar}
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
        onClick={onEdit}
        aria-label={`Edit ${member.name}`}
        className="rounded-full p-2.5 text-ink-500 hover:bg-ink-900/5 dark:text-white/50 dark:hover:bg-white/10"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${member.name}`}
        className="rounded-full p-2.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
