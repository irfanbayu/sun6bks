"use client";

import { useMemo, useState, useCallback } from "react";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { Navbar } from "@/components/layout";
import { HeroSection } from "@/components/sections/HeroSection";
import { EventsSection } from "@/components/sections/EventsSection";
import { PerformersSection } from "@/components/sections/PerformersSection";
import { VenuesSection } from "@/components/sections/VenuesSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { FooterSection } from "@/components/sections/FooterSection";
import { BuyTicketModal, type EventData } from "@/components/ui";
import type { LandingEvent } from "@/types";

type HomePageClientProps = {
  landingEvent: LandingEvent | null;
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

const buildEventDataMap = (
  event: LandingEvent
): Map<number, EventData> => {
  const map = new Map<number, EventData>();
  for (const cat of event.categories) {
    map.set(cat.id, {
      id: event.id,
      title: event.title,
      date: formatDate(event.date),
      time: event.time_label,
      venue: event.venue,
      performers: event.performers,
      categoryId: cat.id,
      categoryName: cat.name,
      price: formatPrice(cat.price),
      priceNumber: cat.price,
      spotsLeft: cat.spotsLeft,
    });
  }
  return map;
};

const HomePageClient = ({ landingEvent }: HomePageClientProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEventData, setSelectedEventData] = useState<EventData | null>(
    null
  );
  const [ticketQuantity, setTicketQuantity] = useState(1);

  const { eventDataByCategoryId, defaultCategoryId } = useMemo(() => {
    if (!landingEvent || landingEvent.categories.length === 0) {
      return { eventDataByCategoryId: new Map<number, EventData>(), defaultCategoryId: 0 };
    }
    const map = buildEventDataMap(landingEvent);
    const cheapest = landingEvent.categories.reduce((min, c) =>
      c.price < min.price ? c : min
    );
    return {
      eventDataByCategoryId: map,
      defaultCategoryId: cheapest.id,
    };
  }, [landingEvent]);

  const handleOpenCheckout = useCallback(
    (categoryId?: number) => {
      const id = categoryId ?? defaultCategoryId;
      const data = eventDataByCategoryId.get(id);
      if (data) {
        setSelectedEventData(data);
        setTicketQuantity(1);
        setIsModalOpen(true);
      }
    },
    [defaultCategoryId, eventDataByCategoryId]
  );

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedEventData(null);
  }, []);

  const handleQuantityChange = useCallback((quantity: number) => {
    setTicketQuantity(quantity);
  }, []);

  return (
    <SmoothScrollProvider>
      <Navbar onBuyTicket={landingEvent ? () => handleOpenCheckout() : undefined} />
      <main className="bg-sun6bks-dark">
        <HeroSection
          landingEvent={landingEvent}
          onBuyTicket={landingEvent ? () => handleOpenCheckout() : undefined}
        />
        <EventsSection
          landingEvent={landingEvent}
          onBuyCategory={handleOpenCheckout}
        />
        <PerformersSection />
        <VenuesSection />
        <PricingSection
          dbCategories={
            landingEvent?.categories.map((c) => ({
              id: c.id,
              name: c.name,
              price: c.price,
              description: c.description,
              features: c.features,
              sort_order: c.sort_order,
              is_active: true,
              ticket_stocks: { remaining_stock: c.spotsLeft },
            })) ?? []
          }
          onBuyCategory={handleOpenCheckout}
        />
        <FooterSection />
      </main>
      <BuyTicketModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        event={selectedEventData}
        ticketQuantity={ticketQuantity}
        onQuantityChange={handleQuantityChange}
      />
    </SmoothScrollProvider>
  );
};

export default HomePageClient;
