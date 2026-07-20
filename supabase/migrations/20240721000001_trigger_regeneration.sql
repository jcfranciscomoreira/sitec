alter table public.associados add column __temp_regeneration_trigger boolean;
alter table public.associados drop column __temp_regeneration_trigger;
