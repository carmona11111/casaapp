CREATE TABLE IF NOT EXISTS profile_avatars (
 person_id TEXT PRIMARY KEY REFERENCES people(id),
 avatar_key TEXT NOT NULL,
 chosen_at TEXT NOT NULL
);
