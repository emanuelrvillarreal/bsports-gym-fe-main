import { HttpContextToken } from '@angular/common/http';

export const OMITIR_AUTH = new HttpContextToken<boolean>(() => false);
