CREATE TABLE maps (
  _id serial,
  id varchar(16) primary key,
  submission_date timestamp not null,
  title varchar(256) not null,
  artist varchar(256) not null,
  author varchar(256),
  uploader varchar(256) not null,
  download_count int not null default 0,
  description text,
  tags text,
  complexity int,
  album_art text
);

CREATE TABLE difficulties (
  _id serial,
  map_id varchar(16) references maps (id) not null,
  difficulty int,
  difficulty_name varchar(256)
);

CREATE TABLE users (
  _id serial,
  id varchar(16) primary key,
  creation_date timestamp not null,
  account_status char not null,
  username varchar(32) unique not null,
  email varchar(254) unique not null,
  email_status char not null,
  password bytea not null,
  password_updated timestamp not null
);
CREATE INDEX idx_users_username ON users (lower(username));
CREATE INDEX idx_users_email ON users (lower(email));

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
