-- create table licenses
CREATE TABLE IF NOT EXISTS licenses (
    id SERIAL PRIMARY KEY,
    "type" text,
    code text,
    data bytea,
    created_at timestamptz NOT NULL DEFAULT NOW()
);
