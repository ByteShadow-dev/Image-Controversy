import { apiClient } from './api';

export const getTree = async (projectId) => {
  const response = await apiClient.get(`/tree/${projectId}`);
  return response.data;
};

export const createRootNode = async (projectId, imageData) => {
  const response = await apiClient.post('/tree', {
    project_id: projectId,
    image_data: imageData,
  });
  return response.data;
};

export const updateTreeNode = async (nodeId, updates) => {
  const response = await apiClient.patch(`/tree/${nodeId}`, updates);
  return response.data;
};

export const deleteTreeNode = async (nodeId) => {
  const response = await apiClient.delete(`/tree/${nodeId}`);
  return response.data;
};

export const deleteProject = async (projectId) => {
  const response = await apiClient.delete(`/tree/${projectId}`);
  return response.data;
};

export const deleteProjectNode = async (projectId, nodeId) => {
  const response = await apiClient.delete(`/tree/${projectId}/nodes/${nodeId}`);
  return response.data;
};
