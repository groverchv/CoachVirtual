import api from "../api/api";

const API_URL = "/rutinas/";

const RoutineService = {
  list: async () => {
    try {
      const { data } = await api.get(API_URL);
      return data;
    } catch (err) {
      // fallback: localStorage
      const raw = localStorage.getItem("cv_rutinas");
      return raw ? JSON.parse(raw) : [];
    }
  },

  create: async (payload) => {
    try {
      const { data } = await api.post(API_URL, payload);
      return data;
    } catch (err) {
      // guardar en localStorage como respaldo
      const raw = localStorage.getItem("cv_rutinas");
      const list = raw ? JSON.parse(raw) : [];
      // asignar id temporal
      const id = Date.now();
      const item = { id, ...payload };
      list.unshift(item);
      localStorage.setItem("cv_rutinas", JSON.stringify(list));
      return item;
    }
  }
  ,
  getById: async (id) => {
    try {
      const { data } = await api.get(`${API_URL}${id}/`);
      return data;
    } catch (err) {
      // fallback a localStorage
      const raw = localStorage.getItem("cv_rutinas");
      const list = raw ? JSON.parse(raw) : [];
      return list.find(r => String(r.id) === String(id)) || null;
    }
  }
};

export default RoutineService;
