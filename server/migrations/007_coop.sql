CREATE TABLE IF NOT EXISTS coop_weeks (
 week_start TEXT PRIMARY KEY,
 target_xp INTEGER NOT NULL DEFAULT 150,
 essentials TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS coop_events (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 amount INTEGER NOT NULL,
 local_date TEXT NOT NULL,
 created_at TEXT NOT NULL,
 points_actor INTEGER NOT NULL,
 points_partner INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS coop_awards (
 week_start TEXT NOT NULL,
 mission TEXT NOT NULL,
 earned_at TEXT NOT NULL,
 PRIMARY KEY(week_start,mission)
);
CREATE TABLE IF NOT EXISTS coop_unlocks (
 badge_id TEXT PRIMARY KEY,
 earned_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coop_fund (
 id TEXT PRIMARY KEY,
 person_id TEXT NOT NULL REFERENCES people(id),
 amount_cents INTEGER NOT NULL,
 note TEXT NOT NULL,
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS coop_redemptions (
 id TEXT PRIMARY KEY,
 reward_key TEXT NOT NULL,
 person_id TEXT NOT NULL REFERENCES people(id),
 keys_cost INTEGER NOT NULL,
 amount_cents INTEGER NOT NULL,
 created_at TEXT NOT NULL
);
