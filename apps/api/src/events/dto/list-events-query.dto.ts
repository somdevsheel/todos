import { IsDateString, IsOptional, IsUUID } from "class-validator";

/**
 * Not a PaginationQueryDto — a calendar view fetches every event inside a
 * bounded [from, to) date range, not a page of an unbounded list. The web
 * app computes `from`/`to` from the active month/week/day/agenda view (see
 * calendar/page.tsx) so the range is always caller-bounded.
 */
export class ListEventsQueryDto {
  @IsDateString()
  from!: string;

  @IsDateString()
  to!: string;

  /** Team calendar mode — see EventsService.findAll. Omitted = "my calendar" (creator or participant). */
  @IsOptional()
  @IsUUID()
  teamId?: string;
}
