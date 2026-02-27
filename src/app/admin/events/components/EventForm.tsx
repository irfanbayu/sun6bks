"use client";

import { useCallback, useRef, type CSSProperties, type MutableRefObject } from "react";
import Image from "next/image";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type UniqueIdentifier,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Trash2, Loader2, X, MapPin, Upload, ImageIcon, GripVertical } from "lucide-react";
import type { EventInput, PerformerInput } from "@/actions/admin-events";
import type { CategoryData } from "../types";

export type EventFormProps = {
  form: EventInput;
  editingEventId: number | null;
  loading: string | null;
  uploadingIndex: number | null;
  isUploadingPoster: boolean;
  isUploadingVenueImage: boolean;
  message: { text: string; success: boolean } | null;
  onFieldChange: (field: keyof EventInput, value: string | boolean | null) => void;
  onPerformerChange: (index: number, field: keyof PerformerInput, value: string) => void;
  onUploadPerformerImage: (index: number, file: File) => Promise<void>;
  onUploadPosterImage: (file: File) => Promise<void>;
  onUploadVenueImage: (file: File) => Promise<void>;
  onAddPerformer: () => void;
  onRemovePerformer: (index: number) => void;
  onMovePerformer: (fromIndex: number, toIndex: number) => void;
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
  onSubmit: () => Promise<void>;
  onClose: () => void;
};

type SortablePerformerCardProps = {
  id: UniqueIdentifier;
  index: number;
  performer: PerformerInput;
  totalPerformers: number;
  fileInputRefs: MutableRefObject<(HTMLInputElement | null)[]>;
  uploadingIndex: number | null;
  onPerformerChange: (index: number, field: keyof PerformerInput, value: string) => void;
  onUploadPerformerImage: (index: number, file: File) => Promise<void>;
  onRemovePerformer: (index: number) => void;
};

const SortablePerformerCard = ({
  id,
  index,
  performer,
  totalPerformers,
  fileInputRefs,
  uploadingIndex,
  onPerformerChange,
  onUploadPerformerImage,
  onRemovePerformer,
}: SortablePerformerCardProps) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border border-white/10 bg-white/[0.03] p-4 ${
        isDragging ? "opacity-60" : "opacity-100"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="cursor-grab rounded p-1 text-gray-500 transition-colors hover:bg-white/10 hover:text-sun6bks-gold active:cursor-grabbing"
            title="Drag untuk ubah urutan"
            aria-label={`Drag performer ${index + 1}`}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-gray-300">Performer #{index + 1}</span>
        </div>
        {totalPerformers > 1 && (
          <button
            type="button"
            onClick={() => onRemovePerformer(index)}
            className="flex items-center gap-1 text-xs text-red-400 transition-colors hover:text-red-300"
          >
            <Trash2 className="h-3 w-3" /> Hapus
          </button>
        )}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs text-gray-500">Foto</label>
          <div className="flex items-center gap-4">
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
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[index]?.click()}
                  disabled={uploadingIndex === index}
                  className="flex items-center gap-1.5 rounded-lg bg-sun6bks-gold/10 px-3 py-1.5 text-xs font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {uploadingIndex === index ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploadingIndex === index ? "Uploading..." : "Upload Foto"}
                </button>
                {performer.image && (
                  <button
                    type="button"
                    onClick={() => onPerformerChange(index, "image", "")}
                    className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                    title="Hapus foto"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <input
                ref={(el) => {
                  fileInputRefs.current[index] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void onUploadPerformerImage(index, file);
                  }
                  e.target.value = "";
                }}
              />
              <input
                type="text"
                value={performer.image}
                onChange={(e) => onPerformerChange(index, "image", e.target.value)}
                placeholder="Atau paste URL: https://..."
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-gray-500">Nama *</label>
          <input
            type="text"
            value={performer.name}
            onChange={(e) => onPerformerChange(index, "name", e.target.value)}
            placeholder="Nama performer"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Keterangan Peran</label>
          <input
            type="text"
            value={performer.description}
            onChange={(e) => onPerformerChange(index, "description", e.target.value)}
            placeholder="Contoh: MC, Guest Star, Open Mic"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">Instagram</label>
          <input
            type="text"
            value={performer.instagram}
            onChange={(e) => onPerformerChange(index, "instagram", e.target.value)}
            placeholder="@username"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-500">YouTube</label>
          <input
            type="text"
            value={performer.youtube}
            onChange={(e) => onPerformerChange(index, "youtube", e.target.value)}
            placeholder="@channel atau URL"
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
          />
        </div>
      </div>
    </div>
  );
};

