alter table public.screenings
  add column if not exists team_interview_report jsonb;

alter table public.screenings
  drop constraint if exists screenings_scores_range;

alter table public.screenings
  add constraint screenings_scores_range check (
    (skills_score is null or skills_score between 0 and 10)
    and (experience_score is null or experience_score between 0 and 10)
    and (culture_score is null or culture_score between 0 and 10)
  );
