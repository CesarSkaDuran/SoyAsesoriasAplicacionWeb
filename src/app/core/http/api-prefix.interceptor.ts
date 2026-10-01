import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { AppConfigService } from '@/app/core/config/app-config.service';

export const apiPrefixInterceptor: HttpInterceptorFn = (request, next) => {
  if (!/^(http|https):/i.test(request.url)) {
    request = request.clone({
      url: inject(AppConfigService).serverUrl() + request.url,
    });
  }
  return next(request);
};
