import { apiClient } from './api';

export const getNode = async (nodeId) => {
  const response = await apiClient.get(`/images/${nodeId}`);
  return response.data;
};

export const restoreNode = async (nodeId) => {
  const response = await apiClient.post(`/node/${nodeId}/restore`);
  return response.data;
};

export const branchNode = async (nodeId, prompt) => {
  const response = await apiClient.post(`/node/${nodeId}/branch`, {
    prompt,
  });
  return response.data;
};

export const renameNode = async (nodeId, name) => {
  const response = await apiClient.patch(`/node/${nodeId}/rename`, {
    name,
  });
  return response.data;
};

export const duplicateNode = async (nodeId) => {
  const response = await apiClient.post(`/node/${nodeId}/duplicate`);
  return response.data;
};

export const deleteNode = async (nodeId) => {
  const response = await apiClient.delete(`/node/${nodeId}`);
  return response.data;
};

export const getNodeMetadata = async (nodeId) => {
  const response = await apiClient.get(`/node/${nodeId}/metadata`);
  return response.data;
};
