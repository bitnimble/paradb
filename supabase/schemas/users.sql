CREATE TABLE users (
  _id serial,
  id varchar(16) primary key,
  creation_date timestamp not null,
  account_status char not null,
  username varchar(32) unique not null,
  email varchar(254) unique not null,
  email_status char not null,
  password bytea not null,
  password_updated timestamp not null,
  supabase_id uuid unique
);

CREATE INDEX idx_users_supabase_id ON users (supabase_id);
CREATE INDEX idx_users_username ON users (lower(username));
CREATE INDEX idx_users_email ON users (lower(email));
