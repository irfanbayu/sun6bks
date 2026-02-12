"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Ticket } from "lucide-react";
import type { LandingEvent } from "@/types";

type EventsSectionProps = {
  landingEvent: LandingEvent | null;
  onBuyCategory: (categoryId: number) => void;
};

const formatDate = (isoDate: string): string => {
  try {
    return new Date(isoDate).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
};

const formatPrice = (price: number): string =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

const cardVariants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export const EventsSection = ({
  landingEvent,
  onBuyCategory,
}: EventsSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  if (!landingEvent || landingEvent.categories.length === 0) {
    return (
      <section
        ref={sectionRef}
        id="events"
        className="relative bg-gradient-to-b from-sun6bks-dark via-[#0f0f0f] to-sun6bks-dark py-20 md:py-32"
      >
        <div className="container relative z-10 mx-auto px-4 text-center">
          <p className="text-lg text-gray-400">
            Event belum tersedia. Nantikan update terbaru!
          </p>
        </div>
      </section>
    );
  }

  const formattedDate = formatDate(landingEvent.date);

  return (
    <section
      ref={sectionRef}
      id="events"
      className="relative bg-gradient-to-b from-sun6bks-dark via-[#0f0f0f] to-sun6bks-dark py-20 md:py-32"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-sun6bks-gold/5 blur-3xl" />
        <div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-sun6bks-orange/5 blur-3xl" />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-sun6bks-gold/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-sun6bks-gold">
            Event
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Upcoming{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Show
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Jangan sampai kehabisan tiket! Pilih kategori dan siap-siap ketawa
            lepas.
          </p>
        </motion.div>

        {/* Single Event Spotlight */}
        <motion.div
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <div className="mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm">
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sun6bks-gold/20 to-sun6bks-orange/20">
              <div className="absolute inset-0 flex items-center justify-center">
                <Ticket className="h-16 w-16 text-sun6bks-gold/30" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-sun6bks-dark via-transparent to-transparent" />
            </div>
            <div className="p-6">
              <h3 className="mb-4 text-2xl font-bold text-white md:text-3xl">
                {landingEvent.title}
              </h3>
              <div className="mb-6 space-y-2 text-sm text-gray-400">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-sun6bks-gold" />
                  <span>{formattedDate}</span>
                  <Clock className="ml-2 h-4 w-4 text-sun6bks-gold" />
                  <span>{landingEvent.time_label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-sun6bks-gold" />
                  <span className="truncate">{landingEvent.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-sun6bks-gold" />
                  <span className="truncate">
                    {landingEvent.performers.join(", ")}
                  </span>
                </div>
              </div>

              {/* Category Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {landingEvent.categories.map((cat) => (
                  <motion.div
                    key={cat.id}
                    variants={cardVariants}
                    whileHover={{ y: -8, scale: 1.02 }}
                    className="group relative cursor-pointer overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all duration-300 hover:border-sun6bks-gold/30"
                    onClick={() => onBuyCategory(cat.id)}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-semibold text-white group-hover:text-sun6bks-gold">
                        {cat.name}
                      </span>
                      <span className="rounded-full bg-sun6bks-dark/80 px-2 py-0.5 text-xs font-semibold text-sun6bks-gold">
                        {cat.spotsLeft} spots
                      </span>
                    </div>
                    <p className="mb-3 text-2xl font-bold text-sun6bks-gold">
                      {formatPrice(cat.price)}
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onBuyCategory(cat.id);
                      }}
                      className="w-full rounded-full bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange py-2 text-sm font-bold text-sun6bks-dark transition-shadow hover:shadow-lg hover:shadow-sun6bks-gold/25"
                    >
                      Beli Tiket
                    </motion.button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
