-- Drop all existing policies on the tables
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.companies;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.companies;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.organizations;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.organizations;

DROP POLICY IF EXISTS "Allow all authenticated users to select their own person row" ON public.persons;
DROP POLICY IF EXISTS "Teamleads can insert users in their organization" ON public.persons;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.persons;
DROP POLICY IF EXISTS "Users can view persons in their organization" ON public.persons;

DROP POLICY IF EXISTS "Allow insert for authenticated users" ON public.person_roles;
DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.person_roles;

DROP POLICY IF EXISTS "Allow select for authenticated users" ON public.roles;

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.person_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Create new simplified policies for companies
CREATE POLICY "Authenticated users can insert companies" 
ON public.companies 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select companies" 
ON public.companies 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Create new simplified policies for organizations
CREATE POLICY "Authenticated users can insert organizations" 
ON public.organizations 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select organizations" 
ON public.organizations 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Create new simplified policies for persons
CREATE POLICY "Authenticated users can insert persons" 
ON public.persons 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select persons" 
ON public.persons 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Create new simplified policies for person_roles
CREATE POLICY "Authenticated users can insert person_roles" 
ON public.person_roles 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can select person_roles" 
ON public.person_roles 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');

-- Create new simplified policy for roles
CREATE POLICY "Authenticated users can select roles" 
ON public.roles 
FOR SELECT 
TO authenticated 
USING (auth.role() = 'authenticated');