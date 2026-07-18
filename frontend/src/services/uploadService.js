import { apiClient } from './api';

export const uploadImage = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      }
    },
  });

  return response.data;
};

export const getUploadProgress = async (uploadId) => {
  const response = await apiClient.get(`/upload/${uploadId}/progress`);
  return response.data;
};

export const cancelUpload = async (uploadId) => {
  const response = await apiClient.delete(`/upload/${uploadId}`);
  return response.data;
};
