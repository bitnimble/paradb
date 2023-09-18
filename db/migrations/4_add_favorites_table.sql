/* To be run at any time. This script simply adds the new favorites table + indexes and is dependency free. */

CREATE TABLE favorites (
  map_id varchar(16) references maps (id) not null,
  user_id varchar(16) references users (id) not null,
  favorited_date timestamp not null,
  constraint user_favorite unique (map_id, user_id)
);
CREATE INDEX idx_favorites_map_id ON favorites (map_id);
CREATE INDEX idx_favorites_user_id ON favorites (user_id);
