import { useState } from 'react';
import type { FileInfo } from '~/api/file';
import { useFileApi } from '~/api/file';

interface FileListProps {
  files: FileInfo[];
  organizationId: string;
  workspaceId: string;
  onFileDeleted: () => void;
}

export const FileList = ({ files, organizationId, workspaceId, onFileDeleted }: FileListProps) => {
  const { deleteFile } = useFileApi();
  const [deletingFile, setDeletingFile] = useState<string | null>(null);

  const handleDelete = async (fileName: string) => {
    if (!confirm('Are you sure you want to delete this file?')) {
      return;
    }

    try {
      setDeletingFile(fileName);
      await deleteFile(fileName, organizationId, workspaceId);
      onFileDeleted();
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    } finally {
      setDeletingFile(null);
    }
  };

  if (!files.length) {
    return <p className="mt-4 text-gray-500 italic">No files uploaded yet.</p>;
  }

  return (
    <div className="mt-6">
      <ul className="divide-y divide-gray-200">
        {files.map((file) => (
          <li key={file.name} className="py-3 flex justify-between items-center">
            <a
              href={file.url}
              className="text-blue-600 hover:text-blue-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {file.name}
            </a>
            <button
              onClick={() => handleDelete(file.name)}
              disabled={deletingFile === file.name}
              className="ml-4 text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {deletingFile === file.name ? (
                <span>Deleting...</span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
