import { apiClient } from './api';

/**
 * Uploads an image using the real backend two-step API:
 * 1. POST /tree/                  — create a new project tree, returns tree with id
 * 2. POST /images/{tree_id}/root  — register the root image node with the filename path
 *
 * Returns { project_id, project_name } for UploadPanel to navigate to /editor/:projectId
 */
export const uploadImage = async (file, onProgress) => {
  // Step 1 – Create a new tree (project container)
  if (onProgress) onProgress(10);

  const treeResponse = await apiClient.post('/tree/', {
    title: file.name.replace(/\.[^.]+$/, '') || 'Untitled Project',
  });

  const tree = treeResponse.data;
  // Backend returns Mongo document; id is serialised as `id` via the Pydantic alias
  const treeId = tree.id || tree._id;

  if (onProgress) onProgress(50);

  // Step 2 – Register root image node (backend stores the path string)
  const formData = new FormData();
  formData.append('file', file);

  const rootResponse = await apiClient.post(`/images/${treeId}/root`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const filePercent = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(50 + Math.round(filePercent * 0.5));
      }
    },
  });

  if (onProgress) onProgress(100);

  return {
    project_id: treeId,
    project_name: tree.title || file.name,
    node_id: rootResponse.data?.node_id,
  };
};

export const getUploadProgress = async (uploadId) => {
  const response = await apiClient.get(`/upload/${uploadId}/progress`);
  return response.data;
};

export const cancelUpload = async (uploadId) => {
  const response = await apiClient.delete(`/upload/${uploadId}`);
  return response.data;
};
