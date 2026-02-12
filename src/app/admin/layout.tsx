import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "project.irfanbayu@gmail.com";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  // Verify admin email
  const user = await currentUser();
  const primaryEmail = user?.emailAddresses.find(
    (e) => e.id === user.primaryEmailAddressId,
  )?.emailAddress;

  if (primaryEmail !== ADMIN_EMAIL) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Admin Header */}
      <header className="border-b border-white/10 bg-gray-900/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">
              SUN 6 BKS <span className="text-sun6bks-gold">Admin</span>
            </h1>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="/admin"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Dashboard
            </a>
            <a
              href="/admin/events"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Events
            </a>
            <a
              href="/admin/transactions"
              className="text-sm text-gray-400 transition-colors hover:text-white"
            >
              Transaksi
            </a>
            <a
              href="/"
              className="text-sm text-gray-500 transition-colors hover:text-gray-300"
            >
              Ke Website
            </a>
          </nav>
        </div>
      </header>

      {/* Admin Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
