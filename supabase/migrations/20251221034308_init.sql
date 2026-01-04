create sequence "public"."difficulties__id_seq";

create sequence "public"."favorites__id_seq";

create sequence "public"."maps__id_seq";

create sequence "public"."users__id_seq";


  create table "public"."difficulties" (
    "_id" integer not null default nextval('public.difficulties__id_seq'::regclass),
    "map_id" character varying(16) not null,
    "difficulty" integer,
    "difficulty_name" character varying(256)
      );



  create table "public"."favorites" (
    "_id" integer not null default nextval('public.favorites__id_seq'::regclass),
    "map_id" character varying(16) not null,
    "user_id" character varying(16) not null,
    "favorited_date" timestamp without time zone not null
      );



  create table "public"."maps" (
    "_id" integer not null default nextval('public.maps__id_seq'::regclass),
    "id" character varying(16) not null,
    "map_status" character(1) not null,
    "submission_date" timestamp without time zone not null,
    "title" character varying(256) not null,
    "artist" character varying(256) not null,
    "author" character varying(256),
    "uploader" character varying(256) not null,
    "download_count" integer not null default 0,
    "description" text,
    "tags" text,
    "complexity" integer,
    "album_art" text
      );



  create table "public"."users" (
    "_id" integer not null default nextval('public.users__id_seq'::regclass),
    "id" character varying(16) not null,
    "creation_date" timestamp without time zone not null,
    "account_status" character(1) not null,
    "username" character varying(32) not null,
    "email" character varying(254) not null,
    "email_status" character(1) not null,
    "password" bytea not null,
    "password_updated" timestamp without time zone not null
      );


alter sequence "public"."difficulties__id_seq" owned by "public"."difficulties"."_id";

alter sequence "public"."favorites__id_seq" owned by "public"."favorites"."_id";

alter sequence "public"."maps__id_seq" owned by "public"."maps"."_id";

alter sequence "public"."users__id_seq" owned by "public"."users"."_id";

CREATE INDEX idx_favorites_map_id ON public.favorites USING btree (map_id);

CREATE INDEX idx_favorites_user_id ON public.favorites USING btree (user_id);

CREATE INDEX idx_users_email ON public.users USING btree (lower((email)::text));

CREATE INDEX idx_users_username ON public.users USING btree (lower((username)::text));

CREATE UNIQUE INDEX maps_pkey ON public.maps USING btree (id);

CREATE UNIQUE INDEX user_favorite ON public.favorites USING btree (map_id, user_id);

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id);

CREATE UNIQUE INDEX users_username_key ON public.users USING btree (username);

alter table "public"."maps" add constraint "maps_pkey" PRIMARY KEY using index "maps_pkey";

alter table "public"."users" add constraint "users_pkey" PRIMARY KEY using index "users_pkey";

alter table "public"."difficulties" add constraint "difficulties_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.maps(id) not valid;

alter table "public"."difficulties" validate constraint "difficulties_map_id_fkey";

alter table "public"."favorites" add constraint "favorites_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.maps(id) not valid;

alter table "public"."favorites" validate constraint "favorites_map_id_fkey";

alter table "public"."favorites" add constraint "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."favorites" validate constraint "favorites_user_id_fkey";

alter table "public"."favorites" add constraint "user_favorite" UNIQUE using index "user_favorite";

alter table "public"."users" add constraint "users_email_key" UNIQUE using index "users_email_key";

alter table "public"."users" add constraint "users_username_key" UNIQUE using index "users_username_key";

grant delete on table "public"."difficulties" to "anon";

grant insert on table "public"."difficulties" to "anon";

grant references on table "public"."difficulties" to "anon";

grant select on table "public"."difficulties" to "anon";

grant trigger on table "public"."difficulties" to "anon";

grant truncate on table "public"."difficulties" to "anon";

grant update on table "public"."difficulties" to "anon";

grant delete on table "public"."difficulties" to "authenticated";

