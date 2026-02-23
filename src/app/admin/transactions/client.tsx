"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  RefreshCw,
  ShieldCheck,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { recheckTransaction, manualOverride } from "@/actions/admin";

type Transaction = {
  id: number;
  orderId: string;
  status: string;
  amount: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  eventTitle: string;
  categoryName: string;
};

type AdminTransactionsClientProps = {
  transactions: Transaction[];
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string }
> = {
  pending: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  paid: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  expired: {
    icon: XCircle,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  refunded: {
    icon: AlertTriangle,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
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

export const AdminTransactionsClient = ({
  transactions,
}: AdminTransactionsClientProps) => {
  const router = useRouter();
  const [filter, setFilter] = useState<string>("all");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{
    orderId: string;
    message: string;
    success: boolean;
  } | null>(null);
  const [overrideOrderId, setOverrideOrderId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState("");

  const filteredTransactions =
    filter === "all"
      ? transactions
      : transactions.filter((t) => t.status === filter);

  const handleRecheck = async (orderId: string) => {
    setLoadingAction(`recheck-${orderId}`);
    setActionMessage(null);

    const result = await recheckTransaction(orderId);
    setActionMessage({
      orderId,
      message: result.message,
      success: result.success,
    });
    setLoadingAction(null);

    if (result.success) {
      router.refresh();
    }
  };

  const handleOverrideSubmit = async () => {
    if (!overrideOrderId) return;

    setLoadingAction(`override-${overrideOrderId}`);
    setActionMessage(null);

    const result = await manualOverride(overrideOrderId, overrideReason);
    setActionMessage({
      orderId: overrideOrderId,
      message: result.message,
      success: result.success,
    });
    setLoadingAction(null);

    if (result.success) {
      setOverrideOrderId(null);
      setOverrideReason("");
      router.refresh();
    }
  };

  return (
    <div>
      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "pending", "paid", "expired", "failed"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? "bg-sun6bks-gold text-sun6bks-dark"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {status === "all" ? "Semua" : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({transactions.filter((t) => t.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Override Modal */}
      {overrideOrderId && (
        <div className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <h3 className="font-bold text-yellow-400">
              Manual Override: {overrideOrderId}
            </h3>
          </div>
          <p className="mb-4 text-sm text-gray-400">
            Mengubah status transaksi ke PAID secara manual. Tindakan ini akan
            dicatat di audit log.
          </p>
          <textarea
            value={overrideReason}
            onChange={(e) => setOverrideReason(e.target.value)}
            placeholder="Alasan override (wajib, min 10 karakter). Contoh: Screenshot bukti transfer dari customer..."
            className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-gray-500 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/50"
            rows={3}
          />
          <div className="flex gap-3">
            <button
              onClick={handleOverrideSubmit}
              disabled={
                overrideReason.trim().length < 10 ||
                loadingAction === `override-${overrideOrderId}`
              }
              className="flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-bold text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingAction === `override-${overrideOrderId}` ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Konfirmasi Override
            </button>
            <button
              onClick={() => {
                setOverrideOrderId(null);
                setOverrideReason("");
              }}
              className="rounded-lg bg-white/10 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Order ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Event
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Amount
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Tanggal
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTransactions.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Tidak ada transaksi.
                </td>
              </tr>
            )}
            {filteredTransactions.map((t) => {
              const statusCfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusCfg.icon;

              return (
                <tr
                  key={t.orderId}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-white">
                      {t.orderId}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white">{t.eventTitle}</p>
                      <p className="text-xs text-gray-500">
                        {t.categoryName} x{t.quantity}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white">{t.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {t.customerEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {formatCurrency(t.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {t.status}
                    </span>
                    {/* Action message */}
                    {actionMessage?.orderId === t.orderId && (
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
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDate(t.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {/* Re-check button (for non-final statuses) */}
                      {t.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleRecheck(t.orderId)}
                            disabled={
                              loadingAction === `recheck-${t.orderId}`
                            }
                            className="flex items-center gap-1 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Re-check status via Midtrans API"
                          >
                            {loadingAction === `recheck-${t.orderId}` ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Re-check
                          </button>
                          <button
                            onClick={() => setOverrideOrderId(t.orderId)}
                            className="flex items-center gap-1 rounded-lg bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400 transition-colors hover:bg-yellow-500/20"
                            title="Manual override ke paid"
                          >
                            <ShieldCheck className="h-3 w-3" />
                            Override
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
