// Servicio del frontend para hablar con el backend de dispositivo (Google Fit)
import api from '../api/api';

export async function getGoogleFitStats() {
  const { data } = await api.get('/dispositivo/googlefit/');
  return data;
}

// Helper para polling periódico
export function startStatsPolling(onData, onError, intervalMs = 10000) {
  let stopped = false;
  async function tick() {
    if (stopped) return;
    try {
      const data = await getGoogleFitStats();
      onData?.(data);
    } catch (e) {
      onError?.(e);
    } finally {
      if (!stopped) setTimeout(tick, intervalMs);
    }
  }
  tick();
  return () => { stopped = true; };
}
