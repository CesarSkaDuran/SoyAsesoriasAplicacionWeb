import { HttpInterceptorFn } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Logger } from '@/app/core/logger.service';
import { environment } from '@/environments/environment';

const log = new Logger('ErrorHandlerInterceptor');

export const errorHandlerInterceptor: HttpInterceptorFn = (request, next) => {
  return next(request).pipe(
    catchError((error) => {
      if (!environment.production) {
        log.error('Request error', error);
      }
      throw error;
    })
  );
};
