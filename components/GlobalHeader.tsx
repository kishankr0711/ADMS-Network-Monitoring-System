"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, LogOut, Activity, Database } from "lucide-react";
import { useTheme } from "../components/ThemeProvider";

export interface ConnectionStatus {
  label: string;
  type: "ssh" | "oracle";
  connected: boolean | null;
}

interface GlobalHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  connections?: ConnectionStatus[];
}

export function GlobalHeader({
  title,
  subtitle,
  showBack = false,
  backHref = "/",
  connections = [],
}: GlobalHeaderProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth");
      localStorage.removeItem("user");
    }
    router.replace("/login");
  };

  const isDark = theme === "dark";

  return (
    <header
      className={`border-b sticky top-0 z-40 ${
        isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200"
      } backdrop-blur`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showBack && (
            <button
              onClick={() => router.push(backHref)}
              className={`p-2 rounded-lg transition-colors ${
                isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
              }`}
            >
              <span className="sr-only">Back</span>
              {/* Simple chevron using border to avoid extra icons */}
              <div
                className={`w-2 h-2 border-l-2 border-b-2 ${
                  isDark ? "border-slate-300" : "border-slate-700"
                } rotate-45`}
              />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
              AD
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-semibold">{title}</h1>
              {subtitle && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {connections.length > 0 && (
            <div className="hidden sm:flex items-center gap-3 pr-2 border-r border-slate-200 dark:border-slate-700">
              {connections.map((conn) => {
                const color =
                  conn.connected === null
                    ? "bg-slate-400"
                    : conn.connected
                    ? "bg-emerald-500"
                    : "bg-red-500";
                const label =
                  conn.connected === null
                    ? "Checking…"
                    : conn.connected
                    ? "Connected"
                    : "Disconnected";
                const Icon = conn.type === "oracle" ? Database : Activity;
                return (
                  <div
                    key={conn.type}
                    className="flex items-center gap-2 rounded-full px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
                  >
                    <span className={`w-2 h-2 rounded-full ${color}`} />
                    <Icon className="w-3 h-3 text-slate-500" />
                    <span className="font-medium text-slate-600 dark:text-slate-300">
                      {conn.label}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-slate-800" : "hover:bg-slate-100"
            }`}
          >
            {isDark ? (
              <Sun className="w-4 h-4 text-yellow-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600" />
            )}
          </button>

          <button
            onClick={handleLogout}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-linear-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-sm"
          >
            <LogOut className="w-3 h-3" />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}

