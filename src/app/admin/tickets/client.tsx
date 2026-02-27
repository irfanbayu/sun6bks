"use client";

import { useState } from "react";
import {
  Download,
  Ticket,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from "lucide-react";
import type { AdminTicket } from "@/actions/admin-tickets";
import { formatCurrencyIDR, formatDateIDTimeShort } from "@/lib/formatters";

type AdminTicketsClientProps = {
  tickets: AdminTicket[];
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; color: string; bg: string; label: string }
> = {
  active: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
    label: "Active",
  },
  used: {
    icon: Ticket,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    label: "Used",
  },
  inactive: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    label: "Inactive",
  },
  cancelled: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    label: "Cancelled",
  },
};

const escapeCsvField = (value: string) => {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const AdminTicketsClient = ({ tickets }: AdminTicketsClientProps) => {
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredTickets = tickets.filter((t) => {
    const matchesFilter = filter === "all" || t.ticketStatus === filter;
    const matchesSearch =
      searchQuery === "" ||
      t.ticketCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.orderId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.categoryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.eventTitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleDownloadCsv = () => {
    const headers = [
      "Ticket Code",
      "Status",
      "Event",
      "Kategori Tiket",
      "Harga",
      "Customer",
      "Email",
      "Order ID",
      "Tanggal Dibuat",
    ];

    const rows = filteredTickets.map((t) => [
      escapeCsvField(t.ticketCode),
      escapeCsvField(t.ticketStatus),
      escapeCsvField(t.eventTitle),
      escapeCsvField(t.categoryName),
      t.categoryPrice.toString(),
      escapeCsvField(t.customerName),
      escapeCsvField(t.customerEmail),
      escapeCsvField(t.orderId),
      escapeCsvField(formatDateIDTimeShort(t.createdAt)),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n",
    );

    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tickets-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Toolbar: Search + Download */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ticket code, customer, event..."
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 sm:w-80"
          />
        </div>
        <button
          onClick={handleDownloadCsv}
          disabled={filteredTickets.length === 0}
          className="flex items-center gap-2 rounded-lg bg-sun6bks-gold px-4 py-2 text-sm font-bold text-sun6bks-dark transition-colors hover:bg-sun6bks-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Download CSV ({filteredTickets.length})
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {["all", "active", "used", "inactive", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === status
                ? "bg-sun6bks-gold text-sun6bks-dark"
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {status === "all"
              ? "Semua"
              : (STATUS_CONFIG[status]?.label ?? status)}
            {status !== "all" && (
              <span className="ml-1 text-xs opacity-70">
                ({tickets.filter((t) => t.ticketStatus === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Ticket Code
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Status
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Event
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Kategori Tiket
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Harga
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Customer
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Order ID
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                Tanggal
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredTickets.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  Tidak ada tiket ditemukan.
                </td>
              </tr>
            )}
            {filteredTickets.map((t) => {
              const statusCfg =
                STATUS_CONFIG[t.ticketStatus] || STATUS_CONFIG.inactive;
              const StatusIcon = statusCfg.icon;

              return (
                <tr
                  key={t.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-white">
                      {t.ticketCode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusCfg.bg} ${statusCfg.color}`}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-white">
                    {t.eventTitle}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-xs font-medium text-purple-400">
                      {t.categoryName}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {formatCurrencyIDR(t.categoryPrice)}
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white">{t.customerName}</p>
                      <p className="text-xs text-gray-500">
                        {t.customerEmail}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-gray-400">
                      {t.orderId}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {formatDateIDTimeShort(t.createdAt)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-4 text-sm text-gray-500">
        Menampilkan {filteredTickets.length} dari {tickets.length} tiket
      </div>
    </div>
  );
};
