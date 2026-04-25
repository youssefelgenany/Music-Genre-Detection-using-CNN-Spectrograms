"use client";

import { useRef } from "react";
import { Loader2, Upload } from "lucide-react";

export default function UploadCard({
  disabled = false,
  isUploading = false,
  isProcessing = false,
  onFileSelected,
}) {
  const inputRef = useRef(null);
  const showBusy = isUploading || isProcessing;

  function handleBrowseClick(e) {
    e.preventDefault();
    if (disabled || !inputRef.current) return;
    inputRef.current.click();
  }

  function handleChange(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file || disabled) return;
    onFileSelected?.(file);
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    onFileSelected?.(file);
  }

  return (
    <div
      data-upload-panel
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragOver}
      onDrop={handleDrop}
      className="flex h-full min-h-[min(40vh,18rem)] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-outline/40 bg-surface-container-high p-8 text-center transition-all hover:border-accent/55 sm:min-h-[min(36vh,20rem)] md:min-h-[min(38vh,22rem)]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac"
        className="sr-only"
        onChange={handleChange}
        aria-label="Choose audio file"
      />
      <Upload
        className={`mb-4 h-9 w-9 text-accent ${showBusy ? "opacity-40" : ""}`}
        strokeWidth={1.75}
        aria-hidden
      />
      <h3 className="font-headline mb-2 text-lg font-bold text-on-background">
        Upload Audio
      </h3>
      <p className="text-sm text-center text-on-surface-variant mb-6">
        Drop your .mp3 or .wav files here for deep analysis.
      </p>
      {showBusy ? (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-3 py-1.5 text-xs font-medium text-on-surface-variant">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          {isUploading ? "Uploading audio..." : "Processing audio..."}
        </div>
      ) : null}
      <button
        type="button"
        onClick={handleBrowseClick}
        disabled={disabled}
        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 hover:shadow-md disabled:pointer-events-none disabled:bg-slate-600 disabled:text-slate-200 disabled:shadow-none"
      >
        Browse Files
      </button>
    </div>
  );
}
