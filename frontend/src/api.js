import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

export const photoApi = {
  // Get all folders
  getFolders: async () => {
    const response = await api.get('/api/folders');
    return response.data;
  },

  // Get photos in a specific folder
  getPhotos: async (folderPath) => {
    const response = await api.get(`/api/photos/${folderPath}`);
    return response.data;
  },

  // Get photo URL
  getPhotoUrl: (photoPath) => {
    return `${API_BASE_URL}/api/photo/${photoPath}`;
  },
};

export default api; 