import type { SupabaseClient } from "@supabase/supabase-js";

const OMIT_KEY = "uu-posts-omit-cols-v1";

const OPTIONAL_POST_COLS = [
  "media_name",
  "study_unit",
  "academic_year",
  "semester_id",
] as const;

function readOmit(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(OMIT_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function writeOmit(cols: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OMIT_KEY, JSON.stringify([...cols]));
  } catch {
    /* ignore */
  }
}

function rememberOmit(col: string) {
  const next = readOmit();
  next.add(col);
  writeOmit(next);
}

/** Pull column name from PostgREST schema-cache errors. */
function missingColumnFromError(message: string): string | null {
  const m =
    message.match(
      /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i
    ) ||
    message.match(/column ['"]([a-zA-Z0-9_]+)['"]/i) ||
    message.match(/['"]([a-zA-Z0-9_]*media_?name[a-zA-Z0-9_]*)['"]/i);
  return m?.[1] || null;
}

function stripCols<T extends Record<string, unknown>>(
  row: T,
  cols: Iterable<string>
): Partial<T> {
  const out: Record<string, unknown> = { ...row };
  for (const c of cols) delete out[c];
  return out as Partial<T>;
}

export type PostInsertResult = {
  error?: string;
  /** Columns dropped so the insert could succeed (DB patch still recommended). */
  omitted?: string[];
};

/**
 * Insert a posts row; if schema cache is missing newer columns (e.g. media_name),
 * strip them, remember, and retry so uploads never hard-fail.
 */
export async function insertPostRow(
  supabase: SupabaseClient,
  row: Record<string, unknown>
): Promise<PostInsertResult> {
  const omit = readOmit();
  let payload = stripCols(row, omit);
  const dropped: string[] = [...omit].filter((c) => c in row);

  let { error } = await supabase.from("posts").insert(payload);

  for (let attempt = 0; attempt < 6 && error; attempt++) {
    const msg = error.message || "";
    const isSchema =
      error.code === "PGRST204" ||
      /schema cache|Could not find|media[_\s]?name|study_unit|academic_year|semester_id/i.test(
        msg
      );
    if (!isSchema) break;

    const col = missingColumnFromError(msg);
    if (col) {
      rememberOmit(col);
      dropped.push(col);
      payload = stripCols(payload, [col]);
      const retry = await supabase.from("posts").insert(payload);
      error = retry.error;
      continue;
    }

    // Unknown schema miss — strip all optional study cols once
    for (const c of OPTIONAL_POST_COLS) {
      if (c in payload) {
        rememberOmit(c);
        dropped.push(c);
      }
    }
    payload = stripCols(payload, OPTIONAL_POST_COLS);
    const retry = await supabase.from("posts").insert(payload);
    error = retry.error;
    break;
  }

  if (error) return { error: error.message };
  return {
    omitted: dropped.length ? [...new Set(dropped)] : undefined,
  };
}
