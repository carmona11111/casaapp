CREATE TABLE IF NOT EXISTS task_pools (template_id TEXT PRIMARY KEY REFERENCES templates(id), pool TEXT NOT NULL CHECK(pool IN ('daily','every3','weekly','occasional')));
CREATE TABLE IF NOT EXISTS task_claims (template_id TEXT PRIMARY KEY REFERENCES templates(id), person_id TEXT NOT NULL REFERENCES people(id), claimed_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS task_completions (id TEXT PRIMARY KEY, template_id TEXT NOT NULL REFERENCES templates(id), person_id TEXT NOT NULL REFERENCES people(id), completed_at TEXT NOT NULL, local_date TEXT NOT NULL, period_key TEXT NOT NULL, points INTEGER NOT NULL, title TEXT NOT NULL, zone TEXT NOT NULL, UNIQUE(template_id,period_key));
CREATE INDEX IF NOT EXISTS task_completions_person_date ON task_completions(person_id,local_date);
