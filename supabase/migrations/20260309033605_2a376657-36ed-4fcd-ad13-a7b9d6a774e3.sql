-- Break RLS recursion between circles and circle_members via SECURITY DEFINER helpers

CREATE OR REPLACE FUNCTION public.is_circle_owner(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circles c
    WHERE c.id = _circle_id
      AND c.owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_circle_member(_circle_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.circle_members cm
    WHERE cm.circle_id = _circle_id
      AND cm.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_circle_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_circle_owner(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_circle_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_circle_member(uuid, uuid) TO authenticated;

-- Recreate policies without cross-table recursive subqueries
DROP POLICY IF EXISTS "View circles owned or member of" ON public.circles;
CREATE POLICY "View circles owned or member of"
ON public.circles
FOR SELECT
TO authenticated
USING (
  owner_id = auth.uid()
  OR public.is_circle_member(id, auth.uid())
);

DROP POLICY IF EXISTS "Members view own memberships" ON public.circle_members;
CREATE POLICY "Members view own memberships"
ON public.circle_members
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_circle_owner(circle_id, auth.uid())
);

DROP POLICY IF EXISTS "Owner manages members" ON public.circle_members;
CREATE POLICY "Owner manages members"
ON public.circle_members
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_circle_owner(circle_id, auth.uid())
);

DROP POLICY IF EXISTS "Owner deletes members" ON public.circle_members;
CREATE POLICY "Owner deletes members"
ON public.circle_members
FOR DELETE
TO authenticated
USING (
  public.is_circle_owner(circle_id, auth.uid())
);