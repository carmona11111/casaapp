CREATE TABLE IF NOT EXISTS coop_profile (
 id INTEGER PRIMARY KEY CHECK(id=1),
 badge_id TEXT,
 changed_by TEXT REFERENCES people(id),
 changed_at TEXT
);
INSERT OR IGNORE INTO coop_profile VALUES (1,NULL,NULL,NULL);
