-- If an older migration created public.sites, rename it to public.sites_ops
-- (safe no-op when public.sites does not exist or public.sites_ops already exists).

DO $$
BEGIN
  IF to_regclass('public.sites') IS NOT NULL AND to_regclass('public.sites_ops') IS NULL THEN
    IF to_regclass('public.sites_org_id_idx') IS NOT NULL THEN
      ALTER INDEX public.sites_org_id_idx RENAME TO sites_ops_org_id_idx;
    END IF;
    ALTER TABLE public.sites RENAME TO sites_ops;
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sites_touch') THEN
      EXECUTE 'ALTER TRIGGER sites_touch ON public.sites_ops RENAME TO sites_ops_touch';
    END IF;
  END IF;
END $$;
