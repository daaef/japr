-- Partial index for ping notification cooldown queries.
-- Used by server/api/editor/journals/[uuid]/ping.post.ts to check
-- whether the same template+journal+user combo was sent recently.
CREATE INDEX IF NOT EXISTS notifications_ping_cooldown_idx
ON notifications (user_id, created_at)
WHERE type = 'ping';
