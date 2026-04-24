import { Mic } from "lucide-react";

export default function RecordingButton({
  isRecording = false,
  disabled = false,
  onClick,
  /** Shown on the button; use "Recording..." while `isRecording` if desired */
  buttonLabel = "Start Recording",
  hintText,
}) {
  return (
    <div className="group relative flex h-full min-h-[min(44vh,18rem)] w-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-outline/20 bg-surface-container-low p-6 sm:min-h-[min(40vh,20rem)] sm:p-8 md:min-h-[min(38vh,22rem)] md:p-8">
      {/* Halos: static when idle; custom CSS animations only when isRecording */}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${
          isRecording ? "opacity-100" : "opacity-0"
        }`}
        aria-hidden
      >
        <div
          className={`absolute h-72 w-72 rounded-full bg-accent/10 md:h-80 md:w-80 lg:h-96 lg:w-96 ${
            isRecording ? "mic-ring-outer--recording" : ""
          }`}
        />
        <div
          className={`absolute h-96 w-96 rounded-full bg-accent/10 md:h-[28rem] md:w-[28rem] lg:h-[32rem] lg:w-[32rem] ${
            isRecording ? "mic-ring-inner--recording" : ""
          }`}
        />
      </div>

      <button
        type="button"
        aria-pressed={isRecording}
        disabled={disabled}
        onClick={onClick}
        className={`relative z-20 flex aspect-square h-44 w-44 max-h-[min(100%,22rem)] max-w-[min(100%,22rem)] flex-col items-center justify-center rounded-full text-white transition-[box-shadow,transform,filter] duration-300 ease-out active:scale-[0.98] disabled:pointer-events-none disabled:bg-gradient-to-br disabled:from-slate-600 disabled:to-slate-800 disabled:shadow-none sm:h-48 sm:w-48 md:h-56 md:w-56 lg:h-64 lg:w-64 xl:h-72 xl:w-72 2xl:h-80 2xl:w-80 ${
          isRecording
            ? "mic-recording bg-gradient-to-br from-[#c02626] to-[#f87171] shadow-[0_24px_55px_rgba(220,38,38,0.45)] hover:brightness-105"
            : "bg-gradient-to-br from-primary to-primary-container shadow-[0_20px_50px_rgba(59,130,246,0.35)] hover:shadow-[0_28px_55px_rgba(59,130,246,0.5)] hover:brightness-95"
        }`}
      >
        <Mic
          className="mb-2 h-12 w-12 sm:h-14 sm:w-14 md:h-20 md:w-20 lg:h-24 lg:w-24 xl:h-28 xl:w-28 2xl:h-32 2xl:w-32"
          strokeWidth={1.75}
          aria-hidden
        />
        <span className="font-headline px-2 text-center text-xs font-extrabold uppercase leading-tight tracking-wider sm:text-sm md:text-base">
          {buttonLabel}
        </span>
      </button>

      <p className="mt-8 w-full max-w-none px-2 text-center text-sm font-medium text-on-surface-variant sm:mt-10 sm:text-base md:mt-12 lg:px-4">
        {hintText}
      </p>
    </div>
  );
}
