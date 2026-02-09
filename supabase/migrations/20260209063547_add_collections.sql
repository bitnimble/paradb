create sequence "public"."collections__id_seq";

create sequence "public"."collection_maps__id_seq";

create sequence "public"."collection_favorites__id_seq";


create table "public"."collections" (
  "_id" integer not null default nextval('public.collections__id_seq'::regclass),
  "id" character varying(16) not null,
  "creator_id" character varying(16) not null,
  "creation_date" timestamp without time zone not null,
  "name" character varying(256) not null,
  "description" text,
  "album_art" text
);


create table "public"."collection_maps" (
  "_id" integer not null default nextval('public.collection_maps__id_seq'::regclass),
  "collection_id" character varying(16) not null,
  "map_id" character varying(16) not null,
  "position" integer not null
);


create table "public"."collection_favorites" (
  "_id" integer not null default nextval('public.collection_favorites__id_seq'::regclass),
  "collection_id" character varying(16) not null,
  "user_id" character varying(16) not null,
  "favorited_date" timestamp without time zone not null
);


alter sequence "public"."collections__id_seq" owned by "public"."collections"."_id";

alter sequence "public"."collection_maps__id_seq" owned by "public"."collection_maps"."_id";

alter sequence "public"."collection_favorites__id_seq" owned by "public"."collection_favorites"."_id";

CREATE UNIQUE INDEX collections_pkey ON public.collections USING btree (id);

CREATE INDEX idx_collections_creator_id ON public.collections USING btree (creator_id);

CREATE INDEX idx_collection_maps_collection_id ON public.collection_maps USING btree (collection_id);

CREATE INDEX idx_collection_maps_map_id ON public.collection_maps USING btree (map_id);

CREATE UNIQUE INDEX collection_map_position ON public.collection_maps USING btree (collection_id, position);

CREATE UNIQUE INDEX collection_map_unique ON public.collection_maps USING btree (collection_id, map_id);

CREATE INDEX idx_collection_favorites_collection_id ON public.collection_favorites USING btree (collection_id);

CREATE INDEX idx_collection_favorites_user_id ON public.collection_favorites USING btree (user_id);

CREATE UNIQUE INDEX collection_favorite ON public.collection_favorites USING btree (collection_id, user_id);

alter table "public"."collections" add constraint "collections_pkey" PRIMARY KEY using index "collections_pkey";

alter table "public"."collections" add constraint "collections_creator_id_fkey" FOREIGN KEY (creator_id) REFERENCES public.users(id) not valid;

alter table "public"."collections" validate constraint "collections_creator_id_fkey";

alter table "public"."collection_maps" add constraint "collection_maps_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) not valid;

alter table "public"."collection_maps" validate constraint "collection_maps_collection_id_fkey";

alter table "public"."collection_maps" add constraint "collection_maps_map_id_fkey" FOREIGN KEY (map_id) REFERENCES public.maps(id) not valid;

alter table "public"."collection_maps" validate constraint "collection_maps_map_id_fkey";

alter table "public"."collection_maps" add constraint "collection_map_position" UNIQUE using index "collection_map_position";

alter table "public"."collection_maps" add constraint "collection_map_unique" UNIQUE using index "collection_map_unique";

alter table "public"."collection_favorites" add constraint "collection_favorites_collection_id_fkey" FOREIGN KEY (collection_id) REFERENCES public.collections(id) not valid;

alter table "public"."collection_favorites" validate constraint "collection_favorites_collection_id_fkey";

alter table "public"."collection_favorites" add constraint "collection_favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.users(id) not valid;

alter table "public"."collection_favorites" validate constraint "collection_favorites_user_id_fkey";

alter table "public"."collection_favorites" add constraint "collection_favorite" UNIQUE using index "collection_favorite";

grant delete on table "public"."collections" to "anon";

grant insert on table "public"."collections" to "anon";

grant references on table "public"."collections" to "anon";

grant select on table "public"."collections" to "anon";

grant trigger on table "public"."collections" to "anon";

grant truncate on table "public"."collections" to "anon";

grant update on table "public"."collections" to "anon";

grant delete on table "public"."collections" to "authenticated";

grant insert on table "public"."collections" to "authenticated";

grant references on table "public"."collections" to "authenticated";

grant select on table "public"."collections" to "authenticated";

grant trigger on table "public"."collections" to "authenticated";

grant truncate on table "public"."collections" to "authenticated";

grant update on table "public"."collections" to "authenticated";

grant delete on table "public"."collections" to "service_role";

grant insert on table "public"."collections" to "service_role";

grant references on table "public"."collections" to "service_role";

grant select on table "public"."collections" to "service_role";

grant trigger on table "public"."collections" to "service_role";

grant truncate on table "public"."collections" to "service_role";

grant update on table "public"."collections" to "service_role";

grant delete on table "public"."collection_maps" to "anon";

grant insert on table "public"."collection_maps" to "anon";

grant references on table "public"."collection_maps" to "anon";

grant select on table "public"."collection_maps" to "anon";

grant trigger on table "public"."collection_maps" to "anon";

grant truncate on table "public"."collection_maps" to "anon";

grant update on table "public"."collection_maps" to "anon";

grant delete on table "public"."collection_maps" to "authenticated";

grant insert on table "public"."collection_maps" to "authenticated";

grant references on table "public"."collection_maps" to "authenticated";

grant select on table "public"."collection_maps" to "authenticated";

grant trigger on table "public"."collection_maps" to "authenticated";

grant truncate on table "public"."collection_maps" to "authenticated";

grant update on table "public"."collection_maps" to "authenticated";

grant delete on table "public"."collection_maps" to "service_role";

grant insert on table "public"."collection_maps" to "service_role";

grant references on table "public"."collection_maps" to "service_role";

grant select on table "public"."collection_maps" to "service_role";

grant trigger on table "public"."collection_maps" to "service_role";

grant truncate on table "public"."collection_maps" to "service_role";

grant update on table "public"."collection_maps" to "service_role";

grant delete on table "public"."collection_favorites" to "anon";

grant insert on table "public"."collection_favorites" to "anon";

grant references on table "public"."collection_favorites" to "anon";

grant select on table "public"."collection_favorites" to "anon";

grant trigger on table "public"."collection_favorites" to "anon";

grant truncate on table "public"."collection_favorites" to "anon";

grant update on table "public"."collection_favorites" to "anon";

grant delete on table "public"."collection_favorites" to "authenticated";

grant insert on table "public"."collection_favorites" to "authenticated";

grant references on table "public"."collection_favorites" to "authenticated";

grant select on table "public"."collection_favorites" to "authenticated";

grant trigger on table "public"."collection_favorites" to "authenticated";

grant truncate on table "public"."collection_favorites" to "authenticated";

grant update on table "public"."collection_favorites" to "authenticated";

grant delete on table "public"."collection_favorites" to "service_role";

grant insert on table "public"."collection_favorites" to "service_role";

grant references on table "public"."collection_favorites" to "service_role";

grant select on table "public"."collection_favorites" to "service_role";

grant trigger on table "public"."collection_favorites" to "service_role";

grant truncate on table "public"."collection_favorites" to "service_role";

grant update on table "public"."collection_favorites" to "service_role";
