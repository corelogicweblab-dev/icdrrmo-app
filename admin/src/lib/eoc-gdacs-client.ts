import type { HazardGeoJsonFeature } from "@/lib/eoc-weather-geojson";

const GDACS_FEED = "https://www.gdacs.org/xml/rss_24h.xml";

function stripTags(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(block: string, local: string): string {
  const re = new RegExp(
    `<(?:[\\w-]+:)?${local}[^>]*>([\\s\\S]*?)<\\/(?:[\\w-]+:)?${local}>`,
    "i",
  );
  return stripTags(block.match(re)?.[1] ?? "");
}

function parsePoint(block: string): [number, number] | null {
  const raw = tag(block, "point") || `${tag(block, "lat")} ${tag(block, "long")}`;
  const parts = raw.split(/[\s,]+/).map(Number);
  if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) {
    return null;
  }
  return [parts[1], parts[0]];
}

/** Browser fallback when API GeoJSON is empty (e.g. old Render deploy). */
export async function fetchGdacsClientFeatures(): Promise<HazardGeoJsonFeature[]> {
  try {
    const res = await fetch(GDACS_FEED, { cache: "no-store" });
    if (!res.ok) return [];
    const xml = await res.text();
    const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
    const features: HazardGeoJsonFeature[] = [];
    blocks.forEach((block, i) => {
      const title = tag(block, "title");
      if (!title) return;
      const coords = parsePoint(block);
      if (!coords) return;
      const level = title.toLowerCase().includes("red")
        ? "Red"
        : title.toLowerCase().includes("orange")
          ? "Orange"
          : title.toLowerCase().includes("green")
            ? "Green"
            : "unknown";
      features.push({
        type: "Feature",
        id: `gdacs-client:${i}`,
        geometry: { type: "Point", coordinates: coords },
        properties: {
          source: "gdacs",
          kind: "global-disaster-alert",
          title,
          link: (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "").trim(),
          description: tag(block, "description").slice(0, 500),
          eventType: tag(block, "eventtype") || "unknown",
          alertLevel: level,
        },
      });
    });
    return features.slice(0, 60);
  } catch {
    return [];
  }
}
