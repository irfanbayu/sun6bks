import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ensureUserProfile } from "@/actions/user";
import { getUserRole } from "@/lib/auth";
import RoleNavbar from "@/components/layout/RoleNavbar";

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
      <RoleNavbar
        title="Standupindo Bekasi Events"
        greeting={`Halo, ${displayName}`}
        links={[
          { href: "/user", label: "Dashboard" },
          { href: "/user/orders", label: "Pesanan" },
          { href: "/user/profile", label: "Profil" },
          { href: "/", label: "Ke Website", muted: true },
        ]}
      />

      {/* User Content */}
      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
