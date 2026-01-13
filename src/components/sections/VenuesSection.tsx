"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { MapPin, Navigation, Clock, Phone, Star } from "lucide-react";

type Venue = {
  id: number;
  name: string;
  address: string;
  area: string;
  lat: number;
  lng: number;
  capacity: number;
  rating: number;
  phone: string;
  image: string;
};

const VENUES: Venue[] = [
  {
    id: 1,
    name: "Komik Station Bekasi Square",
    address: "Jl. Ahmad Yani No. 1, Bekasi Square Lt. 3",
    area: "Bekasi Selatan",
    lat: -6.2355,
    lng: 106.9926,
    capacity: 150,
    rating: 4.8,
    phone: "+62 812-3456-7890",
    image: "/venues/komik-station.jpg",
  },
  {
    id: 2,
    name: "Standup Bekasi Mall",
    address: "Bekasi Cyber Park, Jl. KH Noer Ali",
    area: "Bekasi Timur",
    lat: -6.2489,
    lng: 107.0012,
    capacity: 200,
    rating: 4.6,
    phone: "+62 812-9876-5432",
    image: "/venues/bekasi-mall.jpg",
  },
  {
    id: 3,
    name: "KTV Spot Bekasi Selatan",
    address: "Jl. Kemang Pratama Raya No. 88",
    area: "Bekasi Selatan",
    lat: -6.2598,
    lng: 106.9845,
    capacity: 100,
    rating: 4.5,
    phone: "+62 813-1234-5678",
    image: "/venues/ktv-spot.jpg",
  },
];

export const VenuesSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const mapY = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);

  return (
    <section
      ref={sectionRef}
      id="venues"
      className="relative min-h-screen overflow-hidden bg-gradient-to-b from-sun6bks-dark to-[#0a0a0a] py-20 md:py-32"
    >
      {/* Parallax Map Background */}
      <motion.div
        style={{ y: mapY }}
        className="absolute inset-0 z-0 opacity-20"
      >
        {/* Map Grid Pattern */}
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
        {/* Simulated Map Points */}
        {VENUES.map((venue, i) => (
          <motion.div
            key={venue.id}
            className="absolute"
            style={{
              left: `${30 + i * 20}%`,
              top: `${35 + i * 10}%`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: i * 0.3,
            }}
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-sun6bks-gold/30 blur-xl" />
              <MapPin className="relative h-8 w-8 text-sun6bks-gold" />
            </div>
          </motion.div>
        ))}
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
            📍 Lokasi
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Venue{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Bekasi
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Tempat-tempat terbaik untuk menikmati stand-up comedy di Bekasi
          </p>
        </motion.div>

        {/* Venues Cards */}
        <div className="grid gap-8 lg:grid-cols-3">
          {VENUES.map((venue, index) => (
            <motion.div
              key={venue.id}
              initial={{ opacity: 0, y: 50 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              whileHover={{ y: -8 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm transition-all duration-300 hover:border-sun6bks-gold/30"
            >
              {/* Image Placeholder */}
              <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sun6bks-gold/10 to-sun6bks-orange/10">
                <div className="absolute inset-0 flex items-center justify-center">
                  <MapPin className="h-16 w-16 text-sun6bks-gold/20" />
                </div>
                {/* Area Badge */}
                <div className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-sun6bks-dark/80 px-3 py-1 text-xs font-semibold text-sun6bks-gold backdrop-blur-sm">
                  <Navigation className="h-3 w-3" />
                  {venue.area}
                </div>
                {/* Rating */}
                <div className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-sun6bks-gold px-3 py-1 text-xs font-bold text-sun6bks-dark">
                  <Star className="h-3 w-3 fill-current" />
                  {venue.rating}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-white transition-colors group-hover:text-sun6bks-gold">
                  {venue.name}
                </h3>
                <p className="mb-4 text-sm text-gray-400">
                  {venue.address}
                </p>

                {/* Info */}
                <div className="mb-4 flex flex-wrap gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-sun6bks-gold" />
                    Kapasitas: {venue.capacity}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 text-sun6bks-gold" />
                    {venue.phone}
                  </span>
                </div>

                {/* Action */}
                <motion.a
                  href={`https://maps.google.com/?q=${venue.lat},${venue.lng}`}
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
          ))}
        </div>

        {/* Map CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="mb-4 text-gray-500 text-sm">
            Koordinat: Bekasi, Jawa Barat (-6.2355, 106.9926)
          </p>
        </motion.div>
      </div>
    </section>
  );
};
