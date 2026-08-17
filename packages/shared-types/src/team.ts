export interface TeamSummary {
  id: string;
  organizationId: string;
  departmentId?: string | null;
  name: string;
  description?: string | null;
  memberCount?: number;
}

export interface TeamMemberSummary {
  id: string;
  teamId: string;
  userId: string;
  joinedAt: string;
}
