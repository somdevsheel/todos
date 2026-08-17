import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { OrgScopeResource } from "../common/decorators/org-scope-resource.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-request";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { ListEventsQueryDto } from "./dto/list-events-query.dto";
import { RsvpEventDto } from "./dto/rsvp-event.dto";
import { AddEventParticipantDto } from "./dto/add-event-participant.dto";

@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.eventsService.create(user, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: ListEventsQueryDto) {
    return this.eventsService.findAll(user.organizationId, user, query);
  }

  @Get(":id")
  @OrgScopeResource({ model: "event" })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.eventsService.findOne(user.organizationId, id);
  }

  @Patch(":id")
  @OrgScopeResource({ model: "event" })
  update(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(user.organizationId, id, user, dto);
  }

  @Delete(":id")
  @OrgScopeResource({ model: "event" })
  remove(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.eventsService.remove(user.organizationId, id, user);
  }

  @Patch(":id/rsvp")
  @OrgScopeResource({ model: "event" })
  rsvp(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: RsvpEventDto) {
    return this.eventsService.rsvp(user.organizationId, id, user, dto.status);
  }

  @Post(":id/participants")
  @OrgScopeResource({ model: "event" })
  addParticipant(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Body() dto: AddEventParticipantDto) {
    return this.eventsService.addParticipant(user.organizationId, id, user, dto.userId);
  }

  @Delete(":id/participants/:userId")
  @OrgScopeResource({ model: "event" })
  removeParticipant(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string, @Param("userId") userId: string) {
    return this.eventsService.removeParticipant(user.organizationId, id, user, userId);
  }
}
