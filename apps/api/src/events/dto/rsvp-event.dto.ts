import { IsIn } from "class-validator";
import { EVENT_RSVP_STATUSES, type EventRsvpStatus } from "@arutech/shared-types";

export class RsvpEventDto {
  @IsIn(EVENT_RSVP_STATUSES)
  status!: EventRsvpStatus;
}
