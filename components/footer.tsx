import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-ink-900/10 py-10 dark:border-white/10">
      <div className="container flex flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-2">
          <Image
            src="/logo-mark.png"
            alt="GFG Campus Chapter, IKGPTU logo"
            width={642}
            height={506}
            className="h-7 w-auto"
          />
          <p className="text-sm text-ink-500 dark:text-white/50">
            GeeksforGeeks Student Chapter · IKGPTU
          </p>
        </div>
        <p className="font-mono text-xs text-ink-500 dark:text-white/40">
          Designed & Developed by Manjeet
          <br />
          Co-Head, Technical Team · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}
