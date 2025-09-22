-- Make ended_at nullable since exam hasn't ended yet when session starts
ALTER TABLE public.exam_sessions ALTER COLUMN ended_at DROP NOT NULL;