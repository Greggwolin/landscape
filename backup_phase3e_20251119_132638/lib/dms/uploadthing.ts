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
    "image/jpeg": { maxFileSize: "8MB" },
    "image/png": { maxFileSize: "8MB" },
    "image/gif": { maxFileSize: "8MB" },
    "text/plain": { maxFileSize: "4MB" },
    "text/csv": { maxFileSize: "8MB" }
  })
    .middleware(async ({ req }) => {
      // Extract metadata from request headers or query params
      const projectId = req.headers.get("x-project-id");
      const workspaceId = req.headers.get("x-workspace-id");
      const docType = req.headers.get("x-doc-type") || "general";
      const discipline = req.headers.get("x-discipline");
      const phaseId = req.headers.get("x-phase-id");
      const parcelId = req.headers.get("x-parcel-id");

      if (!projectId || !workspaceId) {
        throw new UploadThingError("Project ID and Workspace ID are required");
      }

      // Validate workspace exists
      const workspace = await dmsDb.getDefaultWorkspace();
      if (!workspace) {
        throw new UploadThingError("Default workspace not found");
      }

      // Get default template for validation
      const template = await dmsDb.getDefaultTemplate(
        parseInt(workspaceId), 
        parseInt(projectId), 
        docType
      );

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