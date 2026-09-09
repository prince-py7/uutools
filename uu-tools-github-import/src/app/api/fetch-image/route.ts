import { NextRequest, NextResponse } from "next/server";

const uuidPattern = /^\d{11}$/;

type ImagePayload = {
  uuid?: unknown;
  endpoint?: unknown;
  apiKey?: unknown;
  apiSecret?: unknown;
  bearerToken?: unknown;
};

type JsonRecord = Record<string, unknown>;

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNestedString(record: JsonRecord, keys: string[]) {
  let current: unknown = record;

  for (const key of keys) {
    if (!current || typeof current !== "object" || !(key in current)) {
      return "";
    }

    current = (current as JsonRecord)[key];
  }

  return getString(current);
}

function buildHeaders(payload: ImagePayload) {
  const headers = new Headers({
    Accept: "application/json,image/*",
  });

  const apiKey = getString(payload.apiKey);
  const apiSecret = getString(payload.apiSecret);
  const bearerToken = getString(payload.bearerToken);

  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  }

  if (apiSecret) {
    headers.set("X-API-Secret", apiSecret);
  }

  if (bearerToken) {
    headers.set("Authorization", `Bearer ${bearerToken}`);
  }

  return headers;
}

async function toDataUrl(response: Response) {
  const contentType = response.headers.get("content-type") || "image/png";
  const buffer = Buffer.from(await response.arrayBuffer());

  return `data:${contentType};base64,${buffer.toString("base64")}`;
}

async function imageUrlToDataUrl(imageUrl: string, headers: Headers) {
  const imageResponse = await fetch(imageUrl, {
    headers,
    cache: "no-store",
  });

  if (!imageResponse.ok) {
    throw new Error(`Image URL returned ${imageResponse.status}.`);
  }

  return toDataUrl(imageResponse);
}

function findImageSource(json: JsonRecord) {
  return (
    getString(json.imageSrc) ||
    getString(json.imageUrl) ||
    getString(json.image_url) ||
    getString(json.url) ||
    getString(json.image) ||
    getNestedString(json, ["data", "imageSrc"]) ||
    getNestedString(json, ["data", "imageUrl"]) ||
    getNestedString(json, ["data", "image_url"]) ||
    getNestedString(json, ["data", "url"]) ||
    getNestedString(json, ["result", "imageSrc"]) ||
    getNestedString(json, ["result", "imageUrl"]) ||
    getNestedString(json, ["result", "image_url"]) ||
    getNestedString(json, ["result", "url"])
  );
}

export async function POST(request: NextRequest) {
  let payload: ImagePayload;

  try {
    payload = (await request.json()) as ImagePayload;
  } catch {
    return NextResponse.json(
      { error: "Invalid request body. Send JSON values for endpoint and UUID." },
      { status: 400 },
    );
  }

  const uuid = getString(payload.uuid);
  const endpoint = getString(payload.endpoint);

  if (!uuidPattern.test(uuid)) {
    return NextResponse.json(
      { error: "UUID must contain exactly 11 digits." },
      { status: 400 },
    );
  }

  if (!endpoint) {
    return NextResponse.json(
      { error: "Image API endpoint is required." },
      { status: 400 },
    );
  }

  let targetUrl: URL;

  try {
    targetUrl = new URL(endpoint);
  } catch {
    return NextResponse.json(
      { error: "Endpoint must be a valid http or https URL." },
      { status: 400 },
    );
  }

  if (!["http:", "https:"].includes(targetUrl.protocol)) {
    return NextResponse.json(
      { error: "Endpoint must use http or https." },
      { status: 400 },
    );
  }

  targetUrl.searchParams.set("uuid", uuid);

  const headers = buildHeaders(payload);

  try {
    const apiResponse = await fetch(targetUrl, {
      headers,
      cache: "no-store",
    });

    if (!apiResponse.ok) {
      return NextResponse.json(
        { error: `Image API returned ${apiResponse.status}.` },
        { status: apiResponse.status },
      );
    }

    const contentType = apiResponse.headers.get("content-type") || "";

    if (contentType.startsWith("image/")) {
      return NextResponse.json({
        imageSrc: await toDataUrl(apiResponse),
        message: "Image loaded directly from the API response.",
      });
    }

    const json = (await apiResponse.json()) as JsonRecord;
    const imageSource = findImageSource(json);

    if (!imageSource) {
      return NextResponse.json(
        {
          error:
            "The API response did not include an image URL or base64 image field.",
        },
        { status: 502 },
      );
    }

    if (imageSource.startsWith("data:image/")) {
      return NextResponse.json({
        imageSrc: imageSource,
        message: "Image loaded from a base64 response field.",
      });
    }

    const dataUrl = await imageUrlToDataUrl(imageSource, headers);

    return NextResponse.json({
      imageSrc: dataUrl,
      message: "Image loaded from the URL returned by the API.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch an image from the API.",
      },
      { status: 500 },
    );
  }
}
