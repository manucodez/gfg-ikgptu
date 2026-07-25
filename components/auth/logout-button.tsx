"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LogoutButtonProps {
  endpoint: "/api/auth/logout" | "/api/admin/logout";
  redirectTo: string;
  variant?: "primary" | "secondary" | "ghost" | "outline";
}

export function LogoutButton({ endpoint, redirectTo, variant = "outline" }: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch(endpoint, { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <Button variant={variant} size="sm" onClick={handleLogout} disabled={loading}>
      <LogOut className="h-4 w-4" /> {loading ? "Signing out..." : "Sign out"}
    </Button>
  );
}
