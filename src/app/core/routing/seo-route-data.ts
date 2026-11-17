import { AppRole } from '../auth/auth-role';

export interface SeoRouteData {
  readonly title: string;
  readonly description: string;
  readonly roles?: readonly AppRole[];
}
