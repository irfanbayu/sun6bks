"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  Ticket,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";

type TransactionData = {
  orderId: string;
  status: "pending" | "paid" | "expired" | "failed" | "refunded";
  amount: number;
  quantity: number;
  customerName: string;
  customerEmail: string;
  paidAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  event: {
    title: string;
    venue: string;
    date: string;
    timeLabel: string;
  } | null;
  category: {
    name: string;
    price: number;
  } | null;
  tickets: { ticket_code: string; status: string }[];
};

const POLL_INTERVALS = [1000, 2000, 4000, 8000, 10000]; // exponential backoff
const MAX_POLLS = 60; // max 60 polls (~3 minutes total)

const PaymentConfirmationPage = () => {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [transaction, setTransaction] = useState<TransactionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const pollCountRef = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTransaction = useCallback(async (): Promise<TransactionData | null> => {
    try {
      const response = await fetch(`/api/transactions/${orderId}`);
      if (!response.ok) {
        if (response.status === 404) {
          setError("Transaksi tidak ditemukan.");
          return null;
        }
        throw new Error("Gagal memuat data transaksi.");
      }
      const data = (await response.json()) as TransactionData;
      return data;
    } catch (err) {
      console.error("[PaymentPage] Fetch error:", err);
      setError("Gagal memuat data transaksi. Coba refresh halaman.");
      return null;
    }
  }, [orderId]);

  const startPolling = useCallback(async () => {
    const data = await fetchTransaction();
    if (!data) {
      setIsLoading(false);
      return;
    }

    setTransaction(data);
    setIsLoading(false);

    // Stop polling if status is final
    const isFinal = ["paid", "expired", "failed", "refunded"].includes(
      data.status
    );
    if (isFinal || pollCountRef.current >= MAX_POLLS) {
      return;
    }

    // Schedule next poll with backoff
    const intervalIndex = Math.min(
      pollCountRef.current,
      POLL_INTERVALS.length - 1
    );
    const delay = POLL_INTERVALS[intervalIndex];
    pollCountRef.current += 1;

    timeoutRef.current = setTimeout(startPolling, delay);
  }, [fetchTransaction]);

  useEffect(() => {
    if (!orderId) return;

    pollCountRef.current = 0;
    startPolling();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [orderId, startPolling]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
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
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sun6bks-dark">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-sun6bks-gold" />
          <p className="text-lg text-gray-400">Mengecek status pembayaran...</p>
          <p className="mt-2 text-sm text-gray-500">Order ID: {orderId}</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-sun6bks-dark px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center"
        >
          <XCircle className="mx-auto mb-4 h-16 w-16 text-red-400" />
          <h1 className="mb-2 text-xl font-bold text-white">{error}</h1>
          <button
            onClick={() => router.push("/")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali ke Beranda
          </button>
        </motion.div>
      </div>
    );
  }

  if (!transaction) return null;

  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-yellow-400",
      bgColor: "bg-yellow-500/10 border-yellow-500/20",
      title: "Menunggu Pembayaran",
      description:
        "Silakan selesaikan pembayaran sesuai instruksi. Status akan diperbarui otomatis.",
    },
    paid: {
      icon: CheckCircle,
      color: "text-green-400",
      bgColor: "bg-green-500/10 border-green-500/20",
      title: "Pembayaran Berhasil!",
      description:
        "Tiket Anda sudah aktif. Simpan kode tiket di bawah.",
    },
    expired: {
      icon: XCircle,
      color: "text-gray-400",
      bgColor: "bg-gray-500/10 border-gray-500/20",
      title: "Pembayaran Kedaluwarsa",
      description: "Waktu pembayaran telah habis. Silakan buat pesanan baru.",
    },
    failed: {
      icon: XCircle,
      color: "text-red-400",
      bgColor: "bg-red-500/10 border-red-500/20",
      title: "Pembayaran Gagal",
      description: "Terjadi masalah dengan pembayaran Anda. Silakan coba lagi.",
    },
    refunded: {
      icon: CheckCircle,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      title: "Dana Dikembalikan",
      description: "Pembayaran Anda telah di-refund.",
    },
  };

  const config = statusConfig[transaction.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-sun6bks-dark px-4 py-12">
      <div className="mx-auto max-w-lg">
        {/* Back button */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-gray-400 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Beranda
        </button>

        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-8 text-center ${config.bgColor}`}
        >
          <StatusIcon className={`mx-auto mb-4 h-16 w-16 ${config.color}`} />
          <h1 className="mb-2 text-2xl font-bold text-white">
            {config.title}
          </h1>
          <p className="text-gray-400">{config.description}</p>

          {transaction.status === "pending" && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-yellow-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Memeriksa status secara otomatis...</span>
            </div>
          )}
        </motion.div>

        {/* Order Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="mb-4 text-lg font-bold text-white">Detail Pesanan</h2>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Order ID</span>
              <span className="font-mono text-white">{transaction.orderId}</span>
            </div>
            {transaction.event && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Event</span>
                  <span className="text-right text-white">
                    {transaction.event.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Venue</span>
                  <span className="text-right text-white">
                    {transaction.event.venue}
                  </span>
                </div>
              </>
            )}
            {transaction.category && (
              <div className="flex justify-between">
                <span className="text-gray-400">Kategori</span>
                <span className="text-white">{transaction.category.name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-400">Jumlah</span>
              <span className="text-white">{transaction.quantity} tiket</span>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-3">
              <span className="font-semibold text-white">Total</span>
              <span className="text-xl font-bold text-sun6bks-gold">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
            {transaction.paidAt && (
              <div className="flex justify-between">
                <span className="text-gray-400">Dibayar</span>
                <span className="text-green-400">
                  {formatDate(transaction.paidAt)}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Tickets (only shown when paid) */}
        {transaction.status === "paid" && transaction.tickets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 rounded-2xl border border-green-500/20 bg-green-500/5 p-6"
          >
            <div className="mb-4 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-green-400" />
              <h2 className="text-lg font-bold text-white">Tiket Anda</h2>
            </div>

            <div className="space-y-3">
              {transaction.tickets.map((ticket, index) => (
                <div
                  key={ticket.ticket_code}
                  className="flex items-center justify-between rounded-xl bg-white/5 p-4"
                >
                  <div>
                    <p className="text-xs text-gray-400">
                      Tiket #{index + 1}
                    </p>
                    <p className="font-mono text-lg font-bold text-white">
                      {ticket.ticket_code}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCopyCode(ticket.ticket_code)}
                    className="rounded-lg bg-white/10 p-2 text-gray-400 transition-colors hover:bg-white/20 hover:text-white"
                    aria-label="Copy ticket code"
                  >
                    {copiedCode === ticket.ticket_code ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-xs text-gray-500">
              Tunjukkan kode tiket ini saat masuk venue. Invoice telah dikirim
              ke {transaction.customerEmail}.
            </p>
          </motion.div>
        )}

        {/* Actions */}
        {(transaction.status === "expired" ||
          transaction.status === "failed") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-center"
          >
            <button
              onClick={() => router.push("/")}
              className="rounded-xl bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-8 py-3 font-bold text-sun6bks-dark transition-shadow hover:shadow-lg hover:shadow-sun6bks-gold/25"
            >
              Beli Tiket Lagi
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default PaymentConfirmationPage;
