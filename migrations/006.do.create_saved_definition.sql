CREATE TABLE saved_definition (
  user_id INTEGER REFERENCES we_user(id) ON DELETE CASCADE NOT NULL,
  definition_id INTEGER REFERENCES definition(id) ON DELETE CASCADE NOT NULL,
  PRIMARY KEY (user_id, definition_id)
);