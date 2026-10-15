-- Zoals Supabase standaard doet: ingelogde gebruikers mogen tabellen benaderen, RLS bepaalt wat ze zien.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
