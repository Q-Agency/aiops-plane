/**
 * useRoiAssumptions — the client-side "Edit assumptions" seam behind every
 * ROI surface (C2). Reads/writes the localStorage override
 * (ROI_ASSUMPTIONS_STORAGE_KEY, "aiops_roi_assumptions") SSR-safely: the
 * server and first client render use the Q-default from @/mock/economics;
 * a mounted useEffect hydrates the stored override, and a window event
 * keeps every consumer (Command Center hero row, /economics band, dialog)
 * re-deriving from the same numbers in the same tick.
 *
 * deriveRoi() is the single net-of-plan-fees math: hours→$ uses the
 * (editable) blended rate; the ROI multiple divides by compute + plan fees
 * (aggregates.pricePaidUsd) — never by raw compute alone.
 */

import { useCallback, useEffect, useState } from "react";
import {
  aggregates,
  roiAssumptions as defaultAssumptions,
  ROI_ASSUMPTIONS_STORAGE_KEY,
  type RoiAssumptions,
} from "@/mock/economics";

/** Cross-component sync event so every hook instance re-reads storage. */
const SYNC_EVENT = "aiops:roi-assumptions";

function readStoredAssumptions(): RoiAssumptions {
  try {
    const raw = window.localStorage.getItem(ROI_ASSUMPTIONS_STORAGE_KEY);
    if (!raw) return defaultAssumptions;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" && parsed !== null &&
      typeof (parsed as RoiAssumptions).blendedRateUsdPerHr === "number" &&
      (parsed as RoiAssumptions).blendedRateUsdPerHr > 0 &&
      typeof (parsed as RoiAssumptions).baselineNote === "string"
    ) {
      return {
        blendedRateUsdPerHr: (parsed as RoiAssumptions).blendedRateUsdPerHr,
        baselineNote: (parsed as RoiAssumptions).baselineNote,
        source: "client-provided",
      };
    }
    return defaultAssumptions;
  } catch {
    return defaultAssumptions;
  }
}

export interface RoiDerived {
  /** The blended rate every hours→$ figure uses. */
  rate: number;
  source: RoiAssumptions["source"];
  /** Display label for the provenance, e.g. "$95/h · Q-default". */
  rateLine: string;
  hoursFreed: number;
  /** hoursFreed × rate. */
  hoursFreedUsd: number;
  /** Compute + plan fees this period (the all-in denominator). */
  allInCostUsd: number;
  /** hoursFreedUsd − all-in cost (NET of plan fees). */
  netUsd: number;
  /** hoursFreedUsd ÷ all-in cost (NET of plan fees). */
  roiMultiple: number;
}

export function deriveRoi(a: RoiAssumptions): RoiDerived {
  const rate = a.blendedRateUsdPerHr;
  const hoursFreed = aggregates.humanHoursDisplaced;
  const hoursFreedUsd = +(hoursFreed * rate).toFixed(0);
  const allInCostUsd = +(aggregates.totalCost + aggregates.pricePaidUsd).toFixed(0);
  return {
    rate,
    source: a.source,
    rateLine: `$${rate}/h · ${a.source}`,
    hoursFreed,
    hoursFreedUsd,
    allInCostUsd,
    netUsd: hoursFreedUsd - allInCostUsd,
    roiMultiple: +(hoursFreedUsd / Math.max(1, allInCostUsd)).toFixed(1),
  };
}

export interface UseRoiAssumptions {
  assumptions: RoiAssumptions;
  derived: RoiDerived;
  /** True once the stored override (if any) has been hydrated. */
  mounted: boolean;
  /** Persist an edit — provenance flips to "client-provided" (your numbers, not ours). */
  save: (next: { blendedRateUsdPerHr: number; baselineNote: string }) => void;
  /** Drop the override and return to the Q-default baseline. */
  reset: () => void;
}

export function useRoiAssumptions(): UseRoiAssumptions {
  const [assumptions, setAssumptions] = useState<RoiAssumptions>(defaultAssumptions);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAssumptions(readStoredAssumptions());
    const onSync = () => setAssumptions(readStoredAssumptions());
    window.addEventListener(SYNC_EVENT, onSync);
    return () => window.removeEventListener(SYNC_EVENT, onSync);
  }, []);

  const save = useCallback((next: { blendedRateUsdPerHr: number; baselineNote: string }) => {
    const stored: RoiAssumptions = { ...next, source: "client-provided" };
    try {
      window.localStorage.setItem(ROI_ASSUMPTIONS_STORAGE_KEY, JSON.stringify(stored));
    } catch {
      /* storage unavailable — session-only override */
    }
    setAssumptions(stored);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(ROI_ASSUMPTIONS_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setAssumptions(defaultAssumptions);
    window.dispatchEvent(new Event(SYNC_EVENT));
  }, []);

  return { assumptions, derived: deriveRoi(assumptions), mounted, save, reset };
}
