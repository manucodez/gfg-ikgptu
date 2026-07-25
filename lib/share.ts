import type { ChapterEvent } from "@/lib/types";

/**
 * The chapter's standard share caption for an event — pulls together
 * everything shown on the event tile: title, date, location,
 * description, and tags, plus a GFG/chapter sign-off and links.
 */
export function buildEventShareText(event: ChapterEvent, shareUrl: string): string {
  const hashtags = ["#GeeksforGeeks", "#GFGStudentChapter", "#IKGPTU", ...event.tags.map((t) => `#${t.replace(/[^a-zA-Z0-9]/g, "")}`)]
    .filter((tag) => tag.length > 1)
    .join(" ");

  return [
    `📢 ${event.title}`,
    ``,
    `📅 ${event.date}`,
    `📍 ${event.location}`,
    ``,
    event.description,
    ``,
    `— GFG Student Chapter, IKGPTU`,
    event.registrationUrl ? `🔗 Register: ${event.registrationUrl}` : null,
    `ℹ️ Details: ${shareUrl}`,
    ``,
    hashtags,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export interface ShareResult {
  /** "shared" — the device's native share sheet opened and the person
   *  picked an app. "copied" — the browser has no native share sheet
   *  (e.g. most desktop browsers), so the caption was copied to the
   *  clipboard instead. "cancelled" — the person closed the native
   *  share sheet themselves. "failed" — nothing worked (e.g.
   *  clipboard permission denied). */
  status: "shared" | "copied" | "cancelled" | "failed";
  message: string;
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens the device's native share sheet for an event — whatever apps
 * are installed (WhatsApp, Instagram, Mail, Messages, etc.) show up
 * there for the person to pick from directly, so there's no separate
 * in-app menu to choose an app/format from first. Falls back to
 * copying the caption to the clipboard on browsers without share-sheet
 * support (most desktop browsers).
 */
export async function shareEvent(event: ChapterEvent, shareUrl: string): Promise<ShareResult> {
  const text = buildEventShareText(event, shareUrl);

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title: event.title, text, url: shareUrl });
      return { status: "shared", message: "Shared!" };
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { status: "cancelled", message: "" };
      }
      // Anything else — permission denied, etc. — falls through to
      // the clipboard fallback below.
    }
  }

  const copied = await copyToClipboard(text);
  if (!copied) {
    return { status: "failed", message: "Couldn't copy automatically — please copy the link manually." };
  }
  return { status: "copied", message: "Copied to your clipboard — paste it anywhere to share." };
}
