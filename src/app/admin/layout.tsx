import { auth } from "@clerk/nextjs/server";
import { UserButton } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import Link from "next/link";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Verify admin role from database
  const role = await getUserRole(userId);

  if (role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Admin Header */}
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">
              Standupindo Bekasi Events <span className="text-sun6bks-gold">Admin</span>
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <Link
              href="/admin"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/events"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Events
            </Link>
            <Link
              href="/admin/transactions"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Transaksi
            </Link>
            <Link
              href="/admin/users"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Users
            </Link>
            <Link
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Ke Website
            </Link>
            <UserButton afterSignOutUrl="/" />
          </nav>
        </div>
      </header>

      {/* Admin Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
