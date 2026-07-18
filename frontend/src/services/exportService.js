import { apiClient } from './api';

export const exportImage = async (nodeId, format = 'png', quality = 1) => {
  const response = await apiClient.post('/export', {
    node_id: nodeId,
    format,
    quality,
  });
  return response.data;
};

export const downloadExport = async (exportId) => {
  const response = await apiClient.get(`/export/${exportId}/download`, {
    responseType: 'blob',
  });
  return response.data;
};

export const getExportStatus = async (exportId) => {
  const response = await apiClient.get(`/export/${exportId}/status`);
  return response.data;
};

export const exportHistory = async (projectId) => {
  const response = await apiClient.get(`/export/${projectId}/history`);
  return response.data;
};
