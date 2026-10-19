CREATE TABLE IF NOT EXISTS coop_task_shares (
 completion_id TEXT PRIMARY KEY REFERENCES task_completions(id),
 person_id TEXT NOT NULL REFERENCES people(id),
 points INTEGER NOT NULL CHECK(points>0)
);
