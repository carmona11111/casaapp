CREATE TABLE IF NOT EXISTS delivery_orders (
  date TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL
);
