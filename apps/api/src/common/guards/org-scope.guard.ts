import { CanActivate, ExecutionContext, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaService } from "../../prisma/prisma.service";
import { ORG_SCOPE_RESOURCE_KEY, type OrgScopeResourceMetadata } from "../decorators/org-scope-resource.decorator";
import type { AuthenticatedRequest } from "../types/authenticated-request";

type ScopedDelegate = {
  findUnique: (args: { where: { id: string }; select: { organizationId: true } }) => Promise<{ organizationId: string } | null>;
};

/**
 * Third guard in the global chain. Only acts on routes annotated with
 * @OrgScopeResource() — loads the minimal {organizationId} projection for
 * the resource named by the route's :id param and denies (403) if it
 * belongs to a different organization than the caller. This is the
 * "never trust a frontend-supplied id" checkpoint: every :id route that
 * resolves to a single record must carry this decorator.
 */
@Injectable()
export class OrgScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OrgScopeResourceMetadata | undefined>(ORG_SCOPE_RESOURCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!metadata) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const paramName = metadata.paramName ?? "id";
    const rawResourceId = request.params?.[paramName];
    const resourceId = Array.isArray(rawResourceId) ? rawResourceId[0] : rawResourceId;
    if (!resourceId) return true;

    const delegate = this.prisma[metadata.model] as unknown as ScopedDelegate;
    const resource = await delegate.findUnique({ where: { id: resourceId }, select: { organizationId: true } });

    if (!resource) throw new NotFoundException("Resource not found");
    if (resource.organizationId !== request.user.organizationId) {
      throw new ForbiddenException("You do not have access to this resource");
    }
    return true;
  }
}
