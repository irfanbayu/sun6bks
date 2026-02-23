import { getLandingEvent } from "@/actions/events";
import { isAdmin } from "@/lib/auth";
import HomePageClient from "./client";

// Data depends on Supabase at runtime — skip static pre-render
export const dynamic = "force-dynamic";

/**
 * Public landing page — Server Component.
 * Fetches single event (SINGLE_EVENT_SLUG or nearest) and passes to client.
 */
const HomePage = async () => {
  const [landingEvent, userIsAdmin] = await Promise.all([
    getLandingEvent(),
    isAdmin(),
  ]);

  return <HomePageClient landingEvent={landingEvent} isAdmin={userIsAdmin} />;
};

export default HomePage;
