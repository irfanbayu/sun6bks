import { getLandingEvent } from "@/actions/events";
import HomePageClient from "./client";

// Data depends on Supabase at runtime — skip static pre-render
export const dynamic = "force-dynamic";

/**
 * Public landing page — Server Component.
 * Fetches single event (SINGLE_EVENT_SLUG or nearest) and passes to client.
 */
const HomePage = async () => {
  const landingEvent = await getLandingEvent();

  return <HomePageClient landingEvent={landingEvent} />;
};

export default HomePage;
