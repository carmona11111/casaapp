CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  photo TEXT,
  ingredients TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS meal_plan (
  date TEXT NOT NULL,
  slot TEXT NOT NULL CHECK(slot IN ('lunch','dinner')),
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  PRIMARY KEY(date,slot)
);
CREATE INDEX IF NOT EXISTS meal_plan_recipe ON meal_plan(recipe_id);
CREATE TABLE IF NOT EXISTS shopping_checks (
  week_start TEXT NOT NULL,
  item_key TEXT NOT NULL,
  quantity REAL NOT NULL,
  PRIMARY KEY(week_start,item_key)
);
