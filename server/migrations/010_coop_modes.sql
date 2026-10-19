CREATE TABLE IF NOT EXISTS coop_week_modes (
 week_start TEXT PRIMARY KEY REFERENCES coop_weeks(week_start),
 kitchen_mode TEXT NOT NULL CHECK(kitchen_mode IN ('plan','delivery')),
 team_mode TEXT NOT NULL CHECK(team_mode IN ('saving','joint'))
);
