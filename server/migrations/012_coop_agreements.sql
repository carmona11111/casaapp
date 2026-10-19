CREATE TABLE IF NOT EXISTS coop_fair_votes (
 week_start TEXT NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 confirmed_at TEXT NOT NULL,
 PRIMARY KEY(week_start,person_id)
);
CREATE TABLE IF NOT EXISTS coop_monthly_goals (
 month TEXT PRIMARY KEY,
 target_cents INTEGER NOT NULL CHECK(target_cents>0),
 set_by TEXT NOT NULL REFERENCES people(id),
 set_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coop_monthly_awards (
 month TEXT PRIMARY KEY REFERENCES coop_monthly_goals(month),
 keys INTEGER NOT NULL CHECK(keys=2),
 earned_at TEXT NOT NULL
);
