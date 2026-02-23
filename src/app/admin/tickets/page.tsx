import { getAdminTickets } from "@/actions/admin-tickets";
import { AdminTicketsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const tickets = await getAdminTickets();

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Daftar Tiket</h2>
      <AdminTicketsClient tickets={tickets} />
    </div>
  );
}
