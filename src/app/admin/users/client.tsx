"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  ShieldOff,
  Loader2,
  Users,
  Search,
  ShieldCheck,
  User,
} from "lucide-react";
import { updateUserRole } from "@/actions/admin-users";
import type { AdminUserItem } from "@/actions/admin-users";
import type { UserRole } from "@/lib/supabase/types";

type AdminUsersClientProps = {
  users: AdminUserItem[];
};

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
};

export const AdminUsersClient = ({ users }: AdminUsersClientProps) => {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | UserRole>("all");
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    userId: string;
    message: string;
    success: boolean;
  } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    clerkUserId: string;
    name: string;
    newRole: UserRole;
  } | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesFilter = filter === "all" || u.role === filter;
    const matchesSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.clerk_user_id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const userCount = users.filter((u) => u.role === "USER").length;

  const handleRoleChange = async () => {
    if (!confirmAction) return;

    setLoadingUserId(confirmAction.clerkUserId);
    setActionMessage(null);

    const result = await updateUserRole(
      confirmAction.clerkUserId,
      confirmAction.newRole,
    );

    setActionMessage({
      userId: confirmAction.clerkUserId,
      message: result.message,
      success: result.success,
    });

    setLoadingUserId(null);
    setConfirmAction(null);

    if (result.success) {
      router.refresh();
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-400" />
            <p className="text-sm text-gray-400">Total Users</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-white">{users.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-sun6bks-gold" />
            <p className="text-sm text-gray-400">Admin</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-sun6bks-gold">
            {adminCount}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-blue-400" />
            <p className="text-sm text-gray-400">User</p>
          </div>
          <p className="mt-1 text-2xl font-bold text-blue-400">{userCount}</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau ID..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 sm:w-80"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "ADMIN", "USER"] as const).map((role) => (
            <button
              key={role}
              onClick={() => setFilter(role)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                filter === role
                  ? "bg-sun6bks-gold text-sun6bks-dark"
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {role === "all" ? "Semua" : role}
            </button>
          ))}
        </div>
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            {confirmAction.newRole === "ADMIN" ? (
              <Shield className="h-5 w-5 text-yellow-400" />
            ) : (
              <ShieldOff className="h-5 w-5 text-yellow-400" />
            )}
            <h3 className="font-bold text-yellow-400">
              Konfirmasi Perubahan Role
            </h3>
          </div>
          <p className="mb-4 text-sm text-gray-300">
            Apakah kamu yakin ingin mengubah role{" "}
            <span className="font-bold text-white">{confirmAction.name}</span>{" "}
            menjadi{" "}
            <span className="font-bold text-sun6bks-gold">
              {confirmAction.newRole}
            </span>
            ?
            {confirmAction.newRole === "ADMIN" && (
              <span className="mt-1 block text-xs text-yellow-400">
                User ini akan memiliki akses penuh ke panel admin.
              </span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRoleChange}
              disabled={loadingUserId === confirmAction.clerkUserId}
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingUserId === confirmAction.clerkUserId ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Ya, Ubah Role
            </button>
            <button
              onClick={() => setConfirmAction(null)}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                User
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Role
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Transaksi
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Terdaftar
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Tidak ada user ditemukan.
                </td>
              </tr>
            )}
            {filteredUsers.map((u) => (
              <tr
                key={u.clerk_user_id}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div>
                    <p className="font-medium text-white">
                      {u.name || "No name"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {u.email || "No email"}
                    </p>
                    <p className="font-mono text-[10px] text-gray-600">
                      {u.clerk_user_id}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      u.role === "ADMIN"
                        ? "bg-sun6bks-gold/10 text-sun6bks-gold"
                        : "bg-blue-400/10 text-blue-400"
                    }`}
                  >
                    {u.role === "ADMIN" ? (
                      <ShieldCheck className="h-3 w-3" />
                    ) : (
                      <User className="h-3 w-3" />
                    )}
                    {u.role}
                  </span>
                  {/* Action message */}
                  {actionMessage?.userId === u.clerk_user_id && (
                    <p
                      className={`mt-1 text-xs ${
                        actionMessage.success
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {actionMessage.message}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">
                  {u._transactionCount}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {formatDate(u.created_at)}
                </td>
                <td className="px-4 py-3">
                  {u.role === "ADMIN" ? (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          clerkUserId: u.clerk_user_id,
                          name: u.name || u.email || u.clerk_user_id,
                          newRole: "USER",
                        })
                      }
                      disabled={loadingUserId === u.clerk_user_id}
                      className="flex items-center gap-1 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Demote ke USER"
                    >
                      <ShieldOff className="h-3 w-3" />
                      Demote
                    </button>
                  ) : (
                    <button
                      onClick={() =>
                        setConfirmAction({
                          clerkUserId: u.clerk_user_id,
                          name: u.name || u.email || u.clerk_user_id,
                          newRole: "ADMIN",
                        })
                      }
                      disabled={loadingUserId === u.clerk_user_id}
                      className="flex items-center gap-1 rounded-lg bg-sun6bks-gold/10 px-3 py-1.5 text-xs text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Promote ke ADMIN"
                    >
                      <Shield className="h-3 w-3" />
                      Promote
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
