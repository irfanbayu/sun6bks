"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";

type VenuesSectionProps = {
  venueName: string;
  venueAddress: string | null;
  venueLat: number | null;
  venueLng: number | null;
  venueMapsUrl: string | null;
};

export const VenuesSection = ({
  venueName,
  venueAddress,
  venueLat,
  venueLng,
  venueMapsUrl,
}: VenuesSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const mapY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  const hasCoordinates = venueLat !== null && venueLng !== null;
  const fallbackMapsUrl = hasCoordinates
    ? `https://maps.google.com/?q=${venueLat},${venueLng}`
    : `https://maps.google.com/maps?q=${encodeURIComponent(venueName)}`;
  const mapsUrl = venueMapsUrl?.trim() || fallbackMapsUrl;

  return (
    <section
      ref={sectionRef}
      id="venues"
      className="relative overflow-hidden bg-gradient-to-b from-sun6bks-dark to-[#0a0a0a] py-20 md:py-32"
    >
      {/* Parallax Map Background */}
      <motion.div
        style={{ y: mapY }}
        className="absolute inset-0 z-0 opacity-20"
      >
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 40%, rgba(255, 215, 0, 0.15) 0%, transparent 30%),
              radial-gradient(circle at 70% 60%, rgba(255, 107, 53, 0.15) 0%, transparent 30%),
              linear-gradient(rgba(255, 215, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 215, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "100% 100%, 100% 100%, 30px 30px, 30px 30px",
          }}
        />
        {/* Animated Map Pin */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <div className="relative">
            <div className="absolute -inset-4 rounded-full bg-sun6bks-gold/30 blur-xl" />
            <MapPin className="relative h-8 w-8 text-sun6bks-gold" />
          </div>
        </motion.div>
      </motion.div>

      <div className="container relative z-10 mx-auto px-4">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="mb-16 text-center"
        >
          <span className="mb-4 inline-block rounded-full bg-sun6bks-gold/10 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-sun6bks-gold">
            Lokasi
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Venue{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Show
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Lokasi venue untuk event yang akan datang
          </p>
        </motion.div>

        {/* Single Venue Card */}
        <div className="mx-auto max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            whileHover={{ y: -8 }}
            className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:border-sun6bks-gold/30"
          >
            {/* Image Placeholder */}
            <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sun6bks-gold/10 to-sun6bks-orange/10">
              <div className="absolute inset-0 flex items-center justify-center">
                <MapPin className="h-16 w-16 text-sun6bks-gold/20" />
              </div>
              {/* Location Badge */}
              <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-sun6bks-dark/80 px-3 py-1 text-xs font-semibold text-sun6bks-gold backdrop-blur-sm">
                <Navigation className="h-3 w-3" />
                Event Venue
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-sun6bks-gold">
                {venueName}
              </h3>
              {venueAddress ? (
                <p className="mb-6 text-sm text-gray-400">{venueAddress}</p>
              ) : null}

              {/* Action */}
              <motion.a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-sun6bks-gold/30 bg-sun6bks-gold/10 px-4 py-3 text-sm font-semibold text-sun6bks-gold transition-all hover:bg-sun6bks-gold/20"
              >
                <Navigation className="h-4 w-4" />
                Buka di Google Maps
              </motion.a>
            </div>
          </motion.div>
        </div>

        {/* Coordinates Info */}
        {hasCoordinates ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <p className="text-sm text-gray-500">
              Koordinat: ({venueLat}, {venueLng})
            </p>
          </motion.div>
        ) : null}
      </div>
    </section>
  );
};
