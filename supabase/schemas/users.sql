CREATE TABLE users (
  _id serial,
  id varchar(16) primary key,
  username varchar(32) unique not null,
  -- Keep email_status around for the pre-Supabase users - we need to confirm their emails still
  email_status char not null,
  supabase_id uuid unique not null
);

CREATE INDEX idx_users_supabase_id ON users (supabase_id);
CREATE INDEX idx_users_username ON users (lower(username));
