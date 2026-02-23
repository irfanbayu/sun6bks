"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Mic2, Sparkles } from "lucide-react";
import type { LandingEvent } from "@/types";

const formatPrice = (price: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

const formatDateBadge = (isoDate: string, timeLabel: string): string => {
  try {
    const d = new Date(isoDate);
    const day = d.getDate();
    const month = d
      .toLocaleDateString("id-ID", { month: "long" })
      .toUpperCase();
    const year = d.getFullYear();
    return `🎤 ${day} ${month} ${year} • ${timeLabel}`;
  } catch {
    return `🎤 ${timeLabel}`;
  }
};

/** Deterministic positions for particles (index-based, no Math.random) */
const PARTICLE_POSITIONS = [...Array(20)].map((_, i) => ({
  left: (i * 7 + 13) % 100,
  top: (i * 11 + 17) % 100,
  duration: 3 + (i % 3),
  delay: (i % 5) * 0.4,
}));

type HeroSectionProps = {
  landingEvent: LandingEvent | null;
  onBuyTicket?: () => void;
};

export const HeroSection = ({
  landingEvent,
  onBuyTicket,
}: HeroSectionProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handleScrollDown = () => {
    const nextSection = document.getElementById("events");
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleCtaClick = () => {
    if (onBuyTicket) {
      onBuyTicket();
    } else {
      const eventsSection = document.getElementById("events");
      if (eventsSection) {
        eventsSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const dateBadge = landingEvent
    ? formatDateBadge(landingEvent.date, landingEvent.time_label)
    : "";

  const cheapestPrice = landingEvent?.categories.length
    ? Math.min(...landingEvent.categories.map((c) => c.price))
    : 50000;
  const ctaLabel = `Beli Tiket ${formatPrice(cheapestPrice)}`;

  return (
    <section
      ref={containerRef}
      id="hero"
      className="relative min-h-screen overflow-hidden bg-sun6bks-dark"
    >
      <motion.div style={{ y: backgroundY }} className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-sun6bks-dark via-sun6bks-dark/90 to-sun6bks-dark" />
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 215, 0, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 215, 0, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
        {PARTICLE_POSITIONS.map((p, i) => (
          <motion.div
            key={i}
            className="absolute h-1 w-1 rounded-full bg-sun6bks-gold"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
            }}
          />
        ))}
      </motion.div>

      <motion.div
        style={{ y: textY, opacity }}
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, type: "spring" }}
          className="relative mb-8"
        >
          <div className="absolute -inset-4 animate-pulse rounded-full bg-sun6bks-gold/20 blur-xl" />
          <div className="relative rounded-full border-2 border-sun6bks-gold/50 bg-sun6bks-dark p-6">
            <Mic2 className="h-12 w-12 text-sun6bks-gold md:h-16 md:w-16" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mb-4 flex items-center gap-3"
        >
          <Sparkles className="h-6 w-6 text-sun6bks-gold" />
          <span className="text-sm font-semibold uppercase tracking-[0.3em] text-sun6bks-gold md:text-base">
            Show Events
          </span>
          <Sparkles className="h-6 w-6 text-sun6bks-gold" />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mb-6 font-bold"
        >
          <span className="block text-5xl text-white md:text-7xl lg:text-8xl">
            STANDUPINDO BEKASI
          </span>
          {/* <span className="mt-2 block bg-gradient-to-r from-sun6bks-gold via-sun6bks-orange to-sun6bks-gold bg-clip-text text-2xl text-transparent md:text-4xl lg:text-5xl">
            EVENTS
          </span> */}
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mb-8 rounded-full border border-sun6bks-gold/30 bg-sun6bks-gold/10 px-6 py-3 backdrop-blur-sm"
        >
          <p className="text-lg font-bold text-sun6bks-gold md:text-xl">
            {dateBadge}
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.9 }}
          className="mb-12 max-w-lg text-lg text-gray-300 md:text-xl"
        >
          Temukan jadwal standup comedy show, dan live comedy event dari
          Standupindo Bekasi.
          <br className="hidden md:block" />
          Info tiket, line-up comic, dan lokasi venue terupdate.
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCtaClick}
          className="group relative overflow-hidden rounded-full bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-8 py-4 text-lg font-bold text-sun6bks-dark shadow-lg shadow-sun6bks-gold/25 transition-all duration-300 hover:shadow-sun6bks-gold/40 md:px-10 md:py-5 md:text-xl"
        >
          <span className="relative z-10">{ctaLabel}</span>
          <div className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-300 group-hover:translate-x-0" />
        </motion.button>
      </motion.div>

      <motion.button
        onClick={handleScrollDown}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2 cursor-pointer"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="flex flex-col items-center gap-2 text-sun6bks-gold/70 transition-colors hover:text-sun6bks-gold"
        >
          <span className="text-sm uppercase tracking-wider">Scroll</span>
          <ChevronDown className="h-6 w-6" />
        </motion.div>
      </motion.button>
    </section>
  );
};
