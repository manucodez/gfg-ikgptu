"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MembersPanel } from "@/components/admin/members-panel";
import { EventsPanel } from "@/components/admin/events-panel";
import { GalleryPanel } from "@/components/admin/gallery-panel";
import { RequestsPanel } from "@/components/admin/requests-panel";
import { JoinRequestsPanel } from "@/components/admin/join-requests-panel";
import { LoginActivityPanel } from "@/components/admin/login-activity-panel";
import { StatsPanel } from "@/components/admin/stats-panel";
import { AchievementsPanel } from "@/components/admin/achievements-panel";
import { AdminsPanel } from "@/components/admin/admins-panel";

export function AdminDashboard() {
  const [pendingCount, setPendingCount] = useState(0);
  const [newJoinCount, setNewJoinCount] = useState(0);

  return (
    <Tabs defaultValue="requests">
      <TabsList>
        <TabsTrigger value="requests" className="flex items-center gap-1.5">
          Requests
          {pendingCount > 0 && (
            <span
              aria-label={`${pendingCount} pending ${pendingCount === 1 ? "request" : "requests"}`}
              className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 font-mono text-[11px] font-semibold text-white"
            >
              {pendingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="join-requests" className="flex items-center gap-1.5">
          Join Requests
          {newJoinCount > 0 && (
            <span
              aria-label={`${newJoinCount} new ${newJoinCount === 1 ? "submission" : "submissions"}`}
              className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1.5 font-mono text-[11px] font-semibold text-white"
            >
              {newJoinCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
        <TabsTrigger value="members">Members</TabsTrigger>
        <TabsTrigger value="events">Events</TabsTrigger>
        <TabsTrigger value="gallery">Gallery</TabsTrigger>
        <TabsTrigger value="stats">Stats</TabsTrigger>
        <TabsTrigger value="achievements">Achievements</TabsTrigger>
        <TabsTrigger value="admins">Admins</TabsTrigger>
      </TabsList>

      <TabsContent value="requests" className="mt-6">
        <RequestsPanel onPendingCountChange={setPendingCount} />
      </TabsContent>
      <TabsContent value="join-requests" className="mt-6">
        <JoinRequestsPanel onNewCountChange={setNewJoinCount} />
      </TabsContent>
      <TabsContent value="activity" className="mt-6">
        <LoginActivityPanel />
      </TabsContent>
      <TabsContent value="members" className="mt-6">
        <MembersPanel />
      </TabsContent>
      <TabsContent value="events" className="mt-6">
        <EventsPanel />
      </TabsContent>
      <TabsContent value="gallery" className="mt-6">
        <GalleryPanel />
      </TabsContent>
      <TabsContent value="stats" className="mt-6">
        <StatsPanel />
      </TabsContent>
      <TabsContent value="achievements" className="mt-6">
        <AchievementsPanel />
      </TabsContent>
      <TabsContent value="admins" className="mt-6">
        <AdminsPanel />
      </TabsContent>
    </Tabs>
  );
}
