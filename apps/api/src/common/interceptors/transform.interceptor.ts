import { CallHandler, ExecutionContext, Injectable, NestInterceptor, StreamableFile } from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { ApiSuccess } from "@arutech/shared-types";

/**
 * Wraps every successful controller response in the standard
 * `{success:true,data}` envelope — except a `StreamableFile` (see
 * files/files.controller.ts's download endpoint), which Nest's HTTP
 * adapter only recognizes and pipes as raw bytes when it receives the
 * `StreamableFile` instance itself, not an object wrapping one.
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccess<T> | StreamableFile> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T> | StreamableFile> {
    return next.handle().pipe(
      map((data) => (data instanceof StreamableFile ? data : { success: true as const, data })),
    );
  }
}
