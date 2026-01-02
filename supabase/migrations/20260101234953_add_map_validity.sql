alter table "public"."maps" add column "validity" text not null default 'valid';
alter table "public"."maps" alter column "validity" drop default;
