import { getAdminUsers } from "@/actions/admin-users";
import { AdminUsersClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await getAdminUsers();

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Kelola Users</h2>
      <AdminUsersClient users={users} />
    </div>
  );
}
