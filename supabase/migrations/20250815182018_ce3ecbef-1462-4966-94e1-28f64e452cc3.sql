-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('team_leader', 'user');

-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create organizations table  
CREATE TABLE public.organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create persons table (base table for team_leaders and users)
CREATE TABLE public.persons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role user_role NOT NULL,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  team_leader_id UUID REFERENCES public.persons(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(auth_user_id)
);

-- Create pitches table
CREATE TABLE public.pitches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.persons(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  value DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Create function to get user's organization
CREATE OR REPLACE FUNCTION public.get_user_organization_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT organization_id 
  FROM public.persons 
  WHERE auth_user_id = auth.uid()
$$;

-- Create function to check if user is team leader
CREATE OR REPLACE FUNCTION public.is_team_leader()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role = 'team_leader'
  FROM public.persons 
  WHERE auth_user_id = auth.uid()
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their company"
ON public.companies
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT o.company_id 
    FROM public.organizations o
    JOIN public.persons p ON p.organization_id = o.id
    WHERE p.auth_user_id = auth.uid()
  )
);

-- RLS Policies for organizations
CREATE POLICY "Users can view their organization"
ON public.organizations
FOR SELECT
TO authenticated
USING (id = public.get_user_organization_id());

-- RLS Policies for persons
CREATE POLICY "Users can view persons in their organization"
ON public.persons
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_organization_id());

CREATE POLICY "Team leaders can insert users in their organization"
ON public.persons
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_team_leader() 
  AND organization_id = public.get_user_organization_id()
  AND role = 'user'
);

CREATE POLICY "Users can update their own profile"
ON public.persons
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid());

-- RLS Policies for pitches
CREATE POLICY "Users can view pitches in their organization"
ON public.pitches
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.persons 
    WHERE organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can insert their own pitches"
ON public.pitches
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM public.persons 
    WHERE auth_user_id = auth.uid()
  )
);

-- RLS Policies for sales
CREATE POLICY "Users can view sales in their organization"
ON public.sales
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.persons 
    WHERE organization_id = public.get_user_organization_id()
  )
);

CREATE POLICY "Users can insert their own sales"
ON public.sales
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT id FROM public.persons 
    WHERE auth_user_id = auth.uid()
  )
);

-- Create function to automatically create person profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.persons (auth_user_id, name, email, role, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'user'),
    (NEW.raw_user_meta_data ->> 'organization_id')::UUID
  );
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_persons_updated_at
  BEFORE UPDATE ON public.persons
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for all tables
ALTER TABLE public.persons REPLICA IDENTITY FULL;
ALTER TABLE public.pitches REPLICA IDENTITY FULL;
ALTER TABLE public.sales REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.persons;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pitches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;