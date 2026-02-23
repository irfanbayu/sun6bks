import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  // Fetch dashboard stats in parallel
  const [transactionsResult, paidResult, eventsResult, ticketsResult] =
    await Promise.all([
      supabaseAdmin
        .from("transactions")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("transactions")
        .select("amount")
        .eq("status", "paid"),
      supabaseAdmin
        .from("events")
        .select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  const totalTransactions = transactionsResult.count ?? 0;
  const totalRevenue =
    paidResult.data?.reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;
  const totalEvents = eventsResult.count ?? 0;
  const totalActiveTickets = ticketsResult.count ?? 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const stats = [
    {
      label: "Total Revenue",
      value: formatCurrency(totalRevenue),
      color: "text-green-400",
    },
    {
      label: "Total Transaksi",
      value: totalTransactions.toString(),
      color: "text-blue-400",
    },
    {
      label: "Events",
      value: totalEvents.toString(),
      color: "text-sun6bks-gold",
    },
    {
      label: "Tiket Aktif",
      value: totalActiveTickets.toString(),
      color: "text-purple-400",
    },
  ];

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Dashboard</h2>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-white/10 bg-white/5 p-6"
          >
            <p className="text-sm text-gray-400">{stat.label}</p>
            <p className={`mt-2 text-3xl font-bold ${stat.color}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-3">
        <a
          href="/admin/transactions"
          className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-sun6bks-gold/30 hover:bg-white/10"
        >
          <h3 className="mb-2 text-lg font-bold text-white">
            Kelola Transaksi
          </h3>
          <p className="text-sm text-gray-400">
            Lihat daftar transaksi, re-check status, atau manual override.
          </p>
        </a>
        <a
          href="/admin/events"
          className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-sun6bks-gold/30 hover:bg-white/10"
        >
          <h3 className="mb-2 text-lg font-bold text-white">
            Kelola Events
          </h3>
          <p className="text-sm text-gray-400">
            Tambah, edit, hapus events dan kategori tiket.
          </p>
        </a>
        <a
          href="/admin/users"
          className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-sun6bks-gold/30 hover:bg-white/10"
        >
          <h3 className="mb-2 text-lg font-bold text-white">
            Kelola Users
          </h3>
          <p className="text-sm text-gray-400">
            Promote / demote role user dan lihat daftar user terdaftar.
          </p>
        </a>
      </div>
    </div>
  );
}
