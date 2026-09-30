"use client";

import { useEffect, useState, useTransition } from "react";
import type { Locale } from "@/lib/i18n-config";
import { verifyAndGetTracking } from "@/lib/tracking/actions";
import type { TrackingResult, VerifyTrackingInput } from "@/lib/tracking/schema";
import { trackingErrorMessage } from "@/lib/tracking/error-messages";
import { TrackingForm } from "./TrackingForm";
import { TrackingDetails } from "./TrackingDetails";

export function TrackingPanel({
  locale,
  initialOrderIdOrNumber,
  prefillPhoneLast4,
}: {
  locale: Locale;
  initialOrderIdOrNumber: string;
  prefillPhoneLast4: string | null;
}) {
  const [tracking, setTracking] = useState<TrackingResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runVerify = (values: VerifyTrackingInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await verifyAndGetTracking(values);
      if (!result.ok) {
        // Localize from the machine-readable code (the server `error` string
        // stays as a fallback only).
        setServerError(trackingErrorMessage(result.code, locale));
        setTracking(null);
        return;
      }
      setTracking(result.tracking);
    });
  };

  // Auto-verify when arriving with ?p=XXXX (from order confirmation link).
  useEffect(() => {
    if (!prefillPhoneLast4 || tracking) return;
    runVerify({
      orderIdOrNumber: initialOrderIdOrNumber,
      phoneLast4: prefillPhoneLast4,
    });
    // intentionally one-shot; deps lock to initial values only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (tracking) {
    return <TrackingDetails tracking={tracking} locale={locale} />;
  }

  return (
    <TrackingForm
      locale={locale}
      initialOrderIdOrNumber={initialOrderIdOrNumber}
      pending={isPending}
      serverError={serverError}
      onSubmit={runVerify}
    />
  );
}
