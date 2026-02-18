import { auth, currentUser } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { ensureUserProfile } from "@/actions/user";
import { getUserRole } from "@/lib/auth";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Redirect admin to admin dashboard
  const role = await getUserRole(userId);
  if (role === "ADMIN") {
    redirect("/admin");
  }

  // Ensure profile exists in Supabase (creates if missing)
  await ensureUserProfile();

  const user = await currentUser();
  const displayName = user?.fullName ?? user?.firstName ?? "User";

  return (
    <div className="min-h-screen bg-gray-950">
      {/* User Header */}
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xl font-bold text-white">
              Standupindo Bekasi Events
            </a>
            <span className="text-sm text-gray-500">|</span>
            <span className="text-sm text-gray-400">
              Halo, <span className="text-sun6bks-gold">{displayName}</span>
            </span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="/user"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Dashboard
            </a>
            <a
              href="/user/orders"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Pesanan
            </a>
            <a
              href="/user/profile"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Profil
            </a>
            <a
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Ke Website
            </a>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>

      {/* User Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
