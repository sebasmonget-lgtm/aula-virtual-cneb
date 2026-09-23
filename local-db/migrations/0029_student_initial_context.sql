alter table students add column initial_context text
  check (initial_context is null or char_length(initial_context) <= 2000);
