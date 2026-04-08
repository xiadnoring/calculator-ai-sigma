-- Initialize calculator database

CREATE TABLE IF NOT EXISTS chats (
    id VARCHAR(78) NOT NULL,
    chat TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    removed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE chats ADD CONSTRAINT chats_id UNIQUE (id);
CREATE INDEX IF NOT EXISTS chats_removed ON chats (removed_at);
