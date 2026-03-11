

"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const PUBLIC_ROUTES = ["/login"];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authed" | "redirecting">("checking");

  useEffect(() => {
    // Allow login page without checks
    if (PUBLIC_ROUTES.includes(pathname || "")) {
      setStatus("authed");
      return;
    }

    const isAuth = typeof window !== "undefined" ? localStorage.getItem("auth") : null;

    if (isAuth !== "true") {
      setStatus("redirecting");
      router.replace("/login");
      return;
    }

    setStatus("authed");
  }, [pathname, router]);

  // While redirect is in progress — render absolutely nothing so the
  // protected page never flashes behind the spinner
  if (status === "redirecting") return null;

  // Still checking (first paint on server / hydration)
  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-sm text-slate-400">
          <div className="w-8 h-8 border-2 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
          <p>Checking access…</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}