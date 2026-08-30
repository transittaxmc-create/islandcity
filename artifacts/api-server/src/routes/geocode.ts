import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";

type TomTomAddress = {
  freeformAddress?: string;
  streetName?: string;
  municipality?: string;
  municipalitySubdivision?: string;
  countrySubdivision?: string;
};

type TomTomReverseResponse = {
  addresses?: Array<{ address?: TomTomAddress }>;
};

type TomTomNearbyResponse = {
  results?: Array<{
    dist?: number;
    poi?: {
      name?: string;
      categories?: string[];
    };
  }>;
};

const router: IRouter = Router();

router.get("/geocode", requireAuth, async (req, res): Promise<void> => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    res.status(400).json({ ok: false, error: "Invalid latitude or longitude" });
    return;
  }

  const apiKey = process.env.TOMTOM_API_KEY;
  if (!apiKey) {
    req.log.error("TOMTOM_API_KEY is not configured");
    res.status(503).json({ ok: false, error: "Geocoding is not configured" });
    return;
  }

  const reverseParams = new URLSearchParams({
    key: apiKey,
    radius: "100",
    returnSpeedLimit: "false",
  });
  const nearbyParams = new URLSearchParams({
    key: apiKey,
    lat: String(lat),
    lon: String(lng),
    radius: "250",
    limit: "5",
  });

  try {
    const [reverseResult, nearbyResult] = await Promise.allSettled([
      fetch(`https://api.tomtom.com/search/2/reverseGeocode/${lat},${lng}.json?${reverseParams}`),
      fetch(`https://api.tomtom.com/search/2/nearbySearch/.json?${nearbyParams}`),
    ]);

    let address: TomTomAddress | undefined;
    if (reverseResult.status === "fulfilled" && reverseResult.value.ok) {
      const body = await reverseResult.value.json() as TomTomReverseResponse;
      address = body.addresses?.[0]?.address;
    } else {
      const status = reverseResult.status === "fulfilled" ? reverseResult.value.status : undefined;
      req.log.warn({ provider: "tomtom", operation: "reverse", status }, "TomTom reverse geocoding failed");
    }

    let poi: { name: string; categories: string[]; distanceMeters?: number } | null = null;
    if (nearbyResult.status === "fulfilled" && nearbyResult.value.ok) {
      const body = await nearbyResult.value.json() as TomTomNearbyResponse;
      const nearest = body.results
        ?.filter(result => result.poi?.name)
        .sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity))[0];
      if (nearest?.poi?.name) {
        poi = {
          name: nearest.poi.name,
          categories: nearest.poi.categories ?? [],
          distanceMeters: nearest.dist,
        };
      }
    } else {
      const status = nearbyResult.status === "fulfilled" ? nearbyResult.value.status : undefined;
      req.log.warn({ provider: "tomtom", operation: "nearby", status }, "TomTom nearby search failed");
    }

    if (!address && !poi) {
      res.status(502).json({ ok: false, error: "TomTom geocoding failed" });
      return;
    }

    res.json({ ok: true, address, poi });
  } catch (error) {
    req.log.error({ err: error }, "Unexpected TomTom geocoding error");
    res.status(502).json({ ok: false, error: "TomTom geocoding failed" });
  }
});

export default router;