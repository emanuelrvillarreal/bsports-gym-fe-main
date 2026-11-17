import { HttpContext, HttpContextToken } from '@angular/common/http';

export type HttpHeadersExtra = Readonly<Record<string, string>>;

export const HEADER_COMPANY_UUID = new HttpContextToken<string | null>(() => null);
export const HEADERS_EXTRA = new HttpContextToken<HttpHeadersExtra | null>(() => null);
export const OMITIR_COMPANY_UUID = new HttpContextToken<boolean>(() => false);

export function conCompanyUuid(context = new HttpContext(), companyUuid: string): HttpContext {
  return context.set(HEADER_COMPANY_UUID, companyUuid);
}

export function sinCompanyUuid(context = new HttpContext()): HttpContext {
  return context.set(OMITIR_COMPANY_UUID, true);
}

export function conHeadersExtra(
  context = new HttpContext(),
  headers: HttpHeadersExtra,
): HttpContext {
  return context.set(HEADERS_EXTRA, headers);
}
