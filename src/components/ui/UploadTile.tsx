"use client";

import { ChangeEvent, DragEvent, useId, useRef, useState } from "react";
import { Plus } from "lucide-react";

/** Square “+” picker that replaces bare “Choose file” inputs. */
export function UploadTile({
  accept,
  onPick,
  previewUrl,
  label = "Add photo",
  disabled,
  className = "",
  size = 96,
  hint,
}: {
  accept: string;
  onPick: (file: File | undefined) => void;
  previewUrl?: string | null;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: number;
  /** Small status under the tile (e.g. Compressing…). */
  hint?: string | null;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    onPick(file);
    e.target.value = "";
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onPick(file);
  }

  return (
    <div className={className}>
      <input
        id={id}
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        disabled={disabled}
        onChange={onChange}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
        aria-label={label}
        className={`relative grid place-items-center overflow-hidden rounded-xl border border-dashed bg-[#141414] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50 ${
          dragOver
            ? "border-[var(--accent)] text-[var(--accent)]"
            : "border-[var(--line)]"
        }`}
        style={{ width: size, height: size }}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[11px]">
            <Plus size={22} />
            <span className="px-1 text-center leading-tight">{label}</span>
            <span className="px-1 text-center text-[10px] opacity-70">
              or drop
            </span>
          </span>
        )}
        {previewUrl ? (
          <span className="absolute right-1 bottom-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white">
            <Plus size={14} />
          </span>
        ) : null}
      </button>
      {hint ? (
        <p className="mt-1 max-w-[12rem] text-[11px] text-[var(--muted)]">{hint}</p>
      ) : null}
    </div>
  );
}
