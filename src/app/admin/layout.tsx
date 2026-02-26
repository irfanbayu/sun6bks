import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getUserRole } from "@/lib/auth";
import RoleNavbar from "@/components/layout/RoleNavbar";

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
      <RoleNavbar
        title="Standupindo Bekasi Events"
        badge="Admin"
        links={[
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/events", label: "Events" },
          { href: "/admin/transactions", label: "Transaksi" },
          { href: "/admin/tickets", label: "Tiket" },
          { href: "/admin/checkin", label: "Check-in" },
          { href: "/admin/users", label: "Users" },
          { href: "/", label: "Ke Website", muted: true },
        ]}
      />

      {/* Admin Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
