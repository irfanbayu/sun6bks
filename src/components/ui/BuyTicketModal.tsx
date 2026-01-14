"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Ticket,
  CreditCard,
  Minus,
  Plus,
} from "lucide-react";

export type EventData = {
  id: number;
  title: string;
  date: string;
  time: string;
  venue: string;
  performers: string[];
  price: string;
  priceNumber: number;
  spotsLeft: number;
};

type BuyTicketModalProps = {
  isOpen: boolean;
  onClose: () => void;
  event: EventData | null;
  ticketQuantity: number;
  onQuantityChange: (quantity: number) => void;
  onCheckout: () => void;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 20,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 25,
      stiffness: 300,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
    },
  },
};

export const BuyTicketModal = ({
  isOpen,
  onClose,
  event,
  ticketQuantity,
  onQuantityChange,
  onCheckout,
}: BuyTicketModalProps) => {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleDecrement = () => {
    if (ticketQuantity > 1) {
      onQuantityChange(ticketQuantity - 1);
    }
  };

  const handleIncrement = () => {
    if (event && ticketQuantity < Math.min(event.spotsLeft, 10)) {
      onQuantityChange(ticketQuantity + 1);
    }
  };

  if (!event) return null;

  const totalPrice = event.priceNumber * ticketQuantity;
  const formattedTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalPrice);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm"
        >
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header with Event Image */}
            <div className="relative h-40 overflow-hidden bg-gradient-to-br from-sun6bks-gold/30 to-sun6bks-orange/30">
              <div className="absolute inset-0 flex items-center justify-center">
                <Ticket className="h-20 w-20 text-sun6bks-gold/40" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
              <div className="absolute bottom-4 left-6 right-6">
                <span className="inline-block rounded-full bg-sun6bks-gold/20 px-3 py-1 text-xs font-semibold text-sun6bks-gold backdrop-blur-sm">
                  🎭 {event.spotsLeft} spots tersisa
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Event Title */}
              <h2 className="mb-4 text-2xl font-bold text-white">
                {event.title}
              </h2>

              {/* Event Details */}
              <div className="mb-6 space-y-3 rounded-xl bg-white/5 p-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <Calendar className="h-5 w-5 text-sun6bks-gold" />
                  <span>{event.date}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Clock className="h-5 w-5 text-sun6bks-gold" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <MapPin className="h-5 w-5 text-sun6bks-gold" />
                  <span>{event.venue}</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <Users className="h-5 w-5 text-sun6bks-gold" />
                  <span className="truncate">
                    {event.performers.join(", ")}
                  </span>
                </div>
              </div>

              {/* Ticket Quantity Selector */}
              <div className="mb-6">
                <label className="mb-3 block text-sm font-medium text-gray-400">
                  Jumlah Tiket
                </label>
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-2">
                  <button
                    onClick={handleDecrement}
                    disabled={ticketQuantity <= 1}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-2xl font-bold text-white">
                    {ticketQuantity}
                  </span>
                  <button
                    onClick={handleIncrement}
                    disabled={ticketQuantity >= Math.min(event.spotsLeft, 10)}
                    className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-center text-xs text-gray-500">
                  Maksimal 10 tiket per transaksi
                </p>
              </div>

              {/* Price Summary */}
              <div className="mb-6 space-y-2 rounded-xl border border-sun6bks-gold/20 bg-sun6bks-gold/5 p-4">
                <div className="flex items-center justify-between text-gray-400">
                  <span>
                    {event.price} × {ticketQuantity} tiket
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-white/10 pt-2">
                  <span className="text-lg font-semibold text-white">
                    Total
                  </span>
                  <span className="text-2xl font-bold text-sun6bks-gold">
                    {formattedTotal}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onCheckout}
                className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange py-4 text-lg font-bold text-sun6bks-dark shadow-lg shadow-sun6bks-gold/25 transition-shadow hover:shadow-xl hover:shadow-sun6bks-gold/30"
              >
                <CreditCard className="h-5 w-5" />
                Bayar Sekarang
              </motion.button>

              {/* Payment Info */}
              <p className="mt-4 text-center text-xs text-gray-500">
                Pembayaran aman via Midtrans • QRIS, Bank Transfer, E-Wallet
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
