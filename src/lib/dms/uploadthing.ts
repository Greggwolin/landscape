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
      console.log("Document upload complete:", file.name);
      
      try {
        // Generate SHA256 hash (simplified for now)
        const sha256Hash = crypto
          .createHash('sha256')
          .update(file.name + file.size + Date.now())
          .digest('hex');

        // Create document record in database
        const doc = await dmsDb.createDocument({
          project_id: metadata.projectId,
          workspace_id: metadata.workspaceId,
          phase_id: metadata.phaseId,
          parcel_id: metadata.parcelId,
          doc_name: file.name,
          doc_type: metadata.docType,
          discipline: metadata.discipline,
          mime_type: file.type || 'application/octet-stream',
          file_size_bytes: file.size,
          sha256_hash: sha256Hash,
          storage_uri: file.url, // UploadThing URL
          version_no: 1,
          status: 'draft',
          profile_json: {
            // Initialize with basic metadata
            upload_date: new Date().toISOString(),
            original_name: file.name,
            file_url: file.url
          }
        });

        console.log("Created document record:", doc.doc_id);

        // TODO: Enqueue for OCR/extraction
        // await enqueueForExtraction(doc.doc_id);

        return {
          doc_id: doc.doc_id,
          uploaded_by: metadata.projectId, // TODO: get actual user ID
          file_url: file.url
        };

      } catch (error) {
        console.error("Failed to create document record:", error);
        throw new UploadThingError("Failed to process uploaded document");
      }
    }),
} satisfies FileRouter;

export type DMSFileRouter = typeof dmsUploader;