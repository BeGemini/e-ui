-- Rename "KnowledgePoint" feature to "Note"
-- Table KnowledgePoint -> Note, primary key knowledgePointId -> noteId.
-- The migration script connects to the database named in DATABASE_URL.

ALTER TABLE KnowledgePoint RENAME TO Note;
ALTER TABLE Note RENAME COLUMN knowledgePointId TO noteId;
