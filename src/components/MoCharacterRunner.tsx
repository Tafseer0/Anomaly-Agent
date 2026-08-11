import { useState } from "react";
import { Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const MESSAGES = [
  "All metrics look clear! 🚀",
  "Checking for anomalies... 🔍",
  "Hi! I'm Mo, watching your data! 👋",
  "No data spikes detected! ✨",
  "Keeping your baseline safe! 🛡️",
  "Scanning the data streams... 📡",
  "Mo's on watch duty! 🕵️",
  "Nothing weird here, boss! 😎",
  "All systems humming smoothly! ⚙️",
  "Crunching numbers, all good! 🔢",
  "Your metrics are behaving today! 🎉",
  "Eyes on every data point! 👀",
  "Baseline steady, no drama! 🌊",
  "Sniffing out anything unusual... 🐾",
  "Green across the board! 💚",
  "Just me and your data, chilling! 🧘",
  "Double-checking, just in case! 🔎",
  "Nothing to report, all clear! 📋",
  "Mo says: looking healthy! 💪",
  "Patrolling the pipeline... 🚨",
  "No red flags in sight! 🚩❌",
  "Your data's playing nice today! 🤝",
  "Standing guard, all quiet! 🌙",
  "Metrics check: nailed it! ✅",
  "Watching closely, nothing's off! 🔬",
  "Zero surprises so far! 🎲",
  "Cruising through the checks... 🚗",
  "Your data's on its best behavior! 🎩",
  "Mo's radar is clean! 📶",
  "All good in the neighborhood! 🏘️",
];

export function MoCharacterRunner() {
  const [message, setMessage] = useState<string | null>(null);
  const [clicked, setClicked] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClicked(true);
    const idx = Math.floor(Math.random() * MESSAGES.length);
    const randomMsg = MESSAGES[idx] || "All metrics look clear! 🚀";
    setMessage(randomMsg);

    setTimeout(() => setClicked(false), 800);
    setTimeout(() => setMessage(null), 3500);
  };

  return (
    <div className="fixed bottom-2 left-0 right-0 z-[100] pointer-events-none h-40">
      <div
        className="absolute bottom-0 pointer-events-auto cursor-pointer select-none animate-mo-loop"
        onClick={handleClick}
        title="Click Mo for a message!"
      >
        {/* Speech Bubble - Absolutely positioned above head so layout height never changes */}
        {message && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
            <div className="animate-bounce rounded-xl border border-primary/50 bg-card/95 px-3.5 py-2 text-xs font-semibold text-foreground shadow-2xl backdrop-blur-xl ring-1 ring-primary/20">
              <span className="flex items-center gap-1.5 whitespace-nowrap">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                {message}
              </span>
              <div className="absolute -bottom-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-r border-b border-primary/50 bg-card/95" />
            </div>
          </div>
        )}

        {/* Mo Character Image */}
        <img
          src="/mo-character.png"
          alt="Mo Character"
          className={cn(
            "h-20 w-auto drop-shadow-[0_8px_16px_rgba(0,0,0,0.3)] transition-transform duration-300 hover:scale-110",
            clicked && "-rotate-12 scale-125",
          )}
        />
      </div>
    </div>
  );
}
