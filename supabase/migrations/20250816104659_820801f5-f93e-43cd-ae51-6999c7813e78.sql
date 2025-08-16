-- Fix the handle_new_user function to work with the correct schema
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into persons table (without role column)
  INSERT INTO public.persons (auth_user_id, name, email, organization_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', NEW.email),
    NEW.email,
    (NEW.raw_user_meta_data ->> 'organization_id')::UUID
  );
  
  -- Insert into person_roles table
  IF NEW.raw_user_meta_data ->> 'role' IS NOT NULL THEN
    INSERT INTO public.person_roles (person_id, role_id, org_id)
    SELECT 
      NEW.id,
      r.role_id,
      (NEW.raw_user_meta_data ->> 'organization_id')::UUID
    FROM public.roles r 
    WHERE r.role = (NEW.raw_user_meta_data ->> 'role');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();