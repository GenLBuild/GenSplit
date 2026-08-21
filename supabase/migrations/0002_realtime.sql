-- Enable Supabase Realtime on the tables that need live updates
-- No setInterval polling anywhere in the app — this is the live subscription source

alter publication supabase_realtime add table split_members;
alter publication supabase_realtime add table splits;
alter publication supabase_realtime add table public_feed;
