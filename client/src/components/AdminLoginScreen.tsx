import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAdminWithPin } from "@/lib/role";
import { ChevronLeft, Lock } from "lucide-react";

interface AdminLoginScreenProps {
  onSuccess: () => void;
  onBack: () => void;
}

export function AdminLoginScreen({ onSuccess, onBack }: AdminLoginScreenProps) {
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    setSubmitting(true);
    setError(null);
    const ok = await setAdminWithPin(pin);
    setSubmitting(false);
    if (ok) {
      setPin("");
      onSuccess();
    } else {
      setError("Incorrect PIN. Please try again.");
    }
  };

  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-sans px-6">
      <div className="w-full max-w-sm space-y-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1 text-[11px] text-gray-500 uppercase tracking-wider mb-1"
        >
          <ChevronLeft className="w-3 h-3" />
          Back
        </button>

        <div className="space-y-2 text-center">
          <p className="text-[#CCFF00] font-semibold tracking-[0.24em] text-xs uppercase">
            Admin access
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Enter PIN</h2>
          <p className="text-gray-500 text-sm">
            Only event organizers should have this PIN.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 bg-[#111] border border-[#333] rounded-xl px-3 py-2.5">
            <Lock className="w-4 h-4 text-gray-400" />
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void handleSubmit();
                }
              }}
              placeholder="Admin PIN"
              className="bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}
          <Button
            onClick={handleSubmit}
            disabled={submitting || !pin.trim()}
            className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-semibold text-sm py-3 rounded-2xl h-auto"
          >
            {submitting ? "Checking…" : "Open Admin"}
          </Button>
        </div>
      </div>
    </div>
  );
}

