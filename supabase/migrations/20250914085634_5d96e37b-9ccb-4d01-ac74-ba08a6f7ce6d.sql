-- Create teachers table for WhatsApp alerts
CREATE TABLE public.teachers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view teachers
CREATE POLICY "Authenticated users can view teachers" 
ON public.teachers 
FOR SELECT 
TO authenticated
USING (true);

-- Create policy for authenticated users to insert teachers (for admin functionality later)
CREATE POLICY "Authenticated users can insert teachers" 
ON public.teachers 
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Insert sample teacher data
INSERT INTO public.teachers (name, whatsapp_number) VALUES 
('Dr. Sarah Johnson', '+1234567890'),
('Prof. Michael Smith', '+1234567891'),
('Dr. Emily Davis', '+1234567892');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_teachers_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_teachers_updated_at
BEFORE UPDATE ON public.teachers
FOR EACH ROW
EXECUTE FUNCTION public.update_teachers_updated_at_column();