-- Module 4: retain prescreen/additional-question context for calendar descriptions.
-- `interviews.description` exists in the foundation schema; this migration
-- enforces its database boundary for independently deployed scheduling stacks.
alter table public.interviews
  drop constraint if exists interviews_description_length;
alter table public.interviews
  add constraint interviews_description_length check (char_length(description) <= 5000);

create or replace function public.populate_interview_description()
returns trigger language plpgsql as $$
begin
  if coalesce(trim(new.description), '') = '' then new.description := new.additional_questions; end if;
  return new;
end;
$$;
drop trigger if exists interviews_description_from_questions on public.interviews;
create trigger interviews_description_from_questions
before insert or update of description, additional_questions on public.interviews
for each row execute function public.populate_interview_description();
