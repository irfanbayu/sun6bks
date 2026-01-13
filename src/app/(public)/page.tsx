"use client";

import { SmoothScrollProvider } from "@/components/providers";
import { Navbar } from "@/components/layout";
import {
  HeroSection,
  EventsSection,
  PerformersSection,
  VenuesSection,
  PricingSection,
  FooterSection,
} from "@/components/sections";

const HomePage = () => {
  return (
    <SmoothScrollProvider>
      <Navbar />
      <main className="bg-sun6bks-dark">
        <HeroSection />
        <EventsSection />
        <PerformersSection />
        <VenuesSection />
        <PricingSection />
        <FooterSection />
      </main>
    </SmoothScrollProvider>
  );
};

export default HomePage;
