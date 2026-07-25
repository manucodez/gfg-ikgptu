import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { Announcement } from "@/components/announcement";
import { Stats } from "@/components/stats";
import { About } from "@/components/about";
import { MemberSection } from "@/components/members/member-section";
import { GallerySection } from "@/components/gallery/gallery-section";
import { EventsSection } from "@/components/events/events-section";
import { AchievementsSection } from "@/components/achievements/achievements-section";
import { ContactSection } from "@/components/contact/contact-section";
import { Footer } from "@/components/footer";
import {
  getMembers,
  getEvents,
  getGalleryItems,
  getStats,
  getAchievements,
} from "@/lib/content-store";
import { getLoggedInMember } from "@/lib/current-member";

// Content (members/events/gallery/stats/achievements) now lives in
// /content/*.json and can change at runtime via the admin dashboard,
// so this page reads it fresh on every request instead of being
// statically generated at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [members, events, galleryItems, stats, achievements, loggedInMember] =
    await Promise.all([
      getMembers(),
      getEvents(),
      getGalleryItems(),
      getStats(),
      getAchievements(),
      getLoggedInMember(),
    ]);

  const notifyEvents = events.filter((e) => e.notifyOnHomepage);

  return (
    <>
      <Navbar loggedInMember={loggedInMember} />
      <main>
        <Hero members={members} eventCount={events.length} />
        <Announcement events={notifyEvents} />
        <Stats stats={stats} />
        <About />
        <MemberSection members={members} />
        <GallerySection galleryItems={galleryItems} />
        <EventsSection events={events} />
        <AchievementsSection achievements={achievements} />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
