import { createRouteHandler } from "uploadthing/next";
import { dmsUploader } from "@/lib/dms/uploadthing";

// Export routes for Next App Router
export const { GET, POST } = createRouteHandler({
  router: dmsUploader,
});