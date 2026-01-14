"use client";

import { useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { Calendar, Clock, MapPin, Users, Ticket } from "lucide-react";
import { BuyTicketModal, type EventData } from "@/components/ui";

type Event = {
  id: number;
  title: string;
  date: string;
  time: string;
  venue: string;
  performers: string[];
  price: string;
  priceNumber: number;
  spotsLeft: number;
  image: string;
};

// Static data - akan diganti dengan API call nanti
const SAMPLE_EVENTS: Event[] = [
  {
    id: 1,
    title: "SUN 6 BKS #6 - Malam Komedi Bekasi",
    date: "20 Jan 2026",
    time: "20:00 WIB",
    venue: "Komik Station Bekasi Square",
    performers: ["Dedi", "Echa", "Fajar", "Rina"],
    price: "Rp50.000",
    priceNumber: 50000,
    spotsLeft: 45,
    image: "/events/sun6-jan.jpg",
  },
  {
    id: 2,
    title: "SUN 6 BKS #7 - Komedi Valentines",
    date: "14 Feb 2026",
    time: "19:30 WIB",
    venue: "Standup Bekasi Mall",
    performers: ["Budi", "Citra", "Ahmad"],
    price: "Rp75.000",
    priceNumber: 75000,
    spotsLeft: 80,
    image: "/events/sun6-feb.jpg",
  },
  {
    id: 3,
    title: "SUN 6 BKS #8 - Roasting Night",
    date: "28 Feb 2026",
    time: "20:00 WIB",
    venue: "KTV Spot Bekasi Selatan",
    performers: ["Joko", "Dewi", "Rudi", "Sari"],
    price: "Rp60.000",
    priceNumber: 60000,
    spotsLeft: 30,
    image: "/events/sun6-roast.jpg",
  },
  {
    id: 4,
    title: "SUN 6 BKS #9 - Weekend Chill",
    date: "15 Mar 2026",
    time: "19:00 WIB",
    venue: "Komik Station Bekasi Square",
    performers: ["Rina", "Fajar", "Budi"],
    price: "Rp50.000",
    priceNumber: 50000,
    spotsLeft: 60,
    image: "/events/sun6-mar.jpg",
  },
  {
    id: 5,
    title: "SUN 6 BKS #10 - Anniversary Special",
    date: "05 Apr 2026",
    time: "19:30 WIB",
    venue: "Bekasi Convention Center",
    performers: ["All Star Lineup"],
    price: "Rp100.000",
    priceNumber: 100000,
    spotsLeft: 150,
    image: "/events/sun6-anniversary.jpg",
  },
  {
    id: 6,
    title: "SUN 6 BKS #11 - Open Mic Night",
    date: "20 Apr 2026",
    time: "20:00 WIB",
    venue: "Standup Bekasi Mall",
    performers: ["Open Registration"],
    price: "Rp35.000",
    priceNumber: 35000,
    spotsLeft: 100,
    image: "/events/sun6-openmic.jpg",
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
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export const EventsSection = () => {
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" });

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);

  const handleCardClick = (event: Event) => {
    const eventData: EventData = {
      id: event.id,
      title: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
      performers: event.performers,
      price: event.price,
      priceNumber: event.priceNumber,
      spotsLeft: event.spotsLeft,
    };
    setSelectedEvent(eventData);
    setTicketQuantity(1);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleQuantityChange = (quantity: number) => {
    setTicketQuantity(quantity);
  };

  const handleCheckout = () => {
    // TODO: Integrate with Midtrans payment gateway
    console.log("Checkout:", {
      event: selectedEvent,
      quantity: ticketQuantity,
      total: selectedEvent ? selectedEvent.priceNumber * ticketQuantity : 0,
    });
    alert(
      `🎭 Checkout berhasil!\n\nEvent: ${selectedEvent?.title}\nJumlah: ${ticketQuantity} tiket\nTotal: Rp${(selectedEvent?.priceNumber ?? 0) * ticketQuantity}\n\n(Integrasi Midtrans akan segera hadir)`
    );
    handleCloseModal();
  };

  return (
    <>
      <section
        ref={sectionRef}
        id="events"
        className="relative bg-gradient-to-b from-sun6bks-dark via-[#0f0f0f] to-sun6bks-dark py-20 md:py-32"
      >
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-1/4 top-1/4 h-96 w-96 rounded-full bg-sun6bks-gold/5 blur-3xl" />
          <div className="absolute -right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-sun6bks-orange/5 blur-3xl" />
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
              🎭 Events
            </span>
            <h2 className="mb-4 text-4xl font-bold text-white md:text-5xl lg:text-6xl">
              Upcoming{" "}
              <span className="bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange bg-clip-text text-transparent">
                Shows
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-gray-400">
              Jangan sampai kehabisan tiket! Pilih event favoritmu dan siap-siap
              ketawa lepas.
            </p>
          </motion.div>

          {/* Events Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {SAMPLE_EVENTS.map((event) => (
              <motion.div
                key={event.id}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                onClick={() => handleCardClick(event)}
                className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-sm transition-all duration-300 hover:border-sun6bks-gold/30"
              >
                {/* Card Image Placeholder */}
                <div className="relative h-48 overflow-hidden bg-gradient-to-br from-sun6bks-gold/20 to-sun6bks-orange/20">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Ticket className="h-16 w-16 text-sun6bks-gold/30" />
                  </div>
                  {/* Spots Left Badge */}
                  <div className="absolute right-3 top-3 rounded-full bg-sun6bks-dark/80 px-3 py-1 text-xs font-semibold text-sun6bks-gold backdrop-blur-sm">
                    {event.spotsLeft} spots left
                  </div>
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-sun6bks-dark via-transparent to-transparent" />
                </div>

                {/* Card Content */}
                <div className="p-6">
                  <h3 className="mb-3 text-xl font-bold text-white transition-colors group-hover:text-sun6bks-gold">
                    {event.title}
                  </h3>

                  <div className="mb-4 space-y-2 text-sm text-gray-400">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-sun6bks-gold" />
                      <span>{event.date}</span>
                      <Clock className="ml-2 h-4 w-4 text-sun6bks-gold" />
                      <span>{event.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-sun6bks-gold" />
                      <span className="truncate">{event.venue}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-sun6bks-gold" />
                      <span className="truncate">
                        {event.performers.join(", ")}
                      </span>
                    </div>
                  </div>

                  {/* Price & CTA */}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-sun6bks-gold">
                      {event.price}
                    </span>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(event);
                      }}
                      className="rounded-full bg-gradient-to-r from-sun6bks-gold to-sun6bks-orange px-5 py-2 text-sm font-bold text-sun6bks-dark transition-shadow hover:shadow-lg hover:shadow-sun6bks-gold/25"
                    >
                      Beli Tiket
                    </motion.button>
                  </div>
                </div>

                {/* Hover Glow Effect */}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <div className="absolute inset-0 bg-gradient-to-t from-sun6bks-gold/5 via-transparent to-transparent" />
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* View All Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8 }}
            className="mt-12 text-center"
          >
            <button className="group inline-flex items-center gap-2 text-sun6bks-gold transition-colors hover:text-sun6bks-orange">
              <span className="font-semibold">Lihat Semua Event</span>
              <motion.span
                animate={{ x: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                →
              </motion.span>
            </button>
          </motion.div>
        </div>
      </section>

      {/* Buy Ticket Modal */}
      <BuyTicketModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        ticketQuantity={ticketQuantity}
        onQuantityChange={handleQuantityChange}
        onCheckout={handleCheckout}
      />
    </>
  );
};
