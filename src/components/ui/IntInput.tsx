"use client";

import {
  type InputHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange" | "inputMode"
> & {
  value: number;
  onChange: (value: number) => void;
  /** Minimum on blur / commit (default 0). */
  min?: number;
};

/**
 * Integer field that lets you clear “0” and type freely.
 * Commits number on blur / Enter; empty while typing is allowed.
 */
export function IntInput({
  value,
  onChange,
  min = 0,
  className = "input",
  onBlur,
  onFocus,
  onKeyDown,
  ...rest
}: Props) {
  const focused = useRef(false);
  const [text, setText] = useState(() => String(value));

  useEffect(() => {
    if (!focused.current) setText(String(value));
  }, [value]);

  function commit(raw: string) {
    if (raw === "" || raw === "-") {
      onChange(min);
      setText(String(min));
      return;
    }
    const n = Number.parseInt(raw, 10);
    const next = Number.isFinite(n) ? Math.max(min, n) : min;
    onChange(next);
    setText(String(next));
  }

  return (
    <input
      {...rest}
      className={className}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      value={text}
      onFocus={(e) => {
        focused.current = true;
        onFocus?.(e);
      }}
      onBlur={(e) => {
        focused.current = false;
        commit(text);
        onBlur?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
        onKeyDown?.(e);
      }}
      onChange={(e) => {
        let v = e.target.value;
        if (v !== "" && !/^\d+$/.test(v)) return;
        // "05" → "5" so 0 doesn't block typing the next digits
        if (v.length > 1 && v.startsWith("0")) {
          v = String(Number.parseInt(v, 10));
        }
        setText(v);
        if (v === "") return;
        const n = Number.parseInt(v, 10);
        if (Number.isFinite(n)) onChange(Math.max(min, n));
      }}
    />
  );
}
