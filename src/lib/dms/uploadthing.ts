/**
 * UploadThing Configuration for DMS
 */

import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { dmsDb } from "./db";
import crypto from "crypto";

const f = createUploadthing();

// DMS file upload router
export const dmsUploader = {
  // Document uploader - handles PDFs, Office docs, images
  documentUploader: f({
    "application/pdf": { maxFileSize: "32MB" },
    "application/msword": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "16MB" },
    "application/vnd.ms-excel": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { maxFileSize: "16MB" },
    "application/vnd.ms-excel.sheet.macroEnabled.12": { maxFileSize: "16MB" },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": { maxFileSize: "32MB" },
    "application/vnd.ms-powerpoint": { maxFileSize: "32MB" },
    "image/jpeg": { maxFileSize: "8MB" },
    "image/png": { maxFileSize: "8MB" },
    "image/gif": { maxFileSize: "8MB" },
    "image/webp": { maxFileSize: "8MB" },
    "image/tiff": { maxFileSize: "16MB" },
    "text/plain": { maxFileSize: "4MB" },
    "text/csv": { maxFileSize: "8MB" },
    "application/zip": { maxFileSize: "64MB" },
    "application/octet-stream": { maxFileSize: "32MB" },
  })
    .middleware(async ({ req }) => {
      // Extract metadata from request headers or query params
      const projectId = req.headers.get("x-project-id");
      const workspaceId = req.headers.get("x-workspace-id");
      const docType = req.headers.get("x-doc-type") || "general";
      const discipline = req.headers.get("x-discipline");
      const phaseId = req.headers.get("x-phase-id");
      const parcelId = req.headers.get("x-parcel-id");

      console.log("📤 UploadThing middleware - headers:", {
        projectId,
        workspaceId,
        docType,
        discipline,
        phaseId,
        parcelId
      });

      if (!projectId || !workspaceId) {
        console.error("❌ Missing project or workspace ID");
        throw new UploadThingError("Project ID and Workspace ID are required");
      }

      // Validate workspace exists (but don't block upload if not found)
      let workspace = null;
      let template = null;

      try {
        workspace = await dmsDb.getDefaultWorkspace();
        if (!workspace) {
          console.warn("⚠️ Default workspace not found, continuing without validation");
        }

        // Get default template for validation (optional)
        template = await dmsDb.getDefaultTemplate(
          parseInt(workspaceId),
          parseInt(projectId),
          docType
        );

        if (!template) {
          console.warn("⚠️ No matching template found, continuing with upload");
        }
      } catch (dbError) {
        console.error("⚠️ Database validation error (continuing):", dbError);
      }

      return {
        projectId: parseInt(projectId),
        workspaceId: parseInt(workspaceId),
        docType,
        discipline,
        phaseId: phaseId ? parseInt(phaseId) : undefined,
        parcelId: parcelId ? parseInt(parcelId) : undefined,
        template
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("✅ UploadThing upload complete:", file.name);

      try {
        // Generate SHA256 hash from file content signature
        const sha256Hash = crypto
          .createHash('sha256')
          .update(file.url + file.name + file.size)
          .digest('hex');

        console.log(`📝 Computed SHA256: ${sha256Hash.substring(0, 16)}...`);

        // Return file metadata to client (client will call POST /api/dms/docs)
        return {
          storage_uri: file.url,
          sha256: sha256Hash,
          doc_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size_bytes: file.size,
          // Include metadata for client to use
          project_id: metadata.projectId,
          workspace_id: metadata.workspaceId,
          doc_type: metadata.docType,
          discipline: metadata.discipline,
          phase_id: metadata.phaseId,
          parcel_id: metadata.parcelId,
        };

      } catch (error) {
        console.error("❌ UploadThing processing error:", error);
        throw new UploadThingError("Failed to process uploaded file");
      }
    }),
} satisfies FileRouter;

export type DMSFileRouter = typeof dmsUploader;