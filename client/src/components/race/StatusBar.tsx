import { memo, useState } from "react";
import { useRace } from "@/contexts/RaceContext";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { isAdmin, setAdminWithPin } from "@/lib/role";
import { formatRaceTime } from "@/lib/formatTime";
import { Menu, Calendar, MapPin, UserPlus, WifiOff, Volume2, VolumeX, Maximize } from "lucide-react";
import { isMuted, setMuted } from "@/lib/audio";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ProgressIndicator } from "./ProgressIndicator";

interface StatusBarProps {
  onNewAthlete: () => void;
  onSpectatorMode?: () => void;
}

export const StatusBar = memo(function StatusBar({ onNewAthlete, onSpectatorMode }: StatusBarProps) {
  const { athleteName, athleteBib, raceElapsedMs, totalTransitionMs, eventConfig } = useRace();
  const isOnline = useOnlineStatus();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adminPinDialogOpen, setAdminPinDialogOpen] = useState(false);
  const [adminPin, setAdminPin] = useState("");
  const [audioMuted, setAudioMuted] = useState(isMuted());

  return (
    <>
      <div className="h-20 w-full flex items-center justify-between px-4 sm:px-6 bg-black z-20 shrink-0 border-b border-[#1A1A1A]">
        <div className="flex items-center gap-3">
          <img
            src="/branding/hyfit-logo.png"
            alt="Hyfit Games"
            className="h-8 w-auto object-contain hidden xs:block"
          />
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button className="p-3 -ml-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1a1a1a] transition-colors min-w-[48px] min-h-[48px] flex items-center justify-center" aria-label="Menu">
                <Menu className="w-6 h-6" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-[#111] border-[#333] text-white w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="text-lg font-semibold text-white">Event</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-[11px] text-gray-500 uppercase tracking-wider mb-0.5">Event name</p>
                  <p className="text-white font-medium">{eventConfig.eventName || "—"}</p>
                </div>
                {eventConfig.eventDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#CCFF00]/80" />
                    <p className="text-gray-300 text-sm">{eventConfig.eventDate}</p>
                  </div>
                )}
                {eventConfig.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#CCFF00]/80" />
                    <p className="text-gray-300 text-sm">{eventConfig.location}</p>
                  </div>
                )}
                <div className="border-t border-[#333] pt-4 space-y-2">
                  <button
                    onClick={() => {
                      const next = !audioMuted;
                      setMuted(next);
                      setAudioMuted(next);
                    }}
                    className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-white font-semibold text-sm flex items-center justify-center gap-2 active:bg-[#222] transition-colors"
                  >
                    {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    {audioMuted ? "Unmute sounds" : "Mute sounds"}
                  </button>
                  {onSpectatorMode && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onSpectatorMode();
                      }}
                      className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-white font-semibold text-sm flex items-center justify-center gap-2 active:bg-[#222] transition-colors"
                    >
                      <Maximize className="w-4 h-4" />
                      Spectator mode
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onNewAthlete();
                    }}
                    className="w-full py-3 rounded-xl bg-[#1a1a1a] border border-[#333] text-white font-semibold text-sm flex items-center justify-center gap-2 active:bg-[#222] transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    New Athlete
                  </button>
                  {isAdmin() && (
                    <button
                      onClick={() => { setMenuOpen(false); window.location.href = "/admin"; }}
                      className="w-full py-3 rounded-xl bg-[#CCFF00] text-black font-semibold text-sm"
                    >
                      Open Admin
                    </button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <div>
            <div className="text-[12px] text-gray-500 uppercase tracking-wider font-medium mb-0.5">Race time</div>
            <div className="text-lg sm:text-xl font-mono text-[#CCFF00] font-semibold tabular-nums">
              {formatRaceTime(raceElapsedMs)}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => {
              if (isAdmin()) {
                window.location.href = "/admin";
              } else {
                setAdminPinDialogOpen(true);
              }
            }}
            className="text-white font-semibold text-base sm:text-lg tracking-wide uppercase whitespace-nowrap overflow-hidden text-ellipsis max-w-[160px] sm:max-w-[240px]"
          >
            {athleteName || "Athlete"}
          </button>
          <div className="text-[#CCFF00]/90 text-sm font-mono mt-0.5 tabular-nums">#{athleteBib || "—"}</div>
        </div>

        <div className="flex items-center gap-3 z-10">
          <div className="text-right w-24">
            <div className="text-[11px] text-gray-500 uppercase tracking-wider font-medium mb-0.5">Transition</div>
            <div className="text-base font-mono text-gray-400 tabular-nums">{formatRaceTime(totalTransitionMs)}</div>
          </div>
          <img
            src="/branding/wone-logo.png"
            alt="Wone"
            className="h-6 w-auto object-contain hidden xs:block"
          />
        </div>
      </div>

      <ProgressIndicator />

      {!isOnline && (
        <div className="flex items-center justify-center gap-1.5 py-1 bg-red-900/40 border-b border-red-800/50">
          <WifiOff className="w-3 h-3 text-red-400" />
          <span className="text-red-400 text-[10px] font-semibold tracking-wider uppercase">Offline</span>
        </div>
      )}

      <Dialog open={adminPinDialogOpen} onOpenChange={setAdminPinDialogOpen}>
        <DialogContent className="bg-[#111] border-[#333] text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Admin access</DialogTitle>
            <DialogDescription className="text-sm text-gray-400">
              Enter PIN to open the Admin panel.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              type="password"
              placeholder="PIN"
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="bg-[#222] border-[#444] text-white text-base"
              onKeyDown={async (e) => { if (e.key === "Enter") { const ok = await setAdminWithPin(adminPin); if (ok) { setAdminPinDialogOpen(false); setAdminPin(""); window.location.href = "/admin"; } } }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setAdminPinDialogOpen(false); setAdminPin(""); }} className="border-[#444] text-gray-400 text-sm">Cancel</Button>
            <Button size="sm" className="bg-[#CCFF00] text-black hover:bg-[#aacc00] text-sm font-semibold" onClick={async () => { const ok = await setAdminWithPin(adminPin); if (ok) { setAdminPinDialogOpen(false); setAdminPin(""); window.location.href = "/admin"; } }}>
              Open Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});
