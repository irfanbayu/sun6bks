import { currentUser } from "@clerk/nextjs/server";
import { getUserProfile } from "@/actions/user";
import { UserProfile } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function UserProfilePage() {
  const user = await currentUser();
  const profile = await getUserProfile();

  if (!user) return null;

  const email =
    user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
      ?.emailAddress ?? "-";

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Profil Saya</h2>

      {/* Profile Info Card */}
      <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-6">
          {user.imageUrl && (
            <img
              src={user.imageUrl}
              alt={user.fullName ?? "User"}
              className="h-20 w-20 rounded-full border-2 border-sun6bks-gold/30 object-cover"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-white">
              {user.fullName ?? user.firstName ?? "User"}
            </h3>
            <p className="mt-1 text-sm text-gray-400">{email}</p>
            <span className="mt-2 inline-block rounded-full bg-sun6bks-gold/10 px-3 py-1 text-xs font-medium text-sun6bks-gold">
              {profile?.role ?? "USER"}
            </span>
          </div>
        </div>
      </div>

      {/* Clerk User Profile Component */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h3 className="mb-4 text-lg font-bold text-white">Kelola Akun</h3>
        <UserProfile
          appearance={{
            elements: {
              rootBox: "w-full",
              card: "bg-transparent shadow-none border-0",
              navbar: "hidden",
              pageScrollBox: "p-0",
              headerTitle: "text-white",
              headerSubtitle: "text-gray-400",
              formFieldLabel: "text-gray-300",
              formFieldInput:
                "bg-white/5 border-white/10 text-white",
              formButtonPrimary:
                "bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange text-sun6bks-dark font-bold",
              profileSectionTitle: "text-white",
              profileSectionContent: "text-gray-300",
              profileSectionPrimaryButton: "text-sun6bks-gold",
            },
          }}
        />
      </div>
    </div>
  );
}
