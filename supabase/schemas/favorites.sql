CREATE TABLE favorites (
  _id serial,
  map_id varchar(16) references maps (id) not null,
  user_id varchar(16) references users (id) not null,
  favorited_date timestamp not null,
  constraint user_favorite unique (map_id, user_id)
);
CREATE INDEX idx_favorites_map_id ON favorites (map_id);
CREATE INDEX idx_favorites_user_id ON favorites (user_id);

/* It may be good to add a trigger-based cache for the favorite counts in the future, but for now we can accept just counting manually each time. */
