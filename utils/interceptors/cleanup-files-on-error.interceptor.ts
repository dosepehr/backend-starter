import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import * as fs from 'fs/promises';

@Injectable()
export class CleanupFilesOnErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      catchError(async (error) => {
        const files: Express.Multer.File[] = request.files ?? [];

        await Promise.allSettled(
          files.map((file) => fs.unlink(file.path).catch(() => {})),
        );

        throw error;
      }),
    );
  }
}
