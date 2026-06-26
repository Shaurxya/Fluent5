"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  BarChart3,
  RotateCcw,
  GraduationCap,
  User,
  Settings,
  PanelLeftClose,
  Sparkles,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/supabase/types";

const navItems = [
  { href: "/app", label: "Today", icon: LayoutDashboard },
  { href: "/app/activities", label: "Activities", icon: Layers },
  { href: "/app/progress", label: "Progress", icon: BarChart3 },
  { href: "/app/review", label: "Review", icon: RotateCcw },
  { href: "/app/test", label: "Tests", icon: GraduationCap },
  { href: "/app/profile", label: "Profile", icon: User },
  { href: "/app/account", label: "Account", icon: Settings },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data as Profile);
      }
    }
    loadProfile();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground relative overflow-hidden">
      {/* Background Glow Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#2B5BFF]/10 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[30%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none z-0" />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-background border-r border-white/5 flex flex-col transition-all duration-300 relative z-20 items-center overflow-visible",
          isCollapsed ? "w-[72px]" : "w-[260px] items-stretch",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0 lg:static"
        )}
      >
        {/* Brand Lockup */}
        <div className={cn("flex transition-all w-full", isCollapsed ? "flex-col items-center pt-5 pb-2 gap-2" : "items-center justify-between py-5 px-6")}>
          {!isCollapsed && (
            <Link href="/app" className="flex items-center gap-2 overflow-hidden">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 text-accent flex-shrink-0" />
                <span className="text-xl font-bold tracking-tight text-text-primary whitespace-nowrap">
                  FluentFive
                </span>
              </div>
            </Link>
          )}
          {isCollapsed && (
            <Link href="/app" className="flex items-center justify-center w-full pb-2">
              <Sparkles className="w-6 h-6 text-accent flex-shrink-0" />
            </Link>
          )}
          
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "text-text-muted hover:text-text-secondary hidden lg:flex items-center justify-center transition-all",
              isCollapsed ? "w-12 h-12 rounded-lg hover:bg-surface-raised/30" : "w-6 h-6"
            )}
          >
            <PanelLeftClose className={cn("transition-transform", isCollapsed ? "w-[22px] h-[22px] rotate-180" : "w-4 h-4")} />
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            className={cn("lg:hidden p-1 text-text-muted hover:text-text-secondary transition-colors", isCollapsed && "hidden")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation List */}
        <nav className={cn("flex-1 py-4 flex flex-col gap-2 overflow-y-auto w-full", isCollapsed && "scrollbar-none")}>
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={cn(
                  "group relative flex items-center py-2 outline-none w-full",
                  isCollapsed ? "justify-center" : "gap-3 px-6"
                )}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 bg-accent rounded-r-full transition-all", isCollapsed ? "w-[4px] h-8" : "w-[3px] h-3/5")} />
                )}
                
                <div className={cn(
                  "flex items-center rounded-lg transition-all duration-200",
                  isCollapsed ? "justify-center w-12 h-12" : "gap-3 flex-1 px-3 py-2",
                  isActive 
                    ? "text-accent bg-surface-raised/50" 
                    : "text-text-muted hover:text-text-secondary hover:bg-surface-raised/30"
                )}>
                  <item.icon className={cn("flex-shrink-0 transition-all", isCollapsed ? "w-[22px] h-[22px]" : "w-[18px] h-[18px]")} />
                  {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* User Card (Pinned Bottom) */}
        <div className={cn("transition-all duration-300 w-full mt-auto", isCollapsed ? "p-2 flex justify-center pb-6" : "p-4 pb-6")}>
          <div className={cn(
            "bg-background border border-white/20 flex flex-col shadow-sm relative transition-all duration-300 overflow-hidden",
            isCollapsed ? "rounded-[20px] p-2 items-center justify-center gap-3 w-14" : "rounded-3xl p-5 gap-5 w-full"
          )}>
            <div className="relative z-10 flex items-center gap-3">
              <div className={cn("rounded-xl bg-accent flex items-center justify-center text-accent-foreground font-semibold shadow-sm shrink-0 transition-all", isCollapsed ? "w-9 h-9 text-sm" : "w-10 h-10 text-base")}>
                {(profile?.display_name || "U")[0].toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-text-primary truncate">
                    {profile?.display_name || "User"}
                  </div>
                  <div className="text-xs text-text-muted truncate mt-0.5">
                    {profile?.display_name?.toLowerCase().replace(/\s/g, '')}@example.com
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleSignOut}
                className="relative z-10 flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-xl border border-white/10 bg-background text-text-primary text-sm font-medium hover:bg-surface-raised transition-all"
              >
                <LogOut className="w-4 h-4" />
                Log out
              </button>
            )}
            
            {isCollapsed && (
              <button
                onClick={handleSignOut}
                title="Log out"
                className="relative z-10 flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-background text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Top Bar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-background">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-text-muted hover:text-text-secondary transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent" />
            <span className="text-base font-bold text-text-primary">FluentFive</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[1200px] mx-auto p-6 lg:p-10 lg:pt-12">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
