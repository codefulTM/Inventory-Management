import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, route } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(
        () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          const durationMs = Date.now() - startTime;

          // Extract route path (remove query parameters)
          const routePath = url.split('?')[0];

          this.metricsService.recordHttpRequest(method, routePath, statusCode, durationMs);
        },
        (error) => {
          const durationMs = Date.now() - startTime;
          const routePath = url.split('?')[0];

          // Record error metrics
          this.metricsService.recordHttpRequest(method, routePath, error.status || 500, durationMs);
          this.metricsService.recordApiError(error.name || 'UnknownError', routePath);
        },
      ),
    );
  }
}
