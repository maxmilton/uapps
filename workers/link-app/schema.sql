-- SQLite >= 3.50.4

-- To manually create the database, for local development run:
-- bunx wrangler d1 execute prod-link-app --local --file=./schema.sql
-- or for production:
-- bunx wrangler d1 execute prod-link-app --remote --file=./schema.sql

-- PRAGMA journal_mode = WAL;
-- PRAGMA synchronous = NORMAL;
-- PRAGMA trusted_schema = OFF;
-- PRAGMA recursive_triggers = OFF;
-- PRAGMA foreign_keys = ON;
-- PRAGMA wal_autocheckpoint = 1000;
-- PRAGMA auto_vacuum = NONE;

-- BEGIN EXCLUSIVE TRANSACTION;

-- CREATE TABLE IF NOT EXISTS link (
--     id TEXT PRIMARY KEY,
--     short TEXT UNIQUE NOT NULL CHECK(LENGTH(short)=6),
--     url TEXT NOT NULL,
--     created_at INTEGER NOT NULL, -- Unix timestamp (seconds)
--     expires_at INTEGER NOT NULL -- Unix timestamp (seconds)
-- ) STRICT;

-- COMMIT;

CREATE TABLE IF NOT EXISTS link (
    id TEXT PRIMARY KEY NOT NULL CHECK(LENGTH(id)=6), -- short URL slug token
    url TEXT NOT NULL,
    created_at INTEGER NOT NULL, -- Unix timestamp (seconds)
    expires_at INTEGER NOT NULL -- Unix timestamp (seconds)
) STRICT, WITHOUT ROWID;
