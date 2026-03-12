import { memo } from "react";
import splashImg from "@/splash.png";

interface SplashScreenProps {
  onContinue: () => void;
}

export const SplashScreen = memo(function SplashScreen({ onContinue }: SplashScreenProps) {
  return (
    <div className="fixed inset-0 bg-[#6b353a] flex flex-col items-center justify-between font-sans overflow-hidden">
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden pt-4">
        <img
          src={splashImg}
          alt="HyFit Landing Splash"
          className="w-full h-full object-contain"
        />
      </div>
      <div className="w-full shrink-0 flex items-center justify-center py-6 px-4 bg-[#6b353a]">
        <button
          onClick={onContinue}
          className="bg-[#CCFF00] text-black font-bold py-4 px-8 w-full sm:max-w-sm rounded-2xl text-lg tracking-tight active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(204,255,0,0.2)]"
        >
          Open Timing App
        </button>
      </div>
    </div>
  );
});
