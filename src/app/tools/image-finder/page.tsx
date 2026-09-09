"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { IMAGE_FINDER_API } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";

export default function ImageFinderPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [uuid, setUuid] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageSrc, setImageSrc] = useState("");
  const [downloadSrc, setDownloadSrc] = useState("");
  const [foundUuid, setFoundUuid] = useState("");
  const objectUrlRef = useRef("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace("/login");
  }, [ready, user, router]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  function startFakeProgress() {
    if (timerRef.current) clearInterval(timerRef.current);
    let value = 0;
    setProgress(0);
    timerRef.current = setInterval(() => {
      if (value >= 90) return;
      value += Math.max(1, Math.round((90 - value) / 12));
      setProgress(value);
    }, 180);
  }

  function clearProgress() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const value = uuid.trim();
    if (!value) {
      setStatus("Image not available");
      return;
    }

    setLoading(true);
    setStatus("");
    setImageSrc("");
    setDownloadSrc("");
    setFoundUuid(value);
    startFakeProgress();

    const url = `${IMAGE_FINDER_API.replace(/\/$/, "")}/${encodeURIComponent(value)}`;

    try {
      const blob = await new Promise<Blob>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.responseType = "blob";
        xhr.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            clearProgress();
            setProgress((event.loaded / event.total) * 100);
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300 && xhr.response?.size > 0) {
            resolve(xhr.response);
          } else reject(new Error("empty"));
        };
        xhr.onerror = () => reject(new Error("network"));
        xhr.send();
      });

      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const obj = URL.createObjectURL(blob);
      objectUrlRef.current = obj;
      clearProgress();
      setProgress(100);
      setImageSrc(obj);
      setDownloadSrc(obj);
      setLoading(false);
    } catch {
      // fallback image probe
      try {
        await new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("image"));
          img.src = url;
        });
        clearProgress();
        setProgress(100);
        setImageSrc(url);
        setDownloadSrc(url);
        setLoading(false);
      } catch {
        clearProgress();
        setLoading(false);
        setStatus("Image not available");
      }
    }
  }

  async function download() {
    if (!downloadSrc) return;
    try {
      const response = await fetch(downloadSrc, { mode: "cors", cache: "no-store" });
      if (!response.ok) throw new Error("fail");
      const blob = await response.blob();
      const temp = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = temp;
      link.download = `profile-${foundUuid || "image"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(temp), 1000);
    } catch {
      window.open(downloadSrc, "_blank");
    }
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md px-3 py-6 md:px-0">
        <h1 className="mb-1 text-center font-[family-name:var(--font-display)] text-2xl font-bold">
          UUID to Profile Finder
        </h1>
        <p className="mb-6 text-center text-sm text-[var(--muted)]">
          Campus tool from UU Tools
        </p>

        <form className="card space-y-3 p-5" onSubmit={onSubmit}>
          <label className="block text-sm text-[var(--muted)]">UUID</label>
          <input
            className="input"
            value={uuid}
            onChange={(e) => setUuid(e.target.value)}
            placeholder="Enter UUID"
            required
          />
          <button className="btn btn-primary w-full" disabled={loading}>
            Enter
          </button>
        </form>

        {loading && (
          <div className="mt-6 space-y-2 text-center text-sm text-[var(--muted)]">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
              <div
                className="h-full bg-[var(--accent)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            Loading Image {Math.floor(progress)}%
          </div>
        )}

        {status && (
          <p className="mt-4 text-center text-sm text-[var(--muted)]">{status}</p>
        )}

        {imageSrc && (
          <div className="card mt-6 space-y-3 p-4 text-center">
            <p className="text-sm text-[var(--muted)]">UUID: {foundUuid}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt="Profile"
              className="mx-auto max-h-80 w-full rounded-xl object-contain bg-black"
            />
            <button className="btn btn-primary w-full" type="button" onClick={download}>
              Download
            </button>
            <button
              className="btn btn-ghost w-full"
              type="button"
              onClick={() => {
                setImageSrc("");
                setDownloadSrc("");
                setStatus("");
                setUuid("");
              }}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </AppShell>
  );
}
