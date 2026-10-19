-- Order edits get their own event type in the status history (PRD §6.4).
ALTER TYPE "OrderEventType" ADD VALUE IF NOT EXISTS 'EDIT';
