export interface AnnouncementAuthor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface AnnouncementSummary {
  id: string;
  organizationId: string;
  title: string;
  body: string;
  createdByUser: AnnouncementAuthor;
  createdAt: string;
}
