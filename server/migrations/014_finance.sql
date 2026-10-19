CREATE TABLE IF NOT EXISTS finance_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('income','expense','settlement')),
  amount_cents INTEGER NOT NULL CHECK(amount_cents > 0),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  occurred_on TEXT NOT NULL,
  paid_by TEXT NOT NULL REFERENCES people(id),
  other_person_id TEXT REFERENCES people(id),
  shares_json TEXT NOT NULL DEFAULT '[]',
  recorded_by TEXT NOT NULL REFERENCES people(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS finance_entries_date ON finance_entries(occurred_on DESC, created_at DESC);
