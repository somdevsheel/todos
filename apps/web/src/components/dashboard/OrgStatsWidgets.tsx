import { Building2, Users, UsersRound } from "lucide-react";
import type { DepartmentSummary, PaginatedResult, TeamSummary } from "@arutech/shared-types";
import { apiFetch, getAccessTokenFromCookies } from "@/lib/api-client";
import { StatCard } from "./StatCard";

/** Org-wide stats shown to SUPER_ADMIN/ADMIN/MANAGER — real counts from real endpoints. */
export async function EmployeeCountWidget() {
  const accessToken = await getAccessTokenFromCookies();
  const { meta } = await apiFetch<PaginatedResult<unknown>>("/users?page=1&pageSize=1", { accessToken });
  return <StatCard icon={Users} label="Employees" value={meta.totalItems} />;
}

export async function DepartmentCountWidget() {
  const accessToken = await getAccessTokenFromCookies();
  const departments = await apiFetch<DepartmentSummary[]>("/departments", { accessToken });
  return <StatCard icon={Building2} label="Departments" value={departments.length} />;
}

export async function TeamCountWidget() {
  const accessToken = await getAccessTokenFromCookies();
  const teams = await apiFetch<TeamSummary[]>("/teams", { accessToken });
  return <StatCard icon={UsersRound} label="Teams" value={teams.length} />;
}
