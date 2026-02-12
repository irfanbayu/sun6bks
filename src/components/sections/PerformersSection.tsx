"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Instagram, Youtube, Mic } from "lucide-react";

type Performer = {
  id: number;
  name: string;
  nickname: string;
  bio: string;
  image: string;
  instagram: string;
  youtube?: string;
  showsCount: number;
};

const PERFORMERS: Performer[] = [
  {
    id: 1,
    name: "Dedi Supriyadi",
    nickname: "Dedi",
    bio: "Raja observasi kehidupan rumah tangga Bekasi",
    image: "/performers/dedi.jpg",
    instagram: "@dedi_bekasi",
    youtube: "@DediKomedi",
    showsCount: 45,
  },
  {
    id: 2,
    name: "Echa Novita",
    nickname: "Echa",
    bio: "Komedian wanita dengan joke-joke kelas pekerja",
    image: "/performers/echa.jpg",
    instagram: "@echa_sun6",
    showsCount: 38,
  },
  {
    id: 3,
    name: "Fajar Ramadan",
    nickname: "Fajar",
    bio: "Storyteller absurd tentang transportasi umum",
    image: "/performers/fajar.jpg",
    instagram: "@fajar_comedy",
    youtube: "@FajarStandup",
    showsCount: 52,
  },
  {
    id: 4,
    name: "Rina Bekasi",
    nickname: "Rina",
    bio: "Ibu rumah tangga dengan humor gelap",
    image: "/performers/rina.jpg",
    instagram: "@rinabks_comedy",
    showsCount: 30,
  },
  {
    id: 5,
    name: "Budi Santoso",
    nickname: "Budi",
    bio: "Office worker dengan joke corporate life",
    image: "/performers/budi.jpg",
    instagram: "@budi_standup",
    showsCount: 25,
  },
  {
    id: 6,
    name: "Ahmad Rizky",
    nickname: "Ahmad",
    bio: "Newcomer dengan energi tinggi dan fresh material",
    image: "/performers/ahmad.jpg",
    instagram: "@ahmadrzky",
    showsCount: 12,
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
    },
  },
};

export const PerformersSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  return (
    <section
      ref={sectionRef}
      id="performers"
      className="relative overflow-hidden bg-sun6bks-dark py-20 md:py-32"
    >
      {/* Background Pattern */}
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-sun6bks-gold/5 to-transparent" />
        <div className="absolute bottom-0 right-0 h-full w-1/3 bg-gradient-to-l from-sun6bks-orange/5 to-transparent" />
        {/* Circular Pattern */}
        <div className="absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun6bks-gold/5" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-sun6bks-gold/10" />
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
            🌟 Talent
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Our{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Performers
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Komedian lokal Bekasi dengan gaya unik dan material segar yang siap bikin kamu ngakak!
          </p>
        </motion.div>

        {/* Performers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {PERFORMERS.map((performer) => (
            <motion.div
              key={performer.id}
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -10 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 backdrop-blur-sm transition-all duration-500 hover:border-sun6bks-gold/30"
            >
              {/* Avatar Placeholder */}
              <div className="relative mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full">
                <div className="absolute inset-0 bg-gradient-to-br from-sun6bks-gold/30 to-sun6bks-orange/30" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Mic className="h-12 w-12 text-sun6bks-gold/50" />
                </div>
                {/* Hover Glow Effect */}
                <motion.div
                  className="absolute -inset-2 rounded-full bg-sun6bks-gold/20 blur-xl opacity-0 transition-opacity group-hover:opacity-100"
                  animate={{
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
              </div>

              {/* Name & Bio */}
              <div className="text-center">
                <h3 className="mb-1 text-xl font-bold text-white transition-colors group-hover:text-sun6bks-gold">
                  {performer.name}
                </h3>
                <p className="mb-3 text-sm text-sun6bks-gold">
                  &ldquo;{performer.nickname}&rdquo;
                </p>
                <p className="mb-4 text-sm text-gray-400">
                  {performer.bio}
                </p>

                {/* Stats */}
                <div className="mb-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                  <span className="rounded-full bg-white/5 px-3 py-1">
                    {performer.showsCount} Shows
                  </span>
                </div>

                {/* Social Links */}
                <div className="flex items-center justify-center gap-3">
                  <motion.a
                    href={`https://instagram.com/${performer.instagram.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.2, rotate: 5 }}
                    className="rounded-full bg-white/10 p-2 text-gray-400 transition-colors hover:bg-sun6bks-gold/20 hover:text-sun6bks-gold"
                  >
                    <Instagram className="h-4 w-4" />
                  </motion.a>
                  {performer.youtube && (
                    <motion.a
                      href={`https://youtube.com/${performer.youtube}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.2, rotate: -5 }}
                      className="rounded-full bg-white/10 p-2 text-gray-400 transition-colors hover:bg-sun6bks-gold/20 hover:text-sun6bks-gold"
                    >
                      <Youtube className="h-4 w-4" />
                    </motion.a>
                  )}
                </div>
              </div>

              {/* Decorative Corner */}
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sun6bks-gold/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-12 text-center"
        >
          <p className="mb-4 text-gray-400">
            Mau tampil di SUN 6 BKS? 
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 rounded-full border border-sun6bks-gold/50 bg-transparent px-6 py-3 font-semibold text-sun6bks-gold transition-all hover:bg-sun6bks-gold/10"
          >
            <Mic className="h-4 w-4" />
            Daftar Open Mic
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
};
