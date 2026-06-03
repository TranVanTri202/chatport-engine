import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

interface SuccessEnvelope<T = unknown> {
  code: number;
  message: string;
  data: T;
  requestId?: string;
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<{ id?: string }>();
    const res = http.getResponse<{ statusCode?: number }>();

    return next.handle().pipe(
      map((data) => {
        const statusCode = res.statusCode ?? 200;
        const message = statusCode < 400 ? 'OK' : 'ERROR';

        const envelope: SuccessEnvelope = {
          code: statusCode,
          message,
          data,
        };

        if (req.id) {
          envelope.requestId = req.id;
        }

        return envelope;
      }),
    );
  }
}
