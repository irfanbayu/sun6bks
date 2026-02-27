import type { PerformerInput } from "@/actions/admin-events";

export type CategoryData = {
  id?: number;
  name: string;
  price: number;
  description: string;
  features: string[];
  sort_order: number;
  is_active: boolean;
  total_stock: number;
  remaining_stock: number;
};

export type EventData = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  date: string;
  time_label: string;
  venue: string;
  venue_address: string | null;
  venue_lat: number | null;
  venue_lng: number | null;
  venue_maps_url: string | null;
  venue_image_url: string | null;
  performers: PerformerInput[];
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  categories: CategoryData[];
};
