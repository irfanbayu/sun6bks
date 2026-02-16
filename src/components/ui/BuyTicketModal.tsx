"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useClerk } from "@clerk/nextjs";
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
  Loader2,
  AlertCircle,
  User,
  Mail,
  Phone,
  LogIn,
} from "lucide-react";
import { createOrderAndSnapToken } from "@/actions/midtrans";
import { MidtransProvider } from "@/components/providers/MidtransProvider";
import type { MidtransSnapResult } from "@/types/midtrans";

export type EventData = {
  id: number;
  title: string;
  date: string;
  time: string;
  venue: string;
  performers: { name: string }[];
  categoryId: number;
  categoryName: string;
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
};

type PaymentStatus = "idle" | "loading" | "error";

type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, damping: 25, stiffness: 300 },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: { duration: 0.2 },
  },
};

export const BuyTicketModal = ({
  isOpen,
  onClose,
  event,
  ticketQuantity,
  onQuantityChange,
}: BuyTicketModalProps) => {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const clerk = useClerk();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Partial<CustomerDetails>>({});
  const [snapReady, setSnapReady] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && paymentStatus !== "loading") {
        onClose();
      }
    },
    [onClose, paymentStatus]
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

  // Reset state when modal opens + check Snap readiness + pre-fill from Clerk
  useEffect(() => {
    if (isOpen) {
      setPaymentStatus("idle");
      setPaymentMessage("");
      setErrors({});
      // Check if Snap is already loaded
      setSnapReady(!!window.snap);

      // Pre-fill customer details from Clerk user
      if (isSignedIn && user) {
        setCustomerDetails((prev) => ({
          name: prev.name || user.fullName || user.firstName || "",
          email:
            prev.email ||
            user.primaryEmailAddress?.emailAddress ||
            "",
          phone: prev.phone,
        }));
      }
    }
  }, [isOpen, isSignedIn, user]);

  // Poll for Snap readiness when modal is open
  useEffect(() => {
    if (!isOpen || snapReady) return;

    const interval = setInterval(() => {
      if (window.snap) {
        setSnapReady(true);
        clearInterval(interval);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isOpen, snapReady]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && paymentStatus !== "loading") {
      onClose();
    }
  };

  const handleDecrement = () => {
    if (ticketQuantity > 1) onQuantityChange(ticketQuantity - 1);
  };

  const handleIncrement = () => {
    if (event && ticketQuantity < Math.min(event.spotsLeft, 10)) {
      onQuantityChange(ticketQuantity + 1);
    }
  };

  const handleInputChange = (field: keyof CustomerDetails, value: string) => {
    setCustomerDetails((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CustomerDetails> = {};

    if (!customerDetails.name.trim()) {
      newErrors.name = "Nama wajib diisi";
    }
    if (!customerDetails.email.trim()) {
      newErrors.email = "Email wajib diisi";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) {
      newErrors.email = "Format email tidak valid";
    }
    if (!customerDetails.phone.trim()) {
      newErrors.phone = "Nomor telepon wajib diisi";
    } else if (!/^[0-9+\-\s]{10,15}$/.test(customerDetails.phone)) {
      newErrors.phone = "Format nomor telepon tidak valid";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSnapResult = (result: MidtransSnapResult, orderId: string) => {
    // DO NOT activate ticket here.
    // Redirect to payment confirmation page — webhook is single source of truth.
    router.push(`/payment/${orderId}`);
    onClose();
  };

  const handleCheckout = async () => {
    if (!event) return;

    // Require login before payment
    if (!isSignedIn) {
      clerk.redirectToSignIn({ afterSignInUrl: window.location.href });
      return;
    }

    if (!validateForm()) return;

    setPaymentStatus("loading");
    setPaymentMessage("Memproses pembayaran...");

    try {
      const response = await createOrderAndSnapToken({
        eventId: event.id,
        categoryId: event.categoryId,
        eventTitle: event.title,
        quantity: ticketQuantity,
        pricePerTicket: event.priceNumber,
        customerName: customerDetails.name.trim(),
        customerEmail: customerDetails.email.trim(),
        customerPhone: customerDetails.phone.trim(),
        clerkUserId: user?.id,
      });

      if (!response.success || !response.token || !response.orderId) {
        setPaymentStatus("error");
        setPaymentMessage(response.error || "Gagal membuat transaksi");
        return;
      }

      const orderId = response.orderId;

      // Check if Snap is loaded
      if (!window.snap) {
        // Fallback: redirect to Midtrans hosted page
        if (response.redirectUrl) {
          window.location.href = response.redirectUrl;
          return;
        }
        setPaymentStatus("error");
        setPaymentMessage(
          "Payment gateway belum siap. Refresh halaman dan coba lagi."
        );
        return;
      }

      // Trigger Midtrans Snap popup
      window.snap.pay(response.token, {
        onSuccess: (result) => handleSnapResult(result, orderId),
        onPending: (result) => handleSnapResult(result, orderId),
        onError: (result) => handleSnapResult(result, orderId),
        onClose: () => {
          // User closed popup — still redirect to payment page
          // so they can see status (webhook may still come)
          router.push(`/payment/${orderId}`);
          onClose();
        },
      });

      // Reset loading once popup is open
      setPaymentStatus("idle");
      setPaymentMessage("");
    } catch (error) {
      console.error("Checkout error:", error);
      setPaymentStatus("error");
      setPaymentMessage("Terjadi kesalahan. Silakan coba lagi.");
    }
  };

  const handleCloseModal = () => {
    if (paymentStatus === "loading") return;
    setPaymentStatus("idle");
    setPaymentMessage("");
    setCustomerDetails({ name: "", email: "", phone: "" });
    setErrors({});
    onClose();
  };

  if (!event) return null;

  const totalPrice = event.priceNumber * ticketQuantity;
  const formattedTotal = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(totalPrice);

  const isFormDisabled = paymentStatus === "loading";

  return (
    <>
      {/* Conditionally load Snap script only when modal is open (bundle-defer-third-party) */}
      <MidtransProvider enabled={isOpen} />

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
              className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-gradient-to-br from-[#1a1a1a] to-[#0f0f0f] shadow-2xl"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                disabled={isFormDisabled}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header with Event Image */}
              <div className="relative h-32 overflow-hidden bg-gradient-to-br from-sun6bks-gold/30 to-sun6bks-orange/30">
                <div className="absolute inset-0 flex items-center justify-center">
                  <Ticket className="h-16 w-16 text-sun6bks-gold/40" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a1a] via-transparent to-transparent" />
                <div className="absolute bottom-4 left-6 right-6 flex items-center justify-between">
                  <span className="inline-block rounded-full bg-sun6bks-gold/20 px-3 py-1 text-xs font-semibold text-sun6bks-gold backdrop-blur-sm">
                    {event.spotsLeft} spots tersisa
                  </span>
                  <span className="inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {event.categoryName}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Payment Status Message */}
                <AnimatePresence mode="wait">
                  {paymentStatus !== "idle" && paymentMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className={`mb-4 flex items-start gap-3 rounded-xl p-4 ${
                        paymentStatus === "error"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-blue-500/10 text-blue-400"
                      }`}
                    >
                      {paymentStatus === "loading" && (
                        <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
                      )}
                      {paymentStatus === "error" && (
                        <AlertCircle className="h-5 w-5 flex-shrink-0" />
                      )}
                      <span className="text-sm">{paymentMessage}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Event Title */}
                <h2 className="mb-3 text-xl font-bold text-white">
                  {event.title}
                </h2>

                {/* Event Details */}
                <div className="mb-4 grid grid-cols-2 gap-2 text-sm text-gray-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-sun6bks-gold" />
                    <span>{event.date}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-sun6bks-gold" />
                    <span>{event.time}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-sun6bks-gold" />
                    <span className="truncate">{event.venue}</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-2">
                    <Users className="h-4 w-4 text-sun6bks-gold" />
                    <span className="truncate">
                      {event.performers.map((p) => p.name).join(", ")}
                    </span>
                  </div>
                </div>

                {/* Customer Details Form */}
                <div className="mb-4 space-y-3">
                  <h3 className="text-sm font-medium text-gray-400">
                    Detail Pemesan
                  </h3>
                  <div>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Nama lengkap"
                        value={customerDetails.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        disabled={isFormDisabled}
                        className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                          errors.name
                            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50"
                            : "border-white/10 focus:border-sun6bks-gold focus:ring-sun6bks-gold/50"
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="email"
                        placeholder="Email"
                        value={customerDetails.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        disabled={isFormDisabled}
                        className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                          errors.email
                            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50"
                            : "border-white/10 focus:border-sun6bks-gold focus:ring-sun6bks-gold/50"
                        }`}
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-400">
                        {errors.email}
                      </p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                      <input
                        type="tel"
                        placeholder="Nomor WhatsApp"
                        value={customerDetails.phone}
                        onChange={(e) =>
                          handleInputChange("phone", e.target.value)
                        }
                        disabled={isFormDisabled}
                        className={`w-full rounded-lg border bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder-gray-500 transition-colors focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-50 ${
                          errors.phone
                            ? "border-red-500/50 focus:border-red-500 focus:ring-red-500/50"
                            : "border-white/10 focus:border-sun6bks-gold focus:ring-sun6bks-gold/50"
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-400">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Ticket Quantity Selector */}
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-400">
                    Jumlah Tiket
                  </label>
                  <div className="flex items-center justify-between rounded-xl bg-white/5 p-2">
                    <button
                      onClick={handleDecrement}
                      disabled={ticketQuantity <= 1 || isFormDisabled}
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-xl font-bold text-white">
                      {ticketQuantity}
                    </span>
                    <button
                      onClick={handleIncrement}
                      disabled={
                        ticketQuantity >= Math.min(event.spotsLeft, 10) ||
                        isFormDisabled
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Increase quantity"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="mt-1 text-center text-xs text-gray-500">
                    Maksimal 10 tiket per transaksi
                  </p>
                </div>

                {/* Price Summary */}
                <div className="mb-4 space-y-2 rounded-xl border border-sun6bks-gold/20 bg-sun6bks-gold/5 p-3">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>
                      {event.price} x {ticketQuantity} tiket
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/10 pt-2">
                    <span className="font-semibold text-white">Total</span>
                    <span className="text-xl font-bold text-sun6bks-gold">
                      {formattedTotal}
                    </span>
                  </div>
                </div>

                {/* Login prompt when not signed in */}
                {!isSignedIn && (
                  <div className="mb-4 flex items-center gap-3 rounded-xl bg-sun6bks-gold/5 border border-sun6bks-gold/20 p-4">
                    <LogIn className="h-5 w-5 flex-shrink-0 text-sun6bks-gold" />
                    <p className="text-sm text-gray-300">
                      Anda perlu{" "}
                      <button
                        type="button"
                        onClick={() => clerk.redirectToSignIn({ afterSignInUrl: window.location.href })}
                        className="font-semibold text-sun6bks-gold underline underline-offset-2 hover:text-sun6bks-orange"
                      >
                        masuk
                      </button>{" "}
                      terlebih dahulu untuk melanjutkan pembayaran.
                    </p>
                  </div>
                )}

                {/* Checkout Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCheckout}
                  disabled={isFormDisabled}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange py-3.5 text-lg font-bold text-sun6bks-dark shadow-lg shadow-sun6bks-gold/25 transition-shadow hover:shadow-xl hover:shadow-sun6bks-gold/30 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {paymentStatus === "loading" ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Memproses...
                    </>
                  ) : !isSignedIn ? (
                    <>
                      <LogIn className="h-5 w-5" />
                      Masuk & Bayar
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      Bayar Sekarang
                    </>
                  )}
                </motion.button>

                {/* Payment Info */}
                <p className="mt-3 text-center text-xs text-gray-500">
                  Pembayaran aman via Midtrans &bull; QRIS, Bank Transfer,
                  E-Wallet
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
