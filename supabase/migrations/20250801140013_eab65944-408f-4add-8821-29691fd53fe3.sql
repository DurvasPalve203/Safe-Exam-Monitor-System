-- Create exam sessions table for tracking
CREATE TABLE public.exam_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  tab_switches INTEGER NOT NULL DEFAULT 0,
  max_tab_switches INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  violation_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.exam_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for exam sessions
CREATE POLICY "Users can view their own exam sessions" 
ON public.exam_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own exam sessions" 
ON public.exam_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own exam sessions" 
ON public.exam_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to update timestamps (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_exam_sessions_updated_at
  BEFORE UPDATE ON public.exam_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();