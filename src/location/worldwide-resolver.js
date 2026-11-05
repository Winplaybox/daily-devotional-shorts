/**
 * Worldwide place resolver using Open-Meteo Geocoding.
 * Requires explicit city/locality text; never reads a viewer's profile location.
 * Ambiguous matches are rejected rather than silently selecting a different city.
 */
export async function resolveWorldwideLocation(locationText) {
  const query = String(locationText || "").trim();
  if (query.length < 2 || query.length > 120) throw new Error("Location text must be 2–120 characters");
  const endpoint = new URL("https://geocoding-api.open-meteo.com/v1/search");
  endpoint.searchParams.set("name", query);
  endpoint.searchParams.set("count", "10");
  endpoint.searchParams.set("language", "en");
  endpoint.searchParams.set("format", "json");

  const response = await fetch(endpoint, {
    headers: { "Accept": "application/json", "User-Agent": "PavitraPanchang365/1.0 (location resolver)" },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error(`Geocoding provider returned HTTP ${response.status}`);
  const payload = await response.json();
  const results = (payload.results || []).filter((item) =>
    Number.isFinite(item.latitude) && Number.isFinite(item.longitude) &&
    typeof item.timezone === "string" && item.timezone.includes("/")
  );
  if (!results.length) throw new Error("No matching city found");

  const normalize = (value) => String(value || "").normalize("NFKD").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  const requested = normalize(query);
  const exact = results.filter((item) => {
    const names = [item.name, item.admin1, item.country].map(normalize);
    return names.some((name) => name && (requested === name || requested.split(" ").every((token) => names.some((candidate) => candidate.includes(token)))));
  });
  const candidates = exact.length ? exact : results;
  const unique = new Map(candidates.map((item) => [`${item.latitude.toFixed(3)},${item.longitude.toFixed(3)},${item.timezone}`, item]));
  if (unique.size !== 1) {
    const options = [...unique.values()].slice(0, 5).map((item) =>
      [item.name, item.admin1, item.country].filter(Boolean).join(", "));
    const error = new Error("Location is ambiguous; ask viewer to specify region and country");
    error.candidates = options;
    throw error;
  }
  const item = [...unique.values()][0];
  return {
    location_id: `geo-${item.id || Math.abs(Math.round(item.latitude * 1000)) + "-" + Math.abs(Math.round(item.longitude * 1000))}`,
    city: item.name,
    admin1: item.admin1 || "",
    country: item.country || "",
    country_code: item.country_code || "",
    latitude: item.latitude,
    longitude: item.longitude,
    timezone: item.timezone,
    source: "open-meteo-geocoding",
    resolved_at: new Date().toISOString(),
  };
}
