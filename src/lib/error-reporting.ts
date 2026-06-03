type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type ErrorReporter = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: ErrorReportOptions,
  ) => void;
};

declare global {
  interface Window {
    __errorReporter?: ErrorReporter;
  }
}

/**
 * Vendor-neutral client error reporter.
 *
 * By default this logs to the console. To forward errors to a monitoring
 * service (Sentry, GlitchTip, etc.), assign an object with a `captureException`
 * method to `window.__errorReporter`, or replace the body of this function.
 */
export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const enriched = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };

  if (window.__errorReporter?.captureException) {
    window.__errorReporter.captureException(error, enriched, {
      mechanism: "react_error_boundary",
      handled: false,
      severity: "error",
    });
    return;
  }

  console.error("[error-reporting]", error, enriched);
}
