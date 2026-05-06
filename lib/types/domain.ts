export type UserRole = "owner" | "admin" | "viewer";

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  replacement_cost_cents: number;
  created_at: string;
};

export type ProfileRow = {
  id: string;
  org_id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
  created_at: string;
};

export type SiteRow = {
  id: string;
  org_id: string;
  name: string;
  starting_hc: number;
  departures: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MonthlyRecordRow = {
  id: string;
  org_id: string;
  year: number;
  month: number;
  starting_hc: number | null;
  new_hires: number;
  departures: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};
