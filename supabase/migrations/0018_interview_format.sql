-- Persist the meeting format so provider retries cannot change an on-site interview into an online meeting.
alter table public.interviews
  add column if not exists format text not null default 'online';

alter table public.interviews
  drop constraint if exists interviews_format_check;
alter table public.interviews
  add constraint interviews_format_check check (format in ('online', 'onsite'));

create or replace function public.populate_interview_format()
returns trigger language plpgsql as $$
begin
  if position('รูปแบบ: onsite' in coalesce(new.additional_questions, '')) > 0 then
    new.format := 'onsite';
  elsif position('รูปแบบ: online' in coalesce(new.additional_questions, '')) > 0 then
    new.format := 'online';
  end if;
  return new;
end;
$$;

drop trigger if exists interviews_format_from_questions on public.interviews;
create trigger interviews_format_from_questions
before insert or update of additional_questions on public.interviews
for each row execute function public.populate_interview_format();
