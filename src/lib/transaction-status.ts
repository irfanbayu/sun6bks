export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  paid: "Lunas",
  pending: "Menunggu",
  expired: "Kedaluwarsa",
  failed: "Gagal",
  refunded: "Dikembalikan",
};

export const TRANSACTION_STATUS_BADGES: Record<string, string> = {
  paid: "bg-green-500/10 text-green-400",
  pending: "bg-yellow-500/10 text-yellow-400",
  expired: "bg-gray-500/10 text-gray-400",
  failed: "bg-red-500/10 text-red-400",
  refunded: "bg-blue-500/10 text-blue-400",
};

export const getTransactionStatusLabel = (status: string): string =>
  TRANSACTION_STATUS_LABELS[status] ?? status;

export const getTransactionStatusBadge = (status: string): string =>
  TRANSACTION_STATUS_BADGES[status] ?? TRANSACTION_STATUS_BADGES.pending;
