"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Users,
  Ticket,
  Upload,
  ImageIcon,
} from "lucide-react";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  toggleEventPublished,
  type EventInput,
  type PerformerInput,
} from "@/actions/admin-events";
import { uploadPerformerImage } from "@/actions/admin-storage";

// ─── Types ────────────────────────────────────────────────────

type CategoryData = {
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

type EventData = {
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
  performers: PerformerInput[];
  image_url: string | null;
  is_published: boolean;
  created_at: string;
  categories: CategoryData[];
};

type AdminEventsClientProps = {
  events: EventData[];
};

// ─── Constants ────────────────────────────────────────────────

const EMPTY_PERFORMER: PerformerInput = {
  name: "",
  image: "",
  instagram: "",
  youtube: "",
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
  performers: [{ ...EMPTY_PERFORMER }],
  image_url: "",
  is_published: false,
  categories: [{ ...EMPTY_CATEGORY, sort_order: 0 }],
};

// ─── Helpers ──────────────────────────────────────────────────

const formatDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);

const toDatetimeLocal = (iso: string): string => {
  try {
    const d = new Date(iso);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
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

// ─── Main Component ──────────────────────────────────────────

export const AdminEventsClient = ({ events }: AdminEventsClientProps) => {
  const router = useRouter();

  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    success: boolean;
  } | null>(null);

  // Form state
  const [form, setForm] = useState<EventInput>(EMPTY_FORM);

  // ─── Form Handlers ───────────────────────────────────────

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
      performers:
        event.performers.length > 0
          ? event.performers.map((p) => ({
              name: p.name ?? "",
              image: p.image ?? "",
              instagram: p.instagram ?? "",
              youtube: p.youtube ?? "",
            }))
          : [{ ...EMPTY_PERFORMER }],
      image_url: event.image_url ?? "",
      is_published: event.is_published,
      categories:
        event.categories.length > 0
          ? event.categories.map((c) => ({
              ...c,
              description: c.description ?? "",
              features: c.features ?? [],
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
        const updated = { ...prev, [field]: value };
        // Auto-generate slug from title when creating
        if (field === "title" && !prev.slug) {
          updated.slug = generateSlug(value as string);
        }
        return updated;
      });
    },
    []
  );

  // ─── Performer Handlers ──────────────────────────────────

  const handlePerformerChange = useCallback(
    (index: number, field: keyof PerformerInput, value: string) => {
      setForm((prev) => {
        const performers = prev.performers.map((p, i) =>
          i === index ? { ...p, [field]: value } : p
        );
        return { ...prev, performers };
      });
    },
    []
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
      performers: prev.performers.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUploadPerformerImage = useCallback(
    async (index: number, file: File) => {
      setUploadingIndex(index);
      setMessage(null);

      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadPerformerImage(formData);

      if (result.success) {
        setForm((prev) => {
          const performers = prev.performers.map((p, i) =>
            i === index ? { ...p, image: result.url } : p
          );
          return { ...prev, performers };
        });
      } else {
        setMessage({ text: result.message, success: false });
      }

      setUploadingIndex(null);
    },
    []
  );

  // ─── Category Handlers ───────────────────────────────────

  const handleCategoryChange = useCallback(
    (
      catIndex: number,
      field: keyof CategoryData,
      value: string | number | boolean
    ) => {
      setForm((prev) => {
        const categories = prev.categories.map((c, i) =>
          i === catIndex ? { ...c, [field]: value } : c
        );
        return { ...prev, categories };
      });
    },
    []
  );

  const handleCategoryFeatureChange = useCallback(
    (catIndex: number, featIndex: number, value: string) => {
      setForm((prev) => {
        const categories = prev.categories.map((c, i) => {
          if (i !== catIndex) return c;
          const features = [...c.features];
          features[featIndex] = value;
          return { ...c, features };
        });
        return { ...prev, categories };
      });
    },
    []
  );

  const handleAddCategoryFeature = useCallback((catIndex: number) => {
    setForm((prev) => {
      const categories = prev.categories.map((c, i) =>
        i === catIndex ? { ...c, features: [...c.features, ""] } : c
      );
      return { ...prev, categories };
    });
  }, []);

  const handleRemoveCategoryFeature = useCallback(
    (catIndex: number, featIndex: number) => {
      setForm((prev) => {
        const categories = prev.categories.map((c, i) =>
          i === catIndex
            ? { ...c, features: c.features.filter((_, fi) => fi !== featIndex) }
            : c
        );
        return { ...prev, categories };
      });
    },
    []
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
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  }, []);

  // ─── Submit ──────────────────────────────────────────────

  const handleSubmit = useCallback(async () => {
    if (!form.title.trim() || !form.date || !form.venue.trim()) {
      setMessage({ text: "Judul, tanggal, dan venue wajib diisi.", success: false });
      return;
    }

    if (form.categories.length === 0) {
      setMessage({ text: "Minimal 1 kategori tiket.", success: false });
      return;
    }

    for (const cat of form.categories) {
      if (!cat.name.trim()) {
        setMessage({ text: "Nama kategori tidak boleh kosong.", success: false });
        return;
      }
    }

    const actionKey = editingEventId ? "update" : "create";
    setLoading(actionKey);
    setMessage(null);

    const result = editingEventId
      ? await updateEvent(editingEventId, form)
      : await createEvent(form);

    setMessage({ text: result.message, success: result.success });
    setLoading(null);

    if (result.success) {
      setShowForm(false);
      setEditingEventId(null);
      router.refresh();
    }
  }, [form, editingEventId, router]);

  // ─── Delete ──────────────────────────────────────────────

  const handleDelete = useCallback(
    async (eventId: number, title: string) => {
      const confirmed = window.confirm(
        `Yakin ingin menghapus event "${title}"?\nSemua kategori dan stok tiket akan ikut terhapus.`
      );
      if (!confirmed) return;

      setLoading(`delete-${eventId}`);
      const result = await deleteEvent(eventId);
      setMessage({ text: result.message, success: result.success });
      setLoading(null);

      if (result.success) {
        router.refresh();
      }
    },
    [router]
  );

  // ─── Toggle Published ────────────────────────────────────

  const handleTogglePublished = useCallback(
    async (eventId: number, currentStatus: boolean) => {
      setLoading(`toggle-${eventId}`);
      const result = await toggleEventPublished(eventId, !currentStatus);
      setMessage({ text: result.message, success: result.success });
      setLoading(null);

      if (result.success) {
        router.refresh();
      }
    },
    [router]
  );

  // ─── Render ──────────────────────────────────────────────

  return (
    <div>
      {/* Top Actions */}
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

      {/* Global Message */}
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

      {/* Form Modal */}
      {showForm && (
        <EventForm
          form={form}
          editingEventId={editingEventId}
          loading={loading}
          uploadingIndex={uploadingIndex}
          message={message}
          onFieldChange={handleFieldChange}
          onPerformerChange={handlePerformerChange}
          onUploadPerformerImage={handleUploadPerformerImage}
          onAddPerformer={handleAddPerformer}
          onRemovePerformer={handleRemovePerformer}
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

      {/* Events List */}
      {events.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Calendar className="mx-auto mb-4 h-12 w-12 text-gray-600" />
          <p className="text-gray-400">Belum ada event. Buat event pertamamu.</p>
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
                  prev === event.id ? null : event.id
                )
              }
              onEdit={() => handleOpenEdit(event)}
              onDelete={() => handleDelete(event.id, event.title)}
              onTogglePublished={() =>
                handleTogglePublished(event.id, event.is_published)
              }
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── EventCard Component ─────────────────────────────────────

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
  const totalStock = event.categories.reduce((s, c) => s + c.total_stock, 0);
  const remainingStock = event.categories.reduce(
    (s, c) => s + c.remaining_stock,
    0
  );
  const soldCount = totalStock - remainingStock;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20">
      {/* Card Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          {/* Published Badge */}
          <span
            className={`mt-1 flex-shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              event.is_published
                ? "bg-green-400/10 text-green-400"
                : "bg-gray-400/10 text-gray-500"
            }`}
          >
            {event.is_published ? "Published" : "Draft"}
          </span>

          {/* Event Info */}
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-white">
              {event.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {formatDate(event.date)}
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

        {/* Actions */}
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

      {/* Expanded: Category Details */}
      {isExpanded && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-300">
            Kategori Tiket ({event.categories.length})
          </h4>
          {event.categories.length === 0 ? (
            <p className="text-sm text-gray-500">
              Belum ada kategori tiket.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {event.categories
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat) => (
                  <div
                    key={cat.id ?? cat.name}
                    className={`rounded-lg border p-4 ${
                      cat.is_active
                        ? "border-white/10 bg-white/[0.03]"
                        : "border-white/5 bg-white/[0.01] opacity-60"
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium text-white">
                        {cat.name}
                      </span>
                      <span
                        className={`text-xs ${
                          cat.is_active ? "text-green-400" : "text-gray-500"
                        }`}
                      >
                        {cat.is_active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-sun6bks-gold">
                      {formatCurrency(cat.price)}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Stok: {cat.remaining_stock} / {cat.total_stock}
                    </p>
                    {cat.features.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {cat.features.map((f, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-500"
                          >
                            • {f}
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

// ─── EventForm Component ─────────────────────────────────────

type EventFormProps = {
  form: EventInput;
  editingEventId: number | null;
  loading: string | null;
  uploadingIndex: number | null;
  message: { text: string; success: boolean } | null;
  onFieldChange: (field: keyof EventInput, value: string | boolean | null) => void;
  onPerformerChange: (index: number, field: keyof PerformerInput, value: string) => void;
  onUploadPerformerImage: (index: number, file: File) => void;
  onAddPerformer: () => void;
  onRemovePerformer: (index: number) => void;
  onCategoryChange: (
    catIndex: number,
    field: keyof CategoryData,
    value: string | number | boolean
  ) => void;
  onCategoryFeatureChange: (
    catIndex: number,
    featIndex: number,
    value: string
  ) => void;
  onAddCategoryFeature: (catIndex: number) => void;
  onRemoveCategoryFeature: (catIndex: number, featIndex: number) => void;
  onAddCategory: () => void;
  onRemoveCategory: (index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
};

const EventForm = ({
  form,
  editingEventId,
  loading,
  uploadingIndex,
  message,
  onFieldChange,
  onPerformerChange,
  onUploadPerformerImage,
  onAddPerformer,
  onRemovePerformer,
  onCategoryChange,
  onCategoryFeatureChange,
  onAddCategoryFeature,
  onRemoveCategoryFeature,
  onAddCategory,
  onRemoveCategory,
  onSubmit,
  onClose,
}: EventFormProps) => {
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const isSubmitting = loading === "create" || loading === "update";

  return (
    <div className="mb-8 rounded-xl border border-sun6bks-gold/30 bg-white/5 p-6">
      {/* Form Header */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-bold text-sun6bks-gold">
          {editingEventId ? "Edit Event" : "Tambah Event Baru"}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 rounded-lg border p-3 text-sm ${
            message.success
              ? "border-green-500/30 bg-green-500/10 text-green-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ── Event Details Section ── */}
      <div className="mb-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-300">
          Detail Event
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Title */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">
              Judul Event *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="SUN 6 BKS Vol. 7 — Malam Komedi Bekasi"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Slug */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">
              Slug (URL)
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => onFieldChange("slug", e.target.value)}
              placeholder="sun6bks-7-malam-komedi-bekasi"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Tanggal & Waktu *
            </label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => onFieldChange("date", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
            />
          </div>

          {/* Time Label */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Label Waktu
            </label>
            <input
              type="text"
              value={form.time_label}
              onChange={(e) => onFieldChange("time_label", e.target.value)}
              placeholder="20:00 WIB"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Venue */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Venue *
            </label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => onFieldChange("venue", e.target.value)}
              placeholder="Nama venue"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Venue Address */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Alamat Venue
            </label>
            <input
              type="text"
              value={form.venue_address}
              onChange={(e) => onFieldChange("venue_address", e.target.value)}
              placeholder="Alamat lengkap"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="Deskripsi event..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Image URL */}
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">
              URL Gambar / Poster
            </label>
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => onFieldChange("image_url", e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          {/* Published */}
          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) =>
                  onFieldChange("is_published", e.target.checked)
                }
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-sun6bks-gold focus:ring-sun6bks-gold/50"
              />
              Publish event (tampilkan di halaman publik)
            </label>
          </div>
        </div>
      </div>

      {/* ── Performers Section ── */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-300">Performers</h4>
          <button
            type="button"
            onClick={onAddPerformer}
            className="flex items-center gap-1 text-xs text-sun6bks-gold transition-colors hover:text-sun6bks-gold/80"
          >
            <Plus className="h-3 w-3" /> Tambah Performer
          </button>
        </div>
        <div className="space-y-4">
          {form.performers.map((performer, i) => (
            <div
              key={i}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">
                  Performer #{i + 1}
                </span>
                {form.performers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemovePerformer(i)}
                    className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" /> Hapus
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {/* Foto Upload + Preview */}
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs text-gray-500">
                    Foto
                  </label>
                  <div className="flex items-center gap-4">
                    {/* Preview */}
                    <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                      {performer.image ? (
                        <Image
                          src={performer.image}
                          alt={performer.name || "Performer"}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-600" />
                        </div>
                      )}
                    </div>
                    {/* Upload Button */}
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRefs.current[i]?.click()}
                          disabled={uploadingIndex === i}
                          className="flex items-center gap-1.5 rounded-lg bg-sun6bks-gold/10 px-3 py-1.5 text-xs font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {uploadingIndex === i ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Upload className="h-3.5 w-3.5" />
                          )}
                          {uploadingIndex === i ? "Uploading..." : "Upload Foto"}
                        </button>
                        {performer.image && (
                          <button
                            type="button"
                            onClick={() => onPerformerChange(i, "image", "")}
                            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                            title="Hapus foto"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                      <input
                        ref={(el) => { fileInputRefs.current[i] = el; }}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onUploadPerformerImage(i, file);
                          e.target.value = "";
                        }}
                      />
                      <input
                        type="text"
                        value={performer.image}
                        onChange={(e) =>
                          onPerformerChange(i, "image", e.target.value)
                        }
                        placeholder="Atau paste URL: https://..."
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Nama */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Nama *
                  </label>
                  <input
                    type="text"
                    value={performer.name}
                    onChange={(e) =>
                      onPerformerChange(i, "name", e.target.value)
                    }
                    placeholder="Nama performer"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={performer.instagram}
                    onChange={(e) =>
                      onPerformerChange(i, "instagram", e.target.value)
                    }
                    placeholder="@username"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    YouTube
                  </label>
                  <input
                    type="text"
                    value={performer.youtube}
                    onChange={(e) =>
                      onPerformerChange(i, "youtube", e.target.value)
                    }
                    placeholder="@channel atau URL"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Categories Section ── */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-300">
            Kategori Tiket *
          </h4>
          <button
            type="button"
            onClick={onAddCategory}
            className="flex items-center gap-1 text-xs text-sun6bks-gold transition-colors hover:text-sun6bks-gold/80"
          >
            <Plus className="h-3 w-3" /> Tambah Kategori
          </button>
        </div>
        <div className="space-y-4">
          {form.categories.map((cat, catIndex) => (
            <div
              key={catIndex}
              className="rounded-lg border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">
                  Kategori #{catIndex + 1}
                </span>
                {form.categories.length > 1 && (
                  <button
                    type="button"
                    onClick={() => onRemoveCategory(catIndex)}
                    className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" /> Hapus
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Nama *
                  </label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) =>
                      onCategoryChange(catIndex, "name", e.target.value)
                    }
                    placeholder="Early Bird"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Harga (Rp) *
                  </label>
                  <input
                    type="number"
                    value={cat.price}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "price",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>

                {/* Sort Order */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={cat.sort_order}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "sort_order",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>

                {/* Total Stock */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Total Stok
                  </label>
                  <input
                    type="number"
                    value={cat.total_stock}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "total_stock",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>

                {/* Remaining Stock */}
                <div>
                  <label className="mb-1 block text-xs text-gray-500">
                    Sisa Stok
                  </label>
                  <input
                    type="number"
                    value={cat.remaining_stock}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "remaining_stock",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min={0}
                    max={cat.total_stock}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>

                {/* Active */}
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={cat.is_active}
                      onChange={(e) =>
                        onCategoryChange(
                          catIndex,
                          "is_active",
                          e.target.checked
                        )
                      }
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-sun6bks-gold focus:ring-sun6bks-gold/50"
                    />
                    Aktif
                  </label>
                </div>

                {/* Description */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">
                    Deskripsi
                  </label>
                  <input
                    type="text"
                    value={cat.description}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Deskripsi kategori..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>

                {/* Features */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-xs text-gray-500">Fitur</label>
                    <button
                      type="button"
                      onClick={() => onAddCategoryFeature(catIndex)}
                      className="text-xs text-sun6bks-gold transition-colors hover:text-sun6bks-gold/80"
                    >
                      + Tambah Fitur
                    </button>
                  </div>
                  <div className="space-y-2">
                    {cat.features.map((feat, featIndex) => (
                      <div key={featIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={feat}
                          onChange={(e) =>
                            onCategoryFeatureChange(
                              catIndex,
                              featIndex,
                              e.target.value
                            )
                          }
                          placeholder="Akses masuk"
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveCategoryFeature(catIndex, featIndex)
                          }
                          className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Submit Buttons ── */}
      <div className="flex gap-3">
        <button
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex items-center gap-2 rounded-lg bg-sun6bks-gold px-6 py-2.5 text-sm font-bold text-sun6bks-dark transition-colors hover:bg-sun6bks-gold/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {editingEventId ? "Simpan Perubahan" : "Buat Event"}
        </button>
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="rounded-lg bg-white/10 px-6 py-2.5 text-sm text-gray-400 transition-colors hover:bg-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
};
