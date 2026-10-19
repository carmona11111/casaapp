CREATE TABLE IF NOT EXISTS goal_preparation (
  goal_cents INTEGER NOT NULL,
  item_key TEXT NOT NULL,
  checked_by TEXT NOT NULL REFERENCES people(id),
  checked_at TEXT NOT NULL,
  PRIMARY KEY(goal_cents,item_key)
);
