export const TAB_ITEMS = [
  { href: "/log", label: "Today" },
  { href: "/log/history", label: "Log" },
  { href: "/log/progress", label: "Progress" },
  { href: "/log/account", label: "Profile" },
] as const;

export function normalizePath(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

/** Workout entry is a full-screen form so the tab bar cannot cover fields or the keyboard. */
export function showTabBar(pathname: string): boolean {
  const path = normalizePath(pathname);
  return !path.startsWith("/log/new") && !path.startsWith("/log/edit");
}

export function activeTab(pathname: string): (typeof TAB_ITEMS)[number]["href"] | null {
  const path = normalizePath(pathname);
  if (path === "/log") return "/log";
  if (path.startsWith("/log/history")) return "/log/history";
  if (path.startsWith("/log/progress")) return "/log/progress";
  if (path.startsWith("/log/account") || path.startsWith("/log/backup")) return "/log/account";
  return null;
}
