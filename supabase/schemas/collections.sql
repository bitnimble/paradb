CREATE TABLE collections (
  _id serial,
  id varchar(16) primary key,
  creator_id varchar(16) references users (id) not null,
  creation_date timestamp not null,
  name varchar(256) not null,
  description text,
  album_art text
);

CREATE TABLE collection_maps (
  _id serial,
  collection_id varchar(16) references collections (id) not null,
  map_id varchar(16) references maps (id) not null,
  position int not null,
  constraint collection_map_position unique (collection_id, position),
  constraint collection_map_unique unique (collection_id, map_id)
);

CREATE TABLE collection_favorites (
  _id serial,
  collection_id varchar(16) references collections (id) not null,
  user_id varchar(16) references users (id) not null,
  favorited_date timestamp not null,
  constraint collection_favorite unique (collection_id, user_id)
);

CREATE INDEX idx_collections_creator_id ON collections (creator_id);
CREATE INDEX idx_collection_maps_collection_id ON collection_maps (collection_id);
CREATE INDEX idx_collection_maps_map_id ON collection_maps (map_id);
CREATE INDEX idx_collection_favorites_collection_id ON collection_favorites (collection_id);
CREATE INDEX idx_collection_favorites_user_id ON collection_favorites (user_id);

alter table collections enable row level security;
alter table collection_maps enable row level security;
alter table collection_favorites enable row level security;
