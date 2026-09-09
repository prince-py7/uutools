"use client";

import Image from "next/image";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ImageIcon,
  KeyRound,
  Loader2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type FetchState = {
  status: "idle" | "loading" | "success" | "error";
  message: string;
  imageSrc?: string;
};

const uuidPattern = /^\d{11}$/;

export function UuidImageTool() {
  const [uuid, setUuid] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [bearerToken, setBearerToken] = useState("");
  const [state, setState] = useState<FetchState>({
    status: "idle",
    message:
      "Enter your image API details, then submit an 11-digit UUID to request an image.",
  });

  const uuidStatus = useMemo(() => {
    if (!uuid) {
      return "Waiting for UUID";
    }

    return uuidPattern.test(uuid) ? "Valid 11-digit UUID" : "Must be exactly 11 digits";
  }, [uuid]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uuidPattern.test(uuid)) {
      setState({
        status: "error",
        message: "Please enter a UUID made of exactly 11 digits.",
      });
      return;
    }

    if (!endpoint.trim()) {
      setState({
        status: "error",
        message: "Please enter the image API endpoint before submitting.",
      });
      return;
    }

    setState({
      status: "loading",
      message: "Connecting to your image API...",
    });

    try {
      const response = await fetch("/api/fetch-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid,
          endpoint,
          apiKey,
          apiSecret,
          bearerToken,
        }),
      });

      const payload = (await response.json()) as {
        imageSrc?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || !payload.imageSrc) {
        throw new Error(payload.error || payload.message || "No image was returned.");
      }

      setState({
        status: "success",
        message: payload.message || "Image loaded successfully.",
        imageSrc: payload.imageSrc,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch an image from the API.",
      });
    }
  }

  return (
    <section className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="border-white/10 bg-card/90 shadow-2xl shadow-black/20 backdrop-blur">
        <CardHeader className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full">
              API Image Fetcher
            </Badge>
            <Badge className="rounded-full bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
              Server-side bridge
            </Badge>
          </div>
          <div>
            <CardTitle className="text-2xl tracking-tight md:text-3xl">
              Request an image with secure, separate credentials.
            </CardTitle>
            <CardDescription className="mt-3 text-base leading-7">
              Add your endpoint and credential values separately. The UUID is sent
              as a query parameter named <span className="font-mono">uuid</span>,
              while credentials are forwarded as headers.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="grid gap-3">
              <Label htmlFor="endpoint">Image API endpoint</Label>
              <Input
                id="endpoint"
                inputMode="url"
                placeholder="https://api.example.com/image"
                value={endpoint}
                onChange={(event) => setEndpoint(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                The app appends <span className="font-mono">?uuid=###########</span>
                unless the endpoint already has query parameters.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-3">
                <Label htmlFor="api-key" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  API key
                </Label>
                <Input
                  id="api-key"
                  placeholder="Enter API key"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                />
              </div>
              <div className="grid gap-3">
                <Label htmlFor="api-secret" className="flex items-center gap-2">
                  <LockKeyhole className="h-4 w-4 text-primary" />
                  API secret
                </Label>
                <Input
                  id="api-secret"
                  type="password"
                  placeholder="Enter API secret"
                  value={apiSecret}
                  onChange={(event) => setApiSecret(event.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3">
              <Label htmlFor="bearer-token">Bearer token / access token</Label>
              <Input
                id="bearer-token"
                type="password"
                placeholder="Optional token"
                value={bearerToken}
                onChange={(event) => setBearerToken(event.target.value)}
              />
            </div>

            <Separator />

            <div className="grid gap-3">
              <Label htmlFor="uuid">UUID of 11 digits</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="uuid"
                  inputMode="numeric"
                  maxLength={11}
                  pattern="[0-9]{11}"
                  placeholder="12345678901"
                  value={uuid}
                  onChange={(event) =>
                    setUuid(event.target.value.replace(/\D/g, "").slice(0, 11))
                  }
                  className="font-mono text-lg tracking-[0.22em]"
                />
                <Button
                  type="submit"
                  size="lg"
                  className="min-w-32 gap-2 font-semibold"
                  disabled={state.status === "loading"}
                >
                  {state.status === "loading" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                  ENTER
                </Button>
              </div>
              <p
                className={`text-xs ${
                  uuid && uuidPattern.test(uuid)
                    ? "text-emerald-300"
                    : "text-muted-foreground"
                }`}
              >
                {uuidStatus}
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-white/10 bg-card/80 shadow-2xl shadow-black/20">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Image result</CardTitle>
              <CardDescription>
                Live preview appears here after a successful request.
              </CardDescription>
            </div>
            <ShieldCheck className="h-5 w-5 text-emerald-300" />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black/30">
            {state.imageSrc ? (
              <Image
                src={state.imageSrc}
                alt={`API result for UUID ${uuid}`}
                fill
                unoptimized
                className="object-contain"
              />
            ) : (
              <div className="flex max-w-xs flex-col items-center gap-3 p-8 text-center">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <ImageIcon className="h-9 w-9 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">No image loaded yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submit the form to call your API and render the response.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Alert
            variant={state.status === "error" ? "destructive" : "default"}
            className="border-white/10 bg-background/60"
          >
            {state.status === "error" ? (
              <AlertCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            <AlertTitle>
              {state.status === "error"
                ? "Action needed"
                : state.status === "success"
                  ? "Ready"
                  : state.status === "loading"
                    ? "Fetching"
                    : "Configured for API use"}
            </AlertTitle>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-muted-foreground">
            <div className="flex items-center justify-between gap-3">
              <span>UUID rule</span>
              <span className="font-mono text-foreground">11 digits only</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Credential handling</span>
              <span className="text-right text-foreground">not stored</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
