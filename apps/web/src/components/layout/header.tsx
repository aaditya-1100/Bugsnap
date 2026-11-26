import type { User } from "@/lib/types";
import { UserNav } from "./user-nav";

interface HeaderProps {
  title?: string;
  user: User | null;
}

export function Header({ title = "Workspace", user }: HeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-6 backdrop-blur-sm">
      <div className="text-sm font-medium text-zinc-300">{title}</div>
      <div className="flex items-center gap-3 md:hidden">
        <UserNav user={user} />
      </div>
    </header>
  );
}
