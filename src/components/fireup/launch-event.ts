/**
 * Cancelable window event the WizardShell footer "Launch pod" CTA dispatches
 * on the golive step. StepGoLive intercepts it (preventDefault) to run the
 * full launch sequence (warn-confirm dialog + launch overlay) so both CTAs
 * share one path; if nothing intercepts, the shell falls back to an instant
 * launch.
 *
 * Lives in its own module (not steps.ts) so StepGoLive can import it without
 * creating a circular import with the step registry.
 */
export const LAUNCH_REQUEST_EVENT = "fireup:request-launch";
