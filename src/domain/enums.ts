export const applicationStages = ["screening", "phone_screen", "interview", "offer", "hired", "rejected"] as const;
export type ApplicationStage = (typeof applicationStages)[number];
export const candidateSources = ["manual", "referral", "discovery", "import"] as const;
export type CandidateSource = (typeof candidateSources)[number];
export const jobStatuses = ["draft", "open", "paused", "closed"] as const;
export type JobStatus = (typeof jobStatuses)[number];

export const isValidStageTransition = (from: ApplicationStage, to: ApplicationStage): boolean => {
  if (from === to) return false;
  if (from === "hired" || from === "rejected") return false;
  const allowed: Record<ApplicationStage, readonly ApplicationStage[]> = {
    screening: ["phone_screen", "rejected"],
    phone_screen: ["interview", "rejected"],
    interview: ["offer", "rejected"],
    offer: ["hired", "rejected"],
    hired: [],
    rejected: []
  };
  return allowed[from].includes(to);
};
