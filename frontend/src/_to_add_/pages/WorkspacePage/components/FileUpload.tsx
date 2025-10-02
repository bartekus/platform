import { useState } from 'react';
import { useParams } from 'react-router';
import { useFileApi } from '~/api/file';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog';
import { Button } from '~/components/ui/button';

interface FileUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
  workspaceId: string;
}

export const FileUploadDialog = ({ open, onClose, onUploadComplete, workspaceId }: FileUploadDialogProps) => {
  const { orgId } = useParams();
  const { uploadFile } = useFileApi();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!orgId) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    setIsUploading(true);
    setError(null);

    try {
      await uploadFile(orgId, workspaceId, formData);
      onUploadComplete();
      form.reset();
      onClose();
    } catch (err) {
      setError(`Failed to upload file: ${err}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>
        
        <div className="p-4 bg-gray-50 rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
            <div>
              <label htmlFor="filefield" className="block text-sm font-medium text-gray-700 mb-1">
                Upload File
              </label>
              <input
                type="file"
                id="filefield"
                name="filefield"
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
              />
            </div>

            {error && <div className="text-red-600 text-sm bg-red-50 px-4 py-2.5 rounded-lg">{error}</div>}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
