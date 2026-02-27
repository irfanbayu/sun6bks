"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Ticket,
  Trash2,
  Users,
} from "lucide-react";
import {
  createEvent,
  deleteEvent,
  toggleEventPublished,
  updateEvent,
  type EventInput,
  type PerformerInput,
} from "@/actions/admin-events";
import {
  uploadEventPosterImage,
  uploadPerformerImage,
  uploadVenueImage,
} from "@/actions/admin-storage";
import { formatCurrencyIDR, formatDateIDLong } from "@/lib/formatters";
import type { CategoryData, EventData } from "./types";

const EventForm = dynamic(
  () => import("./components/EventForm").then((mod) => mod.EventForm),
  {
    loading: () => (
      <div className="mb-8 rounded-xl border border-sun6bks-gold/30 bg-white/5 p-6 text-sm text-gray-400">
        Memuat form event...
      </div>
    ),
  },
);

type AdminEventsClientProps = {
  events: EventData[];
};

const EMPTY_PERFORMER: PerformerInput = {
  name: "",
  image: "",
  instagram: "",
  youtube: "",
  description: "",
};

const EMPTY_CATEGORY: CategoryData = {
  name: "",
  price: 0,
  description: "",
  features: [],
  sort_order: 0,
  is_active: true,
  total_stock: 100,
  remaining_stock: 100,
};

const EMPTY_FORM: EventInput = {
  title: "",
  slug: "",
  description: "",
  date: "",
  time_label: "20:00 WIB",
  venue: "",
  venue_address: "",
  venue_lat: null,
  venue_lng: null,
  venue_maps_url: "",
  venue_image_url: "",
  performers: [{ ...EMPTY_PERFORMER }],
  image_url: "",
  is_published: false,
  categories: [{ ...EMPTY_CATEGORY, sort_order: 0 }],
};

