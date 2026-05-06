/**
 * Regenerate after linking Supabase:
 * `npx supabase gen types typescript --project-id <id> > lib/types/db.ts`
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
