CREATE TABLE maps (
  _id serial,
  id varchar(16) primary key,
  visibility char not null,
  submission_date timestamp not null,
  title varchar(256) not null,
  artist varchar(256) not null,
  author varchar(256),
  uploader varchar(256) not null,
  download_count int not null default 0,
  description text,
  tags text,
  complexity int not null,
  album_art text
);

CREATE TABLE difficulties (
  _id serial,
  map_id varchar(16) references maps (id) not null,
  difficulty int,
  difficulty_name varchar(256) not null
);

CREATE INDEX difficulties_map_id_idx ON difficulties USING btree (map_id);

alter table difficulties enable row level security;
alter table maps enable row level security;
