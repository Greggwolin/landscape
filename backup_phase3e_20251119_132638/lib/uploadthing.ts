/**
 * UploadThing Client Configuration
 */

import { generateReactHelpers } from '@uploadthing/react';
import type { DMSFileRouter } from './dms/uploadthing';

export const { useUploadThing, uploadFiles } = generateReactHelpers<DMSFileRouter>();