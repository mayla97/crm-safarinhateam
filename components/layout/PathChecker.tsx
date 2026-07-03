"use client";

import { usePathname } from "next/navigation";
import { LeadsProvider } from "@/components/leads/LeadsProvider";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

export function PathChecker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <LeadsProvider>
      <div className="min-h-screen bg-brand-surface">
        <Sidebar />
        <div className="pl-64">
          <Header />
          <main className="p-8">{children}</main>
        </div>
      </div>
    </LeadsProvider>
  );
}