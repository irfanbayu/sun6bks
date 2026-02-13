import { getOrderDetail } from "@/actions/user";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";

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
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
};

type InvoicePageProps = {
  params: { orderId: string };
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { orderId } = params;
  const order = await getOrderDetail(orderId);

  if (!order || order.status !== "paid") {
    notFound();
  }

  const pricePerTicket = order.ticket_categories?.price ?? 0;

  return (
    <div>
      {/* Header Actions */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/user/orders"
          className="flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Pesanan
        </Link>
        <a
          href={`/api/user/orders/${orderId}/invoice`}
          download
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-5 py-2.5 text-sm font-bold text-sun6bks-dark transition-opacity hover:opacity-90"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      {/* Invoice Preview */}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-8">
        {/* Invoice Header */}
        <div className="mb-8 flex items-start justify-between border-b border-white/10 pb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">INVOICE</h1>
            <p className="mt-1 text-sm text-gray-400">
              #{order.midtrans_order_id}
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-sun6bks-gold">SUN 6 BKS</h2>
            <p className="text-sm text-gray-400">Standupindo Bekasi</p>
          </div>
        </div>

        {/* Customer & Date */}
        <div className="mb-8 grid grid-cols-2 gap-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Ditagihkan Kepada
            </p>
            <p className="mt-2 font-semibold text-white">
              {order.customer_name}
            </p>
            <p className="text-sm text-gray-400">{order.customer_email}</p>
            <p className="text-sm text-gray-400">{order.customer_phone}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
              Tanggal Pembayaran
            </p>
            <p className="mt-2 text-sm text-white">
              {order.paid_at ? formatDateTime(order.paid_at) : "-"}
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </p>
            <span className="mt-1 inline-block rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
              LUNAS
            </span>
          </div>
        </div>

        {/* Event Details */}
        <div className="mb-8 rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
            Event
          </p>
          <p className="mt-1 font-semibold text-white">
            {order.events?.title ?? "Event"}
          </p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-400">
            <span>
              {order.events?.date ? formatDate(order.events.date) : "-"}
            </span>
            <span>{order.events?.time_label ?? ""}</span>
            <span>{order.events?.venue ?? ""}</span>
          </div>
          {order.events?.venue_address && (
            <p className="mt-1 text-xs text-gray-500">
              {order.events.venue_address}
            </p>
          )}
        </div>

        {/* Items Table */}
        <div className="mb-8">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="pb-3">Item</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Harga</th>
                <th className="pb-3 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5">
                <td className="py-4">
                  <p className="font-medium text-white">
                    Tiket {order.ticket_categories?.name ?? "-"}
                  </p>
                  <p className="text-sm text-gray-400">
                    {order.events?.title ?? "Event"}
                  </p>
                </td>
                <td className="py-4 text-center text-gray-300">
                  {order.quantity}
                </td>
                <td className="py-4 text-right text-gray-300">
                  {formatCurrency(pricePerTicket)}
                </td>
                <td className="py-4 text-right font-medium text-white">
                  {formatCurrency(order.amount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Total */}
        <div className="flex justify-end border-t border-white/10 pt-4">
          <div className="w-64">
            <div className="flex justify-between py-2 text-sm text-gray-400">
              <span>Subtotal</span>
              <span>{formatCurrency(order.amount)}</span>
            </div>
            <div className="flex justify-between border-t border-white/10 py-3 text-lg font-bold">
              <span className="text-white">Total</span>
              <span className="text-sun6bks-gold">
                {formatCurrency(order.amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Ticket Codes */}
        {order.tickets.length > 0 && (
          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-gray-500">
              Kode Tiket
            </p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {order.tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-lg bg-sun6bks-gold/5 px-4 py-3"
                >
                  <span className="font-mono text-sm text-sun6bks-gold">
                    {ticket.ticket_code}
                  </span>
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-400">
                    {ticket.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-white/10 pt-6 text-center text-xs text-gray-500">
          <p>Terima kasih telah membeli tiket di SUN 6 BKS!</p>
          <p className="mt-1">
            Dokumen ini merupakan bukti pembayaran yang sah.
          </p>
        </div>
      </div>
    </div>
  );
}
