drop extension if exists "pg_net";
create extension if not exists "hypopg" with schema "extensions";
create extension if not exists "index_advisor" with schema "extensions";

set check_function_bodies = off;
