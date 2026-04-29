import { SetMetadata } from '@nestjs/common';

export const INCLUDE_TOKEN_KEY = 'includeToken';
export const IncludeToken = () => SetMetadata(INCLUDE_TOKEN_KEY, true);
