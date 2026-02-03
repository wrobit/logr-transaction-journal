export const feedbackReasons = [
  "tracking_elsewhere",
  "no_longer_needed",
  "missing_features",
  "too_complex",
  "privacy",
  "other",
] as const;

export const feedbackOptions = [
  { value: "tracking_elsewhere", label: "Tracking elsewhere" },
  { value: "no_longer_needed", label: "No longer needed" },
  { value: "missing_features", label: "Missing features" },
  { value: "too_complex", label: "Too complex" },
  { value: "privacy", label: "Privacy concerns" },
  { value: "other", label: "Other" },
] as const;

export type FeedbackReason = (typeof feedbackReasons)[number];
