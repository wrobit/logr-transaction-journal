import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Feedback",
  description: "Review account deletion feedback.",
};

export default function AdminFeedbackPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Feedback</h2>
      <p className="text-sm text-muted-foreground">
        Feedback review tools will be added in the next phase.
      </p>
    </div>
  );
}
