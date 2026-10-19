CREATE TABLE IF NOT EXISTS meal_completions (
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('lunch','dinner')),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  person_id TEXT NOT NULL REFERENCES people(id),
  completed_at TEXT NOT NULL,
  points INTEGER NOT NULL,
  PRIMARY KEY(date,slot)
);
CREATE TABLE IF NOT EXISTS no_delivery_days (
  date TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  saved_cents INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL,
  points INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS savings_entries (
  id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  amount_cents INTEGER NOT NULL,
  note TEXT NOT NULL,
  created_at TEXT NOT NULL
);