export const EventForm = ({
  form,
  editingEventId,
  loading,
  uploadingIndex,
  isUploadingPoster,
  isUploadingVenueImage,
  message,
  onFieldChange,
  onPerformerChange,
  onUploadPerformerImage,
  onUploadPosterImage,
  onUploadVenueImage,
  onAddPerformer,
  onRemovePerformer,
  onMovePerformer,
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
  const posterFileInputRef = useRef<HTMLInputElement | null>(null);
  const venueFileInputRef = useRef<HTMLInputElement | null>(null);
  const isSubmitting = loading === "create" || loading === "update";
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndPerformer = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) {
        return;
      }

      const activeId = String(active.id);
      const overId = String(over.id);
      const activeIndex = Number.parseInt(activeId.replace("performer-", ""), 10);
      const overIndex = Number.parseInt(overId.replace("performer-", ""), 10);

      if (Number.isNaN(activeIndex) || Number.isNaN(overIndex)) {
        return;
      }

      onMovePerformer(activeIndex, overIndex);
    },
    [onMovePerformer]
  );

  return (
    <div className="mb-8 rounded-xl border border-sun6bks-gold/30 bg-white/5 p-6">
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

      <div className="mb-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-300">Detail Event</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">Judul Event *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onFieldChange("title", e.target.value)}
              placeholder="Standupindo Bekasi Events Vol. 7 — Malam Komedi Bekasi"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">Slug (URL)</label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => onFieldChange("slug", e.target.value)}
              placeholder="standupindo-bekasi-events-7-malam-komedi-bekasi"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-400">Tanggal & Waktu *</label>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(e) => onFieldChange("date", e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Label Waktu</label>
            <input
              type="text"
              value={form.time_label}
              onChange={(e) => onFieldChange("time_label", e.target.value)}
              placeholder="20:00 WIB"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Venue *</label>
            <input
              type="text"
              value={form.venue}
              onChange={(e) => onFieldChange("venue", e.target.value)}
              placeholder="Nama venue"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">Alamat Venue</label>
            <input
              type="text"
              value={form.venue_address}
              onChange={(e) => onFieldChange("venue_address", e.target.value)}
              placeholder="Alamat lengkap"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">Link Google Maps</label>
            <input
              type="url"
              value={form.venue_maps_url}
              onChange={(e) => onFieldChange("venue_maps_url", e.target.value)}
              placeholder="https://maps.google.com/... atau https://goo.gl/maps/..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
            <p className="mt-1 text-xs text-gray-600">
              Jika diisi, link ini akan digunakan pada tombol &quot;Buka di Google Maps&quot;.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs text-gray-400">Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => onFieldChange("description", e.target.value)}
              placeholder="Deskripsi event..."
              rows={3}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
            />
          </div>

          <div className="sm:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <label className="mb-2 block text-xs text-gray-400">Poster Upcoming Show</label>
                <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {form.image_url ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={form.image_url}
                        alt={form.title || "Event poster"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => posterFileInputRef.current?.click()}
                    disabled={isUploadingPoster}
                    className="flex items-center gap-1.5 rounded-lg bg-sun6bks-gold/10 px-3 py-1.5 text-xs font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingPoster ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isUploadingPoster ? "Uploading..." : "Upload Poster"}
                  </button>
                  {form.image_url && (
                    <button
                      type="button"
                      onClick={() => onFieldChange("image_url", "")}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Hapus poster"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={posterFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void onUploadPosterImage(file);
                    }
                    e.target.value = "";
                  }}
                />
                <input
                  type="url"
                  value={form.image_url}
                  onChange={(e) => onFieldChange("image_url", e.target.value)}
                  placeholder="Atau paste URL poster: https://..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <label className="mb-2 block text-xs text-gray-400">Foto Venue</label>
                <div className="mb-3 overflow-hidden rounded-lg border border-white/10 bg-white/5">
                  {form.venue_image_url ? (
                    <div className="relative h-40 w-full">
                      <Image
                        src={form.venue_image_url}
                        alt={form.venue || "Venue image"}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                  ) : (
                    <div className="flex h-40 items-center justify-center">
                      <MapPin className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="mb-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => venueFileInputRef.current?.click()}
                    disabled={isUploadingVenueImage}
                    className="flex items-center gap-1.5 rounded-lg bg-sun6bks-gold/10 px-3 py-1.5 text-xs font-medium text-sun6bks-gold transition-colors hover:bg-sun6bks-gold/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploadingVenueImage ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    {isUploadingVenueImage ? "Uploading..." : "Upload Venue"}
                  </button>
                  {form.venue_image_url && (
                    <button
                      type="button"
                      onClick={() => onFieldChange("venue_image_url", "")}
                      className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      title="Hapus foto venue"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <input
                  ref={venueFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      void onUploadVenueImage(file);
                    }
                    e.target.value = "";
                  }}
                />
                <input
                  type="url"
                  value={form.venue_image_url}
                  onChange={(e) => onFieldChange("venue_image_url", e.target.value)}
                  placeholder="Atau paste URL venue: https://..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                />
              </div>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.is_published}
                onChange={(e) => onFieldChange("is_published", e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5 text-sun6bks-gold focus:ring-sun6bks-gold/50"
              />
              Publish event (tampilkan di halaman publik)
            </label>
          </div>
        </div>
      </div>

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEndPerformer}
        >
          <SortableContext
            items={form.performers.map((_, i) => `performer-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {form.performers.map((performer, i) => (
                <SortablePerformerCard
                  key={`performer-${i}`}
                  id={`performer-${i}`}
                  index={i}
                  performer={performer}
                  totalPerformers={form.performers.length}
                  fileInputRefs={fileInputRefs}
                  uploadingIndex={uploadingIndex}
                  onPerformerChange={onPerformerChange}
                  onUploadPerformerImage={onUploadPerformerImage}
                  onRemovePerformer={onRemovePerformer}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-300">Kategori Tiket *</h4>
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
                <span className="text-sm font-medium text-gray-300">Kategori #{catIndex + 1}</span>
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
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Nama *</label>
                  <input
                    type="text"
                    value={cat.name}
                    onChange={(e) => onCategoryChange(catIndex, "name", e.target.value)}
                    placeholder="Early Bird"
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Harga (Rp) *</label>
                  <input
                    type="number"
                    value={cat.price}
                    onChange={(e) =>
                      onCategoryChange(catIndex, "price", Number.parseInt(e.target.value, 10) || 0)
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Urutan</label>
                  <input
                    type="number"
                    value={cat.sort_order}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "sort_order",
                        Number.parseInt(e.target.value, 10) || 0
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Total Stok</label>
                  <input
                    type="number"
                    value={cat.total_stock}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "total_stock",
                        Number.parseInt(e.target.value, 10) || 0
                      )
                    }
                    min={0}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-gray-500">Sisa Stok</label>
                  <input
                    type="number"
                    value={cat.remaining_stock}
                    onChange={(e) =>
                      onCategoryChange(
                        catIndex,
                        "remaining_stock",
                        Number.parseInt(e.target.value, 10) || 0
                      )
                    }
                    min={0}
                    max={cat.total_stock}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50 [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-gray-400">
                    <input
                      type="checkbox"
                      checked={cat.is_active}
                      onChange={(e) => onCategoryChange(catIndex, "is_active", e.target.checked)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-sun6bks-gold focus:ring-sun6bks-gold/50"
                    />
                    Aktif
                  </label>
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs text-gray-500">Deskripsi</label>
                  <input
                    type="text"
                    value={cat.description}
                    onChange={(e) => onCategoryChange(catIndex, "description", e.target.value)}
                    placeholder="Deskripsi kategori..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                  />
                </div>
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
                            onCategoryFeatureChange(catIndex, featIndex, e.target.value)
                          }
                          placeholder="Akses masuk"
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:border-sun6bks-gold/50 focus:outline-none focus:ring-1 focus:ring-sun6bks-gold/50"
                        />
                        <button
                          type="button"
                          onClick={() => onRemoveCategoryFeature(catIndex, featIndex)}
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

      <div className="flex gap-3">
        <button
          onClick={() => void onSubmit()}
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
