import { getAdminEvents } from "@/actions/admin-events";
import { AdminEventsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const events = await getAdminEvents();

  // Serialize minimal data to client — server-serialization best practice
  const serializedEvents = events.map((e) => ({
    id: e.id,
    title: e.title,
    slug: e.slug,
    description: e.description,
    date: e.date,
    time_label: e.time_label,
    venue: e.venue,
    venue_address: e.venue_address,
    venue_lat: e.venue_lat,
    venue_lng: e.venue_lng,
    performers: (e.performers ?? []).map((p) => ({
      name: p.name ?? "",
      image: p.image ?? "",
      instagram: p.instagram ?? "",
      youtube: p.youtube ?? "",
    })),
    image_url: e.image_url,
    is_published: e.is_published,
    created_at: e.created_at,
    categories: (e.ticket_categories || []).map((c) => ({
      id: c.id,
      name: c.name,
      price: c.price,
      description: c.description ?? "",
      features: c.features ?? [],
      sort_order: c.sort_order,
      is_active: c.is_active,
      total_stock: c.ticket_stocks?.total_stock ?? 0,
      remaining_stock: c.ticket_stocks?.remaining_stock ?? 0,
    })),
  }));

  return (
    <div>
      <h2 className="mb-6 text-2xl font-bold text-white">Kelola Events</h2>
      <AdminEventsClient events={serializedEvents} />
    </div>
  );
}
