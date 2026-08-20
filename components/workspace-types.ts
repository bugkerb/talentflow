export type WorkspacePageId =
  | "jobs"
  | "discovery"
  | "screening"
  | "applications"
  | "interviews"
  | "settings"
  | "help";

export type JobListingViewModel = readonly [
  name: string,
  status: string,
  meta: string,
  freshApplicants: string,
  interviews: string,
  footer: string,
];

export interface ApplicationCardViewModel {
  readonly name: string;
  readonly initials: string;
  readonly experience?: string;
  readonly meta?: string;
  readonly time?: string;
  readonly tags?: readonly string[];
  readonly badge?: string;
  readonly detail?: string;
  readonly interview?: string;
  readonly hired?: boolean;
}

export interface ApplicationColumnViewModel {
  readonly title: string;
  readonly count: number;
  readonly dot: string;
  readonly cards: readonly ApplicationCardViewModel[];
}
