import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Image as ImageIcon, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadImage } from '../../../services';
import { useUIStore, useProjectStore } from '../../../store';
import { useMutation } from '@tanstack/react-query';

function UploadPanel() {
  const navigate = useNavigate();
  const { setProject } = useProjectStore();
  const { addNotification } = useUIStore();
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  const uploadMutation = useMutation({
    mutationFn: ({ file, onProgress }) => uploadImage(file, onProgress),
    onSuccess: (data) => {
      setProject(data.project_id, data.project_name || 'Untitled Project');
      addNotification({
        type: 'success',
        title: 'Upload Complete',
        message: 'Your image has been uploaded successfully',
      });
      navigate(`/editor/${data.project_id}`);
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Upload Failed',
        message: error.message || 'Failed to upload image',
      });
    },
  });

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) {
      addNotification({
        type: 'error',
        title: 'Invalid File',
        message: 'Please select a valid image file',
      });
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, [addNotification]);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [handleFile]);

  const handleInputChange = useCallback((e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, [handleFile]);

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      uploadMutation.mutate({ 
        file: selectedFile,
        onProgress: (progress) => {
          console.log(`Upload progress: ${progress}%`);
        }
      });
    }
  }, [selectedFile, uploadMutation]);

  const handleClearPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
  }, [previewUrl]);

  return (
    <div className="panel p-6">
      <AnimatePresence>
        {!previewUrl ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-adobe-accent bg-adobe-accent/10'
                : 'border-adobe-border hover:border-adobe-textMuted'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <ImageIcon size={48} className="mx-auto mb-4 text-adobe-textMuted" />
            <h3 className="text-lg font-medium text-adobe-text mb-2">
              Drop your image here
            </h3>
            <p className="text-adobe-textMuted mb-4">
              or click to browse
            </p>
            <label className="btn-primary cursor-pointer inline-flex">
              <Upload size={18} />
              <span>Browse Files</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </label>
            <p className="text-xs text-adobe-textMuted mt-4">
              Supports: JPG, PNG, GIF, WebP
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="space-y-4"
          >
            <div className="relative aspect-video bg-adobe-dark rounded-lg overflow-hidden">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain"
              />
              <button
                onClick={handleClearPreview}
                className="absolute top-2 right-2 p-2 bg-adobe-dark/80 hover:bg-adobe-error rounded-full transition-colors"
                aria-label="Remove image"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-adobe-textMuted">
                <p className="font-medium text-adobe-text">{selectedFile?.name}</p>
                <p>{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="btn-primary"
              >
                {uploadMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    <span>Start Editing</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default UploadPanel;
