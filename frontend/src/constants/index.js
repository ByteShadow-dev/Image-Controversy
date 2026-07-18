export const API_ENDPOINTS = {
  UPLOAD: '/upload',
  CHAT: '/chat',
  TREE: '/tree',
  NODE: '/node',
  EXPORT: '/export',
};

export const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];

export const DEFAULT_ZOOM = 1;

export const KEYBOARD_SHORTCUTS = {
  UNDO: 'ctrl+z',
  REDO: 'ctrl+y',
  ZOOM_IN: 'ctrl+=',
  ZOOM_OUT: 'ctrl+-',
  FIT: 'ctrl+0',
  SAVE: 'ctrl+s',
  DELETE: 'delete',
  BRANCH: 'ctrl+b',
};

export const CONNECTION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  RECONNECTING: 'reconnecting',
};

export const NODE_TYPES = {
  ROOT: 'root',
  EDIT: 'edit',
  BRANCH: 'branch',
};
