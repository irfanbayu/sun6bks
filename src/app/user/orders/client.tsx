"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, CheckCircle } from "lucide-react";
import { recheckMyOrder } from "@/actions/user";

type RecheckButtonProps = {
  orderId: string;
};

export const RecheckButton = ({ orderId }: RecheckButtonProps) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    success: boolean;
  } | null>(null);

  const handleRecheck = async () => {
    setIsLoading(true);
    setResult(null);

    const response = await recheckMyOrder(orderId);
    setResult({ message: response.message, success: response.success });
    setIsLoading(false);

    if (response.success && response.newStatus !== "pending") {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleRecheck}
        disabled={isLoading}
        className="flex items-center gap-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        Cek Status
      </button>
      {result && (
        <span
          className={`flex items-center gap-1 text-xs ${
            result.success ? "text-green-400" : "text-red-400"
          }`}
        >
          {result.success && <CheckCircle className="h-3 w-3" />}
          {result.message}
        </span>
      )}
    </div>
  );
};
