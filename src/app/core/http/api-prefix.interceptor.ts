import { HttpInterceptorFn } from '@angular/common/http';

import { environment } from '@/environments/environment';

export const apiPrefixInterceptor: HttpInterceptorFn = (request, next) => {
  if (!/^(http|https):/i.test(request.url)) {
    request = request.clone({
      url: environment.serverUrl + request.url,
    });
  }
  return next(request);
};
