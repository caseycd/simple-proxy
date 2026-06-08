-- Run against your D1 database:
-- npx wrangler d1 execute beer-die --file=schema.sql

CREATE TABLE IF NOT EXISTS players (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  nickname TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team1_p1 INTEGER NOT NULL REFERENCES players(id),
  team1_p2 INTEGER NOT NULL REFERENCES players(id),
  team2_p1 INTEGER NOT NULL REFERENCES players(id),
  team2_p2 INTEGER NOT NULL REFERENCES players(id),
  team1_name TEXT NOT NULL DEFAULT 'Team 1',
  team2_name TEXT NOT NULL DEFAULT 'Team 2',
  score_to_win INTEGER NOT NULL DEFAULT 11,
  team1_score INTEGER NOT NULL DEFAULT 0,
  team2_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','finished')),
  winner INTEGER CHECK(winner IN (1,2)),
  started_at INTEGER NOT NULL DEFAULT (unixepoch()),
  ended_at INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  game_id INTEGER NOT NULL REFERENCES games(id),
  thrower_id INTEGER NOT NULL REFERENCES players(id),
  defender_id INTEGER,
  team INTEGER NOT NULL CHECK(team IN (1,2)),
  throw_result TEXT NOT NULL CHECK(throw_result IN ('sink','table','off_table','island')),
  catch_result TEXT CHECK(catch_result IN ('caught','dropped')),
  points_scored INTEGER NOT NULL DEFAULT 0,
  ts INTEGER NOT NULL DEFAULT (unixepoch()),
  note TEXT
);
