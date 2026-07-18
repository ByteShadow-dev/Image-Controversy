import { apiClient } from './api';

export const sendPrompt = async (prompt, nodeId) => {
  const response = await apiClient.post('/chat', {
    prompt,
    node_id: nodeId,
  });
  return response.data;
};

export const getChatHistory = async (projectId) => {
  const response = await apiClient.get(`/chat/${projectId}`);
  return response.data;
};

export const streamPrompt = async (prompt, nodeId, onChunk, onError) => {
  try {
    const response = await fetch(`${apiClient.defaults.baseURL}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiClient.defaults.headers.common.Authorization,
      },
      body: JSON.stringify({
        prompt,
        node_id: nodeId,
      }),
    });

    if (!response.ok) {
      throw new Error('Stream request failed');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      if (onChunk) {
        onChunk(chunk);
      }
    }
  } catch (error) {
    if (onError) {
      onError(error);
    }
    throw error;
  }
};

export const retryPrompt = async (messageId, prompt, nodeId) => {
  const response = await apiClient.post('/chat/retry', {
    message_id: messageId,
    prompt,
    node_id: nodeId,
  });
  return response.data;
};
