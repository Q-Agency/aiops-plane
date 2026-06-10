/** Shared gate-review constants (C4). */

/** Reject requires a typed reason of at least this length (C4). */
export const REJECT_REASON_MIN_CHARS = 10;

/** Where an approval sends the ticket next — confirm-dialog copy. */
export const NEXT_STAGE_AFTER_APPROVAL: Record<string, string> = {
  "Spec approval": "Ready for Design",
  "Design approval": "Ready for Tasks",
  "Tasks approval": "Ready for Dev",
  "Code approval": "Ready for QA",
  "QA approval": "Done",
};
