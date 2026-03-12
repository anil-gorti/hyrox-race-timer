import { Button } from "@/components/ui/button";

interface RoleSelectProps {
  onVolunteer: () => void;
  onAdmin: () => void;
}

export function RoleSelect({ onVolunteer, onAdmin }: RoleSelectProps) {
  return (
    <div className="fixed inset-0 bg-black text-white flex flex-col items-center justify-center font-sans px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <p className="text-[#CCFF00] font-semibold tracking-[0.24em] text-xs uppercase mb-3">
            Hyfit Games 2.1
          </p>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Who&apos;s using the timer?</h1>
          <p className="text-gray-500 text-sm">
            Choose your role to get the right controls.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={onVolunteer}
            className="w-full bg-[#CCFF00] hover:bg-[#aacc00] text-black font-bold py-4 rounded-2xl text-base tracking-tight h-auto"
          >
            Login as Volunteer
          </Button>
          <Button
            variant="outline"
            onClick={onAdmin}
            className="w-full border-[#333] text-white font-semibold py-3 rounded-2xl text-sm bg-[#111] hover:bg-[#1a1a1a] h-auto"
          >
            Login as Admin
          </Button>
        </div>

        <p className="text-[11px] text-gray-500 leading-relaxed">
          Volunteers record athlete times. Admins configure the event details,
          categories, and sequence for the day.
        </p>
      </div>
    </div>
  );
}

