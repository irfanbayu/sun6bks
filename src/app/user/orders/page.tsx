import { getUserOrders } from "@/actions/user";
import Link from "next/link";
import { FileText, ExternalLink } from "lucide-react";
import { RecheckButton } from "./client";

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

const STATUS_LABEL: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  expired: "bg-gray-500/10 text-gray-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-blue-500/10 text-blue-400",
};

export default async function UserOrdersPage() {
  const orders = await getUserOrders();

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Riwayat Pesanan</h2>

      {orders.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-lg text-gray-400">Belum ada pesanan.</p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-6 py-2 text-sm font-bold text-sun6bks-dark"
          >
            Beli Tiket Sekarang
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition-colors hover:border-white/20"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {order.events?.title ?? "Event"}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[order.status] ?? STATUS_COLORS.pending
                      }`}
                    >
                      {STATUS_LABEL[order.status] ?? order.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-400">
                    {order.ticket_categories?.name} &bull; {order.quantity} tiket
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Order ID: {order.midtrans_order_id}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatDate(order.created_at)}
                  </p>

                  {/* Ticket Codes */}
                  {order.status === "paid" && order.tickets.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {order.tickets.map((ticket) => (
                        <span
                          key={ticket.id}
                          className="rounded-md bg-sun6bks-gold/10 px-2 py-1 font-mono text-xs text-sun6bks-gold"
                        >
                          {ticket.ticket_code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Price & Actions */}
                <div className="flex flex-row items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
                  <p className="text-lg font-bold text-sun6bks-gold">
                    {formatCurrency(order.amount)}
                  </p>
                  {order.status === "paid" && (
                    <Link
                      href={`/user/orders/${order.midtrans_order_id}/invoice`}
                      className="flex items-center gap-1.5 rounded-lg border border-sun6bks-gold/30 bg-sun6bks-gold/10 px-3 py-1.5 text-xs font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Invoice
                    </Link>
                  )}
                  {order.status === "pending" && (
                    <>
                      {order.snap_redirect_url && (
                        <a
                          href={order.snap_redirect_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs font-medium text-yellow-400 transition-colors hover:bg-yellow-500/20"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Bayar
                        </a>
                      )}
                      <RecheckButton orderId={order.midtrans_order_id} />
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
