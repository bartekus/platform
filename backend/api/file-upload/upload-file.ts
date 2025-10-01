import { api, APIError } from 'encore.dev/api';
import log from 'encore.dev/log';
import busboy from 'busboy';
import { SQLDatabase } from 'encore.dev/storage/sqldb';
import { APICallMeta, appMeta, currentRequest } from 'encore.dev'; // Define a bucket named 'profile-files' for storing files.
import { Bucket } from 'encore.dev/storage/objects';
import { getAuthData, AuthData } from '~encore/auth';

import { Readable } from 'stream';

// Define a bucket named 'profile-files' for storing files.
// Making it possible to get public URLs to files in the bucket
// by setting 'public' to true
export const filesBucket = new Bucket('files', {
  versioned: false,
  public: true,
});

// Define a database named 'files', using the database migrations
// in the "./migrations" folder. Encore automatically provisions,
// migrates, and connects to the database.
export const DB = new SQLDatabase('files', {
  migrations: './migrations',
});

type FileEntry = { data: any[]; filename: string; mimeType: string };

interface FileMetadata {
  id: number;
  name: string;
  url: string;
  mimeType?: string;
  uploadedBy: string;
  organizationId: string;
  createdAt: Date;
}

/**
 * Raw endpoint for storing a single file to the database.
 * Setting bodyLimit to null allows for unlimited file size.
 */
export const uploadOneFile = api.raw(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'POST',
    path: '/api/files/upload/:workspaceId',
  },
  async (req, resp) => {
    console.log(' ');
    console.log(' ');
    console.log('req', req);
    console.log(' ');
    console.log(' ');
    console.log(' ');
    const auth = getAuthData() as AuthData;
    const { workspaceId } = (currentRequest() as APICallMeta).pathParams;
    let uploadedFileName: string | null = null;

    try {
      if (!req.headers['content-type']?.includes('multipart/form-data')) {
        throw APIError.invalidArgument('Invalid content type. Expected multipart/form-data');
      }

      const bb = busboy({ headers: req.headers });
      let fileData: Buffer | null = null;
      let fileName = '';
      let mimeType = '';

      // Handle file data
      bb.on('file', (name, file, info) => {
        fileName = info.filename;
        mimeType = info.mimeType;
        const chunks: Buffer[] = [];

        file.on('data', (data) => {
          chunks.push(data);
        });

        file.on('end', () => {
          fileData = Buffer.concat(chunks);
        });
      });

      // Wait for busboy to finish
      await new Promise((resolve, reject) => {
        bb.on('finish', resolve);
        bb.on('error', reject);
        req.pipe(bb);
      });

      if (!fileData || !fileName) {
        throw APIError.invalidArgument('No file provided');
      }

      // Upload to bucket
      await filesBucket.upload(fileName, fileData, {
        contentType: mimeType,
      });
      uploadedFileName = fileName;

      try {
        // Store metadata in database with correct column names
        await DB.exec`
          INSERT INTO files (
            name,
            mime_type,
            uploaded_by,
            organization_id,
            workspace_id
          ) VALUES (
            ${fileName},
            ${mimeType},
            ${auth.userID},
            ${auth.organizationID},
            ${workspaceId}
          )
        `;
      } catch (dbError) {
        console.error('Database error:', dbError);
        // Clean up the uploaded file if database insert fails
        if (uploadedFileName) {
          try {
            await filesBucket.remove(uploadedFileName);
          } catch (cleanupError) {
            console.error('Failed to clean up file after DB error:', cleanupError);
          }
        }
        throw APIError.internal('Failed to store file metadata');
      }

      // Return metadata
      const metadata: FileMetadata = {
        name: fileName,
        url: filesBucket.publicUrl(fileName),
        uploadedBy: auth.userID,
        organizationId: auth.organizationID,
      };

      resp.setHeader('Content-Type', 'application/json');
      resp.end(JSON.stringify(metadata));
    } catch (err) {
      if (uploadedFileName) {
        try {
          await filesBucket.remove(uploadedFileName);
        } catch (cleanupError) {
          console.error('Failed to clean up file after error:', cleanupError);
        }
      }

      if (err instanceof APIError) {
        throw err;
      }
      console.error('Upload failed:', err);
      throw APIError.internal('Upload failed');
    }
  },
);

/**
 * Raw endpoint for storing a multiple files to the database.
 * Setting bodyLimit to null allows for unlimited file size.
 */
