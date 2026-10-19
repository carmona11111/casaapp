CREATE TABLE IF NOT EXISTS recipe_ratings (
 recipe_id TEXT NOT NULL REFERENCES recipes(id),
 person_id TEXT NOT NULL REFERENCES people(id),
 rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
 rated_at TEXT NOT NULL,
 PRIMARY KEY(recipe_id,person_id)
);
