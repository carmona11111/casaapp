CREATE TABLE IF NOT EXISTS coop_transfers (
 savings_entry_id TEXT PRIMARY KEY REFERENCES savings_entries(id),
 fund_entry_id TEXT NOT NULL UNIQUE REFERENCES coop_fund(id),
 person_id TEXT NOT NULL REFERENCES people(id),
 amount_cents INTEGER NOT NULL CHECK(amount_cents>0)
);
