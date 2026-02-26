import { getAdminCheckinEvents } from "@/actions/admin-tickets";
import { AdminCheckinClient } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminCheckinPage() {
  const events = await getAdminCheckinEvents();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Check-in QR</h2>
        <p className="mt-2 text-sm text-gray-400">
          Scan QR tiket dari kamera HP. Mode offline akan pakai snapshot data
          lokal.
        </p>
      </div>
      <AdminCheckinClient events={events} />
    </div>
  );
}