const toDatetimeLocal = (iso: string): string => {
  try {
    const dateValue = new Date(iso);
    const offset = dateValue.getTimezoneOffset();
    const local = new Date(dateValue.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  } catch {
    return "";
  }
};

const generateSlug = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

export const AdminEventsClient = ({ events }: AdminEventsClientProps) => {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [isUploadingPoster, setIsUploadingPoster] = useState(false);
  const [isUploadingVenueImage, setIsUploadingVenueImage] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);

  const handleOpenCreate = useCallback(() => {
    setEditingEventId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
    setMessage(null);
  }, []);

  const handleOpenEdit = useCallback((event: EventData) => {
    setEditingEventId(event.id);
    setForm({
      title: event.title,
      slug: event.slug,
      description: event.description ?? "",
      date: toDatetimeLocal(event.date),
      time_label: event.time_label,
      venue: event.venue,
      venue_address: event.venue_address ?? "",
      venue_lat: event.venue_lat,
      venue_lng: event.venue_lng,
      venue_maps_url: event.venue_maps_url ?? "",
      venue_image_url: event.venue_image_url ?? "",
      performers:
        event.performers.length > 0
          ? event.performers.map((performer) => ({
              name: performer.name ?? "",
              image: performer.image ?? "",
              instagram: performer.instagram ?? "",
              youtube: performer.youtube ?? "",
              description: performer.description ?? "",
            }))
          : [{ ...EMPTY_PERFORMER }],
      image_url: event.image_url ?? "",
      is_published: event.is_published,
      categories:
        event.categories.length > 0
          ? event.categories.map((category) => ({
              ...category,
              description: category.description ?? "",
              features: category.features ?? [],
            }))
          : [{ ...EMPTY_CATEGORY, sort_order: 0 }],
    });
    setShowForm(true);
    setMessage(null);
  }, []);

  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingEventId(null);
    setMessage(null);
  }, []);

  const handleFieldChange = useCallback(
    (field: keyof EventInput, value: string | boolean | null) => {
      setForm((prev) => {
        const nextForm = { ...prev, [field]: value };
        if (field === "title" && !prev.slug) {
          nextForm.slug = generateSlug(value as string);
        }
        return nextForm;
      });
    },
    [],
  );

  const handlePerformerChange = useCallback(
    (index: number, field: keyof PerformerInput, value: string) => {
      setForm((prev) => ({
        ...prev,
        performers: prev.performers.map((performer, performerIndex) =>
          performerIndex === index
            ? { ...performer, [field]: value }
            : performer,
        ),
      }));
    },
    [],
  );

  const handleAddPerformer = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      performers: [...prev.performers, { ...EMPTY_PERFORMER }],
    }));
  }, []);

  const handleRemovePerformer = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      performers: prev.performers.filter(
        (_, performerIndex) => performerIndex !== index,
      ),
    }));
  }, []);

  const handleMovePerformer = useCallback(
    (fromIndex: number, toIndex: number) => {
      setForm((prev) => {
        if (
          fromIndex === toIndex ||
          fromIndex < 0 ||
          toIndex < 0 ||
          fromIndex >= prev.performers.length ||
          toIndex >= prev.performers.length
        ) {
          return prev;
        }

        const nextPerformers = [...prev.performers];
        const [movedPerformer] = nextPerformers.splice(fromIndex, 1);
        nextPerformers.splice(toIndex, 0, movedPerformer);
        return { ...prev, performers: nextPerformers };
      });
    },
    [],
  );

  const handleUploadPerformerImage = useCallback(
    async (index: number, file: File) => {
      setUploadingIndex(index);
      setMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadPerformerImage(formData);
      if (result.success) {
        setForm((prev) => ({
          ...prev,
          performers: prev.performers.map((performer, performerIndex) =>
            performerIndex === index
              ? { ...performer, image: result.url }
              : performer,
          ),
        }));
      } else {
        setMessage({ text: result.message, success: false });
      }

      setUploadingIndex(null);
    },
    [],
  );

  const handleUploadPosterImage = useCallback(async (file: File) => {
    setIsUploadingPoster(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadEventPosterImage(formData);

    if (result.success) {
      setForm((prev) => ({ ...prev, image_url: result.url }));
    } else {
      setMessage({ text: result.message, success: false });
    }

    setIsUploadingPoster(false);
  }, []);

  const handleUploadVenueImage = useCallback(async (file: File) => {
    setIsUploadingVenueImage(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadVenueImage(formData);

    if (result.success) {
      setForm((prev) => ({ ...prev, venue_image_url: result.url }));
    } else {
      setMessage({ text: result.message, success: false });
    }

    setIsUploadingVenueImage(false);
  }, []);

  const handleCategoryChange = useCallback(
    (
      catIndex: number,
      field: keyof CategoryData,
      value: string | number | boolean,
    ) => {
      setForm((prev) => ({
        ...prev,
        categories: prev.categories.map((category, index) =>
          index === catIndex ? { ...category, [field]: value } : category,
        ),
      }));
    },
    [],
  );

  const handleCategoryFeatureChange = useCallback(
    (catIndex: number, featIndex: number, value: string) => {
      setForm((prev) => ({
        ...prev,
        categories: prev.categories.map((category, index) => {
          if (index !== catIndex) {
            return category;
          }
          const nextFeatures = [...category.features];
          nextFeatures[featIndex] = value;
          return { ...category, features: nextFeatures };
        }),
      }));
    },
    [],
  );

  const handleAddCategoryFeature = useCallback((catIndex: number) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.map((category, index) =>
        index === catIndex
          ? { ...category, features: [...category.features, ""] }
          : category,
      ),
    }));
  }, []);

  const handleRemoveCategoryFeature = useCallback(
    (catIndex: number, featIndex: number) => {
      setForm((prev) => ({
        ...prev,
        categories: prev.categories.map((category, index) =>
          index === catIndex
            ? {
                ...category,
                features: category.features.filter(
                  (_, indexValue) => indexValue !== featIndex,
                ),
              }
            : category,
        ),
      }));
    },
    [],
  );

  const handleAddCategory = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        { ...EMPTY_CATEGORY, sort_order: prev.categories.length },
      ],
    }));
  }, []);

  const handleRemoveCategory = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      categories: prev.categories.filter(
        (_, categoryIndex) => categoryIndex !== index,
      ),
    }));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.date || !form.venue.trim()) {
      setMessage({
        text: "Judul, tanggal, dan venue wajib diisi.",
        success: false,
      });
      return;
    }

    if (form.categories.length === 0) {
      setMessage({ text: "Minimal 1 kategori tiket.", success: false });
      return;
    }

    for (const category of form.categories) {
      if (!category.name.trim()) {
        setMessage({
          text: "Nama kategori tidak boleh kosong.",
          success: false,
        });
        return;
      }
    }

    const actionKey = editingEventId ? "update" : "create";
    setLoading(actionKey);
    setMessage(null);

    const result = editingEventId
      ? await updateEvent(editingEventId, form)
      : await createEvent(form);

    setLoading(null);
    setMessage({ text: result.message, success: result.success });

    if (!result.success) {
      return;
    }

    setShowForm(false);
    setEditingEventId(null);
    router.refresh();
  }, [editingEventId, form, router]);

  const handleDelete = useCallback(
    async (eventId: number, title: string) => {
      const confirmed = window.confirm(
        `Yakin ingin menghapus event "${title}"?\nSemua kategori dan stok tiket akan ikut terhapus.`,
      );
      if (!confirmed) {
        return;
      }

      setLoading(`delete-${eventId}`);
      const result = await deleteEvent(eventId);
      setLoading(null);
      setMessage({ text: result.message, success: result.success });

      if (result.success) {
        router.refresh();
      }
    },
    [router],
  );

  const handleTogglePublished = useCallback(
    async (eventId: number, currentStatus: boolean) => {
      setLoading(`toggle-${eventId}`);
      const result = await toggleEventPublished(eventId, !currentStatus);
      setLoading(null);
      setMessage({ text: result.message, success: result.success });

      if (result.success) {
        router.refresh();
      }
    },
    [router],
  );

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {events.length} event{events.length !== 1 ? "s" : ""} ditemukan
        </p>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-lg bg-sun6bks-gold px-4 py-2 text-sm font-bold text-sun6bks-dark transition-colors hover:bg-sun6bks-gold/90"
        >
          <Plus className="h-4 w-4" />
          Tambah Event
        </button>
      </div>

      {message && !showForm && (
        <div
          className={`mb-6 rounded-lg border p-4 text-sm ${
            message.success
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {showForm && (
        <EventForm
          form={form}
          editingEventId={editingEventId}
          loading={loading}
          uploadingIndex={uploadingIndex}
          isUploadingPoster={isUploadingPoster}
          isUploadingVenueImage={isUploadingVenueImage}
          message={message}
          onFieldChange={handleFieldChange}
          onPerformerChange={handlePerformerChange}
          onUploadPerformerImage={handleUploadPerformerImage}
          onUploadPosterImage={handleUploadPosterImage}
          onUploadVenueImage={handleUploadVenueImage}
          onAddPerformer={handleAddPerformer}
          onRemovePerformer={handleRemovePerformer}
          onMovePerformer={handleMovePerformer}
          onCategoryChange={handleCategoryChange}
          onCategoryFeatureChange={handleCategoryFeatureChange}
          onAddCategoryFeature={handleAddCategoryFeature}
          onRemoveCategoryFeature={handleRemoveCategoryFeature}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
          onSubmit={handleSubmit}
          onClose={handleCloseForm}
        />
      )}

      {events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <p className="text-gray-400">
            Belum ada event. Buat event pertamamu.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isExpanded={expandedEventId === event.id}
              loading={loading}
              onToggleExpand={() =>
                setExpandedEventId((prev) =>
                  prev === event.id ? null : event.id,
                )
              }
              onEdit={() => handleOpenEdit(event)}
              onDelete={() => void handleDelete(event.id, event.title)}
              onTogglePublished={() =>
                void handleTogglePublished(event.id, event.is_published)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

type EventCardProps = {
  event: EventData;
  isExpanded: boolean;
  loading: string | null;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublished: () => void;
};

const EventCard = ({
  event,
  isExpanded,
  loading,
  onToggleExpand,
  onEdit,
  onDelete,
  onTogglePublished,
}: EventCardProps) => {
  const totalStock = event.categories.reduce(
    (sum, category) => sum + category.total_stock,
    0,
  );
  const remainingStock = event.categories.reduce(
    (sum, category) => sum + category.remaining_stock,
    0,
  );
  const soldCount = totalStock - remainingStock;
  const sortedCategories = [...event.categories].sort(
    (first, second) => first.sort_order - second.sort_order,
  );

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20">
      <div className="flex items-center justify-between p-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span
            className={`mt-1 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              event.is_published
                ? "bg-green-400/10 text-green-400"
                : "bg-gray-400/10 text-gray-500"
            }`}
          >
            {event.is_published ? "Published" : "Draft"}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-white">
              {event.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDateIDLong(event.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {event.venue}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {event.performers.length} performer
              </span>
              <span className="flex items-center gap-1">
                <Ticket className="h-3.5 w-3.5" />
                {soldCount}/{totalStock} terjual
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <button
            onClick={onTogglePublished}
            disabled={loading === `toggle-${event.id}`}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
              event.is_published
                ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                : "bg-gray-500/10 text-gray-400 hover:bg-gray-500/20"
            } disabled:cursor-not-allowed disabled:opacity-50`}
            title={event.is_published ? "Unpublish" : "Publish"}
          >
            {loading === `toggle-${event.id}` ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : event.is_published ? (
              <Eye className="h-3.5 w-3.5" />
            ) : (
              <EyeOff className="h-3.5 w-3.5" />
            )}
            {event.is_published ? "Published" : "Draft"}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/20"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            disabled={loading === `delete-${event.id}`}
            className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading === `delete-${event.id}` ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            Hapus
          </button>
          <button
            onClick={onToggleExpand}
            className="rounded-lg bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">
            Kategori Tiket ({event.categories.length})
          </h4>
          {event.categories.length === 0 ? (
            <p className="text-sm text-gray-500">Belum ada kategori tiket.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCategories.map((category) => (
                <div
                  key={category.id ?? category.name}
                  className={`rounded-lg border p-4 ${
                    category.is_active
                      ? "border-white/10 bg-white/[0.03]"
                      : "border-white/5 bg-white/[0.01] opacity-60"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-medium text-white">
                      {category.name}
                    </span>
                    <span
                      className={`text-xs ${
                        category.is_active ? "text-green-400" : "text-gray-500"
                      }`}
                    >
                      {category.is_active ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="text-lg font-bold text-sun6bks-gold">
                    {formatCurrencyIDR(category.price)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Stok: {category.remaining_stock} / {category.total_stock}
                  </p>
                  {category.features.length > 0 && (
                    <ul className="mt-2 space-y-0.5">
                      {category.features.map((feature, index) => (
                        <li key={index} className="text-xs text-gray-500">
                          • {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
