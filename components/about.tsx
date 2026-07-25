import { Code2, GraduationCap, Users2, Trophy, HeartHandshake } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Card, CardContent } from "@/components/ui/card";

const PILLARS = [
  {
    icon: Code2,
    title: "Coding Culture",
    description:
      "Weekly practice sessions and rated contests that keep problem-solving a habit, not a once-a-semester scramble.",
  },
  {
    icon: GraduationCap,
    title: "Learning",
    description:
      "Structured tracks across DSA, web development, and core CS fundamentals, built for every branch and year.",
  },
  {
    icon: Users2,
    title: "Mentorship",
    description:
      "Seniors and alumni pair with juniors for contest strategy, resume reviews, and interview preparation.",
  },
  {
    icon: Trophy,
    title: "Hackathons",
    description:
      "Team-based build sprints that turn coursework into shipped projects, judged by faculty and industry mentors.",
  },
  {
    icon: HeartHandshake,
    title: "Community Building",
    description:
      "A chapter that feels like a place to belong first — events, meetups, and a community that shows up for each other.",
  },
];

export function About() {
  return (
    <section id="about" className="section-pad">
      <div className="container">
        <SectionHeading
          eyebrow="About"
          title="A campus-first chapter, built by students, for students."
          description="The IKGPTU chapter exists to give every student — regardless of branch or year — a structured, supportive path into serious software engineering. We organize the practice, mentorship, and events; members bring the effort."
        />

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => (
            <Card key={pillar.title} className="transition-shadow hover:shadow-raised">
              <CardContent>
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-400">
                  <pillar.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-medium">{pillar.title}</h3>
                <p className="mt-2 text-sm text-ink-500 dark:text-white/60">
                  {pillar.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
