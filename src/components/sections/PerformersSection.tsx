"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Instagram, Youtube, Mic } from "lucide-react";
import Image from "next/image";

type Performer = {
  name: string;
  image: string;
  instagram: string;
  youtube: string;
};

type PerformersSectionProps = {
  performers: Performer[];
};

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

export const PerformersSection = ({ performers }: PerformersSectionProps) => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  if (performers.length === 0) {
    return null;
  }

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
            Talent
          </span>
          <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
            Our{" "}
            <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
              Performers
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            Komedian dengan gaya unik dan material segar yang siap bikin kamu
            ngakak!
          </p>
        </motion.div>

        {/* Performers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {performers.map((performer, index) => (
            <motion.div
              key={`${performer.name}-${index}`}
              variants={cardVariants}
              whileHover={{ scale: 1.05, y: -10 }}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6 backdrop-blur-sm transition-all duration-500 hover:border-sun6bks-gold/30"
            >
              {/* Avatar */}
              <div className="relative mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full">
                {performer.image ? (
                  <Image
                    src={performer.image}
                    alt={performer.name}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-sun6bks-gold/30 to-sun6bks-orange/30" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Mic className="h-12 w-12 text-sun6bks-gold/50" />
                    </div>
                  </>
                )}
                {/* Hover Glow Effect */}
                <motion.div
                  className="absolute -inset-2 rounded-full bg-sun6bks-gold/20 opacity-0 blur-xl transition-opacity group-hover:opacity-100"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </div>

              {/* Name */}
              <div className="text-center">
                <h3 className="mb-3 text-xl font-bold text-white transition-colors group-hover:text-sun6bks-gold">
                  {performer.name}
                </h3>

                {/* Social Links */}
                <div className="flex items-center justify-center gap-3">
                  {performer.instagram && (
                    <motion.a
                      href={`https://instagram.com/${performer.instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.2, rotate: 5 }}
                      className="rounded-full bg-white/10 p-2 text-gray-400 transition-colors hover:bg-sun6bks-gold/20 hover:text-sun6bks-gold"
                    >
                      <Instagram className="h-4 w-4" />
                    </motion.a>
                  )}
                  {performer.youtube && (
                    <motion.a
                      href={
                        performer.youtube.startsWith("http")
                          ? performer.youtube
                          : `https://youtube.com/${performer.youtube}`
                      }
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
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-sun6bks-gold/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100" />
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
          <p className="mb-4 text-gray-400">Mau tampil di SUN 6 BKS?</p>
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
