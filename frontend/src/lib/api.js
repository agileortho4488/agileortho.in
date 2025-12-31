import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

export function apiClient() {
  return axios.create({
    baseURL: API_BASE,
    timeout: 20000,
  });
}
