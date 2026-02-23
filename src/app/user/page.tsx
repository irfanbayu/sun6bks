import { getUserLastOrder, getUserOrders } from "@/actions/user";
import { Ticket, ShoppingCart, CreditCard } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const formatDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  expired: "bg-gray-500/10 text-gray-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-blue-500/10 text-blue-400",
};

export default async function UserDashboardPage() {
  const [lastOrder, allOrders] = await Promise.all([
    getUserLastOrder(),
    getUserOrders(),
  ]);

  const totalOrders = allOrders.length;
  const paidOrders = allOrders.filter((o) => o.status === "paid");
  const totalSpent = paidOrders.reduce((sum, o) => sum + o.amount, 0);
  const totalTickets = paidOrders.reduce(
    (sum, o) => sum + o.tickets.length,
    0
  );

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Dashboard</h2>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <ShoppingCart className="h-4 w-4" />
            <span>Total Pesanan</span>
          </div>
          <p className="text-3xl font-bold text-blue-400">{totalOrders}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <CreditCard className="h-4 w-4" />
            <span>Total Pengeluaran</span>
          </div>
          <p className="text-3xl font-bold text-green-400">
            {formatCurrency(totalSpent)}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-400">
            <Ticket className="h-4 w-4" />
            <span>Tiket Aktif</span>
          </div>
          <p className="text-3xl font-bold text-sun6bks-gold">{totalTickets}</p>
        </div>
      </div>

      {/* Last Order */}
      <div className="mb-8">
        <h3 className="mb-4 text-lg font-bold text-white">Pesanan Terakhir</h3>
        {lastOrder ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-white">
                  {lastOrder.events?.title ?? "Event"}
                </p>
                <p className="mt-1 text-sm text-gray-400">
                  {lastOrder.ticket_categories?.name} &bull;{" "}
                  {lastOrder.quantity} tiket
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDate(lastOrder.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-sun6bks-gold">
                  {formatCurrency(lastOrder.amount)}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_COLORS[lastOrder.status] ?? STATUS_COLORS.pending
                  }`}
                >
                  {lastOrder.status.toUpperCase()}
                </span>
              </div>
            </div>
            {lastOrder.status === "paid" && (
              <div className="mt-4 flex gap-3">
                <Link
                  href={`/user/orders/${lastOrder.midtrans_order_id}/invoice`}
                  className="rounded-lg border border-sun6bks-gold/30 bg-sun6bks-gold/10 px-4 py-2 text-sm font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20"
                >
                  Lihat Invoice
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <p className="text-gray-400">Belum ada pesanan.</p>
            <Link
              href="/"
              className="mt-3 inline-block rounded-lg bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-6 py-2 text-sm font-bold text-sun6bks-dark"
            >
              Beli Tiket
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          href="/user/orders"
          className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-sun6bks-gold/30 hover:bg-white/10"
        >
          <h3 className="mb-2 text-lg font-bold text-white">
            Riwayat Pesanan
          </h3>
          <p className="text-sm text-gray-400">
            Lihat semua pesanan dan unduh invoice.
          </p>
        </Link>
        <Link
          href="/user/profile"
          className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-sun6bks-gold/30 hover:bg-white/10"
        >
          <h3 className="mb-2 text-lg font-bold text-white">Profil Saya</h3>
          <p className="text-sm text-gray-400">
            Lihat dan kelola informasi profil Anda.
          </p>
        </Link>
      </div>
    </div>
  );
}