grant insert on table "public"."difficulties" to "authenticated";

grant references on table "public"."difficulties" to "authenticated";

grant select on table "public"."difficulties" to "authenticated";

grant trigger on table "public"."difficulties" to "authenticated";

grant truncate on table "public"."difficulties" to "authenticated";

grant update on table "public"."difficulties" to "authenticated";

grant delete on table "public"."difficulties" to "service_role";

grant insert on table "public"."difficulties" to "service_role";

grant references on table "public"."difficulties" to "service_role";

grant select on table "public"."difficulties" to "service_role";

grant trigger on table "public"."difficulties" to "service_role";

grant truncate on table "public"."difficulties" to "service_role";

grant update on table "public"."difficulties" to "service_role";

grant delete on table "public"."favorites" to "anon";

grant insert on table "public"."favorites" to "anon";

grant references on table "public"."favorites" to "anon";

grant select on table "public"."favorites" to "anon";

grant trigger on table "public"."favorites" to "anon";

grant truncate on table "public"."favorites" to "anon";

grant update on table "public"."favorites" to "anon";

grant delete on table "public"."favorites" to "authenticated";

grant insert on table "public"."favorites" to "authenticated";

grant references on table "public"."favorites" to "authenticated";

grant select on table "public"."favorites" to "authenticated";

grant trigger on table "public"."favorites" to "authenticated";

grant truncate on table "public"."favorites" to "authenticated";

grant update on table "public"."favorites" to "authenticated";

grant delete on table "public"."favorites" to "service_role";

grant insert on table "public"."favorites" to "service_role";

grant references on table "public"."favorites" to "service_role";

grant select on table "public"."favorites" to "service_role";

grant trigger on table "public"."favorites" to "service_role";

grant truncate on table "public"."favorites" to "service_role";

grant update on table "public"."favorites" to "service_role";

grant delete on table "public"."maps" to "anon";

grant insert on table "public"."maps" to "anon";

grant references on table "public"."maps" to "anon";

grant select on table "public"."maps" to "anon";

grant trigger on table "public"."maps" to "anon";

grant truncate on table "public"."maps" to "anon";

grant update on table "public"."maps" to "anon";

grant delete on table "public"."maps" to "authenticated";

grant insert on table "public"."maps" to "authenticated";

grant references on table "public"."maps" to "authenticated";

grant select on table "public"."maps" to "authenticated";

grant trigger on table "public"."maps" to "authenticated";

grant truncate on table "public"."maps" to "authenticated";

grant update on table "public"."maps" to "authenticated";

grant delete on table "public"."maps" to "service_role";

grant insert on table "public"."maps" to "service_role";

grant references on table "public"."maps" to "service_role";

grant select on table "public"."maps" to "service_role";

grant trigger on table "public"."maps" to "service_role";

grant truncate on table "public"."maps" to "service_role";

grant update on table "public"."maps" to "service_role";

grant delete on table "public"."users" to "anon";

grant insert on table "public"."users" to "anon";

grant references on table "public"."users" to "anon";

grant select on table "public"."users" to "anon";

grant trigger on table "public"."users" to "anon";

grant truncate on table "public"."users" to "anon";

grant update on table "public"."users" to "anon";

grant delete on table "public"."users" to "authenticated";

grant insert on table "public"."users" to "authenticated";

grant references on table "public"."users" to "authenticated";

grant select on table "public"."users" to "authenticated";

grant trigger on table "public"."users" to "authenticated";

grant truncate on table "public"."users" to "authenticated";

grant update on table "public"."users" to "authenticated";

grant delete on table "public"."users" to "service_role";

grant insert on table "public"."users" to "service_role";

grant references on table "public"."users" to "service_role";

grant select on table "public"."users" to "service_role";

grant trigger on table "public"."users" to "service_role";

grant truncate on table "public"."users" to "service_role";

grant update on table "public"."users" to "service_role";