export const uploadManyFiles = api.raw(
  { auth: true, expose: true, method: 'POST', path: '/api/files/upload-multiple/:workspaceId', bodyLimit: null },
  async (req, res) => {
    const bb = busboy({ headers: req.headers });
    const entries: FileEntry[] = [];

    bb.on('file', (_, file, info) => {
      const entry: FileEntry = { filename: '', data: [], mimeType: '' };

      file
        .on('data', (data) => {
          entry.data.push(data);
        })
        .on('close', () => {
          entries.push(entry);
        })
        .on('error', (err) => {
          bb.emit('error', err);
        });
    });

    bb.on('close', async () => {
      try {
        for (const entry of entries) {
          const buf = Buffer.concat(entry.data);

          // Save file to Bucket
          await filesBucket.upload(entry.filename, buf, {
            contentType: entry.mimeType,
          });

          // Save file to DB
          await DB.exec`
              INSERT INTO files (name, data, mime_type)
              VALUES (${entry.filename}, ${buf}, ${entry.mimeType})
              ON CONFLICT (name) DO UPDATE
                  SET data      = ${buf},
                      mime_type = ${entry.mimeType}
          `;
          log.info(`File ${entry.filename} saved`);
        }

        // Redirect to the root page
        res.writeHead(303, { Connection: 'close', Location: '/' });
        res.end();
      } catch (err) {
        bb.emit('error', err);
      }
    });

    bb.on('error', async (err) => {
      res.writeHead(500, { Connection: 'close' });
      res.end(`Error: ${(err as Error).message}`);
    });

    req.pipe(bb);
    return;
  },
);

// List files from database
export const getAllFiles = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'GET',
    path: '/api/files/:workspaceId',
  },
  async (params: { workspaceId: string }): Promise<{ files: FileMetadata[] }> => {
    const auth = getAuthData() as AuthData;

    try {
      const files = [];
      const rows = await DB.query<Omit<FileMetadata, 'url'>>`
        SELECT
          id,
          name,
          mime_type as "mimeType",
          uploaded_by as "uploadedBy",
          organization_id as "organizationId",
          created_at as "createdAt"
        FROM files
        WHERE organization_id = ${auth.organizationID}
        AND workspace_id = ${params.workspaceId}
        ORDER BY created_at DESC
      `;

      for await (const row of rows) {
        files.push({
          ...row,
          url: filesBucket.publicUrl(row.name),
        });
      }

      return { files };
    } catch (err) {
      console.error('Failed to list DB files:', err);
      return { files: [] };
    }
  },
);

// Add this new endpoint for deleting files
export const deleteOneFile = api(
  {
    expose: true, // Is publicly accessible
    auth: true, // Auth handler validation is required
    method: 'DELETE',
    path: '/api/files/:workspaceId/:fileName',
  },
  async (params: { fileName: string; workspaceId: string }): Promise<void> => {
    const auth = getAuthData() as AuthData;

    try {
      // Check if the file exists and belongs to this workspace
      const file = await DB.queryRow<{ name: string }>`
        SELECT name
        FROM files
        WHERE name = ${params.fileName}
        AND organization_id = ${auth.organizationID}
        AND workspace_id = ${params.workspaceId}
        LIMIT 1
      `;

      if (!file) {
        throw APIError.notFound('File not found');
      }

      // Delete from bucket
      await filesBucket.remove(params.fileName);

      // Delete from database
      await DB.exec`
        DELETE FROM files
        WHERE name = ${params.fileName}
        AND organization_id = ${auth.organizationID}
        AND workspace_id = ${params.workspaceId}
      `;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      log.error('Failed to delete file', { error, fileName: params.fileName });
      throw APIError.internal('Failed to delete file');
    }
  },
);

// Raw endpoint for serving a file from the database
// export const get = api.raw({ auth: true, expose: true, method: 'GET', path: '/files/:fileName' }, async (req, resp) => {
//   try {
//     const { name } = (currentRequest() as APICallMeta).pathParams;
//     const row = await DB.queryRow`
//           SELECT data
//           FROM files
//           WHERE name = ${name}`;
//     if (!row) {
//       resp.writeHead(404);
//       resp.end('File not found');
//       return;
//     }
//
//     resp.writeHead(200, { 'Content-Type': row.mime_type });
//     const chunk = Buffer.from(row.data);
//     resp.writeHead(200, { Connection: 'close' });
//     resp.end(chunk);
//   } catch (err) {
//     resp.writeHead(500);
//     resp.end((err as Error).message);
//   }
// });

// List files from bucket
// export const listBucketFiles = api(
//   {
//     expose: true, // Is publicly accessible
//     auth: true, // Auth handler validation is required
//     method: 'GET',
//     path: '/bucket-files',
//   },
//   async (): Promise<{ files: FileMetadata[] }> => {
//     const auth = getAuthData() as AuthData;
//     const files: FileMetadata[] = [];
//
//     try {
//       for await (const entry of filesBucket.list({})) {
//         files.push({
//           name: entry.name,
//           url: filesBucket.publicUrl(entry.name),
//           uploadedBy: auth.userID,
//           organizationId: auth.organizationID,
//         });
//       }
//     } catch (err) {
//       console.error('Failed to list bucket files:', err);
//       return { files: [] };
//     }
//
//     return { files };
//   },
// );
