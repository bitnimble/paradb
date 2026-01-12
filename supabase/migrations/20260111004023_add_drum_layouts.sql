CREATE TABLE drum_layouts (
  _id serial,
  id varchar(16) primary key,
  visibility char not null,
  validity text not null,
  submission_date timestamp not null,
  name varchar(256) not null,
  description text,
  uploader varchar(256) not null,
  image_path text,
  layout_format jsonb not null default '{}'::jsonb,
  download_count int not null default 0
);

alter table drum_layouts enable row level security;
