import { feedbackOptions, type FeedbackReason } from "@/lib/profile/feedback";

const reasonLabels = new Map(feedbackOptions.map((option) => [option.value, option.label]));

export function getFeedbackReasonLabel(reason: FeedbackReason | null) {
  if (!reason) {
    return "—";
  }

  return reasonLabels.get(reason) ?? reason;
}
