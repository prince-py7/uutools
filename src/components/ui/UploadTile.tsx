"use client";

import { ChangeEvent, useId, useRef } from "react";
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
}: {
  accept: string;
  onPick: (file: File | undefined) => void;
  previewUrl?: string | null;
  label?: string;
  disabled?: boolean;
  className?: string;
  size?: number;
}) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  function onChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    onPick(file);
    e.target.value = "";
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
        aria-label={label}
        className="relative grid place-items-center overflow-hidden rounded-xl border border-dashed border-[var(--line)] bg-[#141414] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
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
          </span>
        )}
        {previewUrl ? (
          <span className="absolute right-1 bottom-1 grid h-6 w-6 place-items-center rounded-full bg-black/70 text-white">
            <Plus size={14} />
          </span>
        ) : null}
      </button>
    </div>
  );
}
