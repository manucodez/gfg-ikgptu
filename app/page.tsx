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
  getPublicHomepageContent,
} from "@/lib/content-store";
import { getLoggedInMember } from "@/lib/current-member";

// This page reads the visitor's own login cookie (via
// getLoggedInMember, to personalize the navbar) on every request, so
// it can't be statically cached as a whole page — see the comment on
// getPublicHomepageContent in lib/content-store.ts for how the
// members/events/gallery/stats/achievements data it also needs is
// still cached, just underneath this per-request render rather than
// at the page level.
export const dynamic = "force-dynamic";

export default async function Home() {
  const [{ members, events, galleryItems, stats, achievements }, loggedInMember] =
    await Promise.all([
      getPublicHomepageContent(),
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
