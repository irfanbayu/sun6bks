"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, Zap, Crown, Star, Ticket } from "lucide-react";

type PricingTier = {
  id: number;
  name: string;
  price: string;
  priceNum: number;
  description: string;
  features: string[];
  popular: boolean;
  icon: React.ReactNode;
  color: string;
};

const PRICING_TIERS: PricingTier[] = [
  {
    id: 1,
    name: "Regular",
    price: "Rp35.000",
    priceNum: 35000,
    description: "Akses standar untuk menikmati show",
    features: [
      "1 Tiket Masuk",
      "Tempat duduk reguler",
      "Akses ke area umum",
      "Snack ringan",
    ],
    popular: false,
    icon: <Ticket className="h-6 w-6" />,
    color: "from-gray-500 to-gray-600",
  },
  {
    id: 2,
    name: "Premium",
    price: "Rp50.000",
    priceNum: 50000,
    description: "Pengalaman terbaik dengan kursi depan",
    features: [
      "1 Tiket Masuk",
      "Kursi baris depan",
      "Free welcome drink",
      "Snack premium",
      "Meet & Greet singkat",
      "Foto bareng performer",
    ],
    popular: true,
    icon: <Crown className="h-6 w-6" />,
    color: "from-sun6bks-gold to-sun6bks-orange",
  },
  {
    id: 3,
    name: "VIP",
    price: "Rp100.000",
    priceNum: 100000,
    description: "Eksklusif untuk penggemar sejati",
    features: [
      "1 Tiket Masuk",
      "Kursi VIP ekslusif",
      "Welcome drink unlimited",
      "Dinner package",
      "Backstage access",
      "Meet & Greet eksklusif",
      "Merchandise gratis",
      "Early access next event",
    ],
    popular: false,
    icon: <Star className="h-6 w-6" />,
    color: "from-purple-500 to-pink-500",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const PricingSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative overflow-hidden bg-gradient-to-b from-[#0a0a0a] via-sun6bks-dark to-sun6bks-dark py-20 md:py-32"
    >
      {/* Background Decorations */}
      <div className="absolute inset-0">
        <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-sun6bks-gold/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-sun6bks-orange/5 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-sun6bks-gold/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-sun6bks-gold">
            💰 Harga
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Pilih{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Tiketmu
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Harga terjangkau untuk pengalaman komedi premium. Pilih paket yang sesuai kebutuhanmu!
          </p>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-8 md:grid-cols-3"
        >
          {PRICING_TIERS.map((tier) => (
            <motion.div
              key={tier.id}
              variants={cardVariants}
              whileHover={{ y: -12, scale: 1.02 }}
              className={`group relative overflow-hidden rounded-3xl border ${
                tier.popular
                  ? "border-sun6bks-gold/50 bg-gradient-to-br from-sun6bks-gold/10 to-sun6bks-orange/5"
                  : "border-white/10 bg-gradient-to-br from-white/5 to-transparent"
              } p-8 backdrop-blur-sm transition-all duration-500`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute -right-12 top-6 rotate-45 bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-12 py-1 text-xs font-bold text-sun6bks-dark shadow-lg">
                  POPULER
                </div>
              )}

              {/* Icon */}
              <motion.div
                initial={{ scale: 1 }}
                whileHover={{ scale: 1.1, rotate: 5 }}
                className={`mb-6 inline-flex rounded-2xl bg-gradient-to-br ${tier.color} p-4 text-white shadow-lg`}
              >
                {tier.icon}
              </motion.div>

              {/* Tier Name */}
              <h3 className="mb-2 text-2xl font-bold text-white">
                {tier.name}
              </h3>
              <p className="mb-6 text-sm text-gray-400">{tier.description}</p>

              {/* Price */}
              <div className="mb-8">
                <span
                  className={`text-4xl font-bold ${
                    tier.popular
                      ? "bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent"
                      : "text-white"
                  }`}
                >
                  {tier.price}
                </span>
                <span className="text-gray-500">/tiket</span>
              </div>

              {/* Features */}
              <ul className="mb-8 space-y-3">
                {tier.features.map((feature, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: 0.1 * index }}
                    className="flex items-center gap-3 text-sm text-gray-300"
                  >
                    <Check
                      className={`h-4 w-4 flex-shrink-0 ${
                        tier.popular ? "text-sun6bks-gold" : "text-gray-500"
                      }`}
                    />
                    {feature}
                  </motion.li>
                ))}
              </ul>

              {/* CTA Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`w-full rounded-xl py-4 font-bold transition-all ${
                  tier.popular
                    ? "bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange text-sun6bks-dark shadow-lg shadow-sun6bks-gold/25 hover:shadow-sun6bks-gold/40"
                    : "border border-white/20 bg-white/5 text-white hover:bg-white/10"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <Zap className="h-4 w-4" />
                  Beli Sekarang
                </span>
              </motion.button>

              {/* Hover Glow Effect */}
              {tier.popular && (
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-r from-sun6bks-gold/20 to-sun6bks-orange/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-16 flex flex-wrap items-center justify-center gap-8 text-center text-sm text-gray-500"
        >
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Pembayaran Aman
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            E-Ticket Instan
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Refund Policy
          </div>
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-green-500" />
            Midtrans Payment
          </div>
        </motion.div>
      </div>
    </section>
  );
};
