import { applicationStages, candidateSources, type ApplicationStage, type CandidateSource, type JobStatus } from "@/domain/enums";

export type TrackerFilters = {
  view: "board" | "list";
  search: string;
  jobId: string;
  stage: ApplicationStage | "all";
  source: CandidateSource | "all";
};

export type TrackerCandidate = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  source: CandidateSource;
  sourceDetail: string | null;
  version: number;
  resumeUrl?: string | null;
  resumeText?: string | null;
  normalizedProfile?: Record<string, unknown> | null;
};

export type TrackerJob = { id: string; title: string; status: JobStatus };

export type TrackerApplication = {
  id: string;
  candidateId: string;
  jobId: string;
  stage: ApplicationStage;
  status: "active" | "withdrawn" | "archived";
  version: number;
  appliedAt: string;
  candidate: TrackerCandidate;
  job: TrackerJob;
};

export type ApplicationTrackerData = {
  applications: TrackerApplication[];
  candidates: TrackerCandidate[];
  jobs: TrackerJob[];
};

type SupabaseTrackerApplicationRow = {
  id: string;
  candidate_id: string;
  job_id: string;
  stage: ApplicationStage;
  status: TrackerApplication["status"];
  version: number;
  applied_at: string;
  candidates: { id: string; full_name: string; email: string | null; phone: string | null; source: CandidateSource; source_detail: string | null; version: number; normalized_profile?: Record<string, unknown> | null } | { id: string; full_name: string; email: string | null; phone: string | null; source: CandidateSource; source_detail: string | null; version: number; normalized_profile?: Record<string, unknown> | null }[];
  jobs: { id: string; title: string; status: JobStatus } | { id: string; title: string; status: JobStatus }[];
};

export const defaultTrackerFilters: TrackerFilters = { view: "board", search: "", jobId: "", stage: "all", source: "all" };

const isApplicationStage = (value: string): value is ApplicationStage => applicationStages.includes(value as ApplicationStage);
const isCandidateSource = (value: string): value is CandidateSource => candidateSources.includes(value as CandidateSource);
const one = <T>(value: T | T[]): T => Array.isArray(value) ? value[0] : value;
export const toTrackerApplication = (row: SupabaseTrackerApplicationRow): TrackerApplication => {
  const candidate = one(row.candidates);
  const job = one(row.jobs);
  return {
    id: row.id,
    candidateId: row.candidate_id,
    jobId: row.job_id,
    stage: row.stage,
    status: row.status,
    version: row.version,
    appliedAt: row.applied_at,
    candidate: { id: candidate.id, fullName: candidate.full_name, email: candidate.email, phone: candidate.phone, source: candidate.source, sourceDetail: candidate.source_detail, version: candidate.version, normalizedProfile: candidate.normalized_profile },
    job: { id: job.id, title: job.title, status: job.status },
  };
};

export const filterApplications = (applications: readonly TrackerApplication[], filters: TrackerFilters): TrackerApplication[] => {
  const search = filters.search.trim().toLocaleLowerCase();
  return applications.filter((application) => {
    const searchable = `${application.candidate.fullName} ${application.candidate.email ?? ""} ${application.job.title}`.toLocaleLowerCase();
    return (!search || searchable.includes(search)) &&
      (!filters.jobId || application.jobId === filters.jobId) &&
      (filters.stage === "all" || application.stage === filters.stage) &&
      (filters.source === "all" || application.candidate.source === filters.source);
  });
};

export const groupApplicationsByStage = (applications: readonly TrackerApplication[]): Record<ApplicationStage, TrackerApplication[]> =>
  applicationStages.reduce((groups, stage) => ({ ...groups, [stage]: applications.filter((application) => application.stage === stage) }), {} as Record<ApplicationStage, TrackerApplication[]>);

const readSearchParam = (params: URLSearchParams | Record<string, string | string[] | undefined>, key: string): string => {
  if (params instanceof URLSearchParams) return params.get(key) ?? "";
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
};

export const parseTrackerFilters = (params: URLSearchParams | Record<string, string | string[] | undefined>): TrackerFilters => {
  const view = readSearchParam(params, "view");
  const stage = readSearchParam(params, "stage");
  const source = readSearchParam(params, "source");
  return {
    view: view === "list" ? "list" : "board",
    search: readSearchParam(params, "search").trim(),
    jobId: readSearchParam(params, "job").trim(),
    stage: stage === "all" || !stage ? "all" : isApplicationStage(stage) ? stage : "all",
    source: source === "all" || !source ? "all" : isCandidateSource(source) ? source : "all",
  };
};

export const serializeTrackerFilters = (filters: TrackerFilters): string => {
  const params = new URLSearchParams();
  if (filters.view !== defaultTrackerFilters.view) params.set("view", filters.view);
  if (filters.search) params.set("search", filters.search);
  if (filters.jobId) params.set("job", filters.jobId);
  if (filters.stage !== "all") params.set("stage", filters.stage);
  if (filters.source !== "all") params.set("source", filters.source);
  return params.toString();
};
