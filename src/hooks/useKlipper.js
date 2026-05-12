import { useEffect, useRef, useCallback } from 'react';
import { useLabflowStore } from '@/stores/useLabflowStore';

export function useKlipper() {
  const wsRef = useRef(null);
  const pendingRequests = useRef(new Map());
  const jsonRpcId = useRef(1);

  const klipper = useLabflowStore((s) => s.klipper);
  const setKlipperStatus = useLabflowStore((s) => s.setKlipperStatus);
  const addKlipperLog = useLabflowStore((s) => s.addKlipperLog);
  const shiftKlipperQueue = useLabflowStore((s) => s.shiftKlipperQueue);
  const setProcessingQueue = useLabflowStore((s) => s.setProcessingQueue);

  const connect = useCallback(() => {
    const ip = klipper.ip;
    if (!ip) {
      addKlipperLog('Se requiere una dirección IP para conectar.', 'error');
      setKlipperStatus('error', 'IP no válida');
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      addKlipperLog('Ya hay una conexión activa.', 'info');
      return;
    }

    addKlipperLog(`Conectando a ws://${ip}/websocket...`, 'info');
    setKlipperStatus('connecting');

    const ws = new WebSocket(`ws://${ip}/websocket`);
    wsRef.current = ws;

    ws.onopen = () => {
      addKlipperLog('Conexión WebSocket establecida.', 'info');
      setKlipperStatus('connected');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id && pendingRequests.current.has(data.id)) {
        addKlipperLog(`Respuesta ID ${data.id}: ${JSON.stringify(data.result || data.error)}`, 'received');
        const cb = pendingRequests.current.get(data.id);
        if (data.error) cb.reject(data.error);
        else cb.resolve(data.result);
        pendingRequests.current.delete(data.id);
      } else if (data.method === 'notify_gcode_response') {
        addKlipperLog(data.params[0], 'received');
      }
    };

    ws.onerror = () => {
      addKlipperLog('Error en WebSocket. Revisa la IP y que Moonraker esté funcionando.', 'error');
      setKlipperStatus('error', 'No se pudo conectar');
    };

    ws.onclose = () => {
      addKlipperLog('Conexión WebSocket cerrada.', 'info');
      setKlipperStatus('disconnected');
      pendingRequests.current.forEach((p) => p.reject('Conexión cerrada'));
      pendingRequests.current.clear();
      wsRef.current = null;
    };
  }, [klipper.ip, addKlipperLog, setKlipperStatus]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, []);

  const sendCommand = useCallback((script) => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return reject('WebSocket no está conectado');
      }
      const id = jsonRpcId.current++;
      const payload = { jsonrpc: '2.0', method: 'printer.gcode.script', params: { script }, id };
      pendingRequests.current.set(id, { resolve, reject });
      ws.send(JSON.stringify(payload));
      addKlipperLog(JSON.stringify(payload), 'sent');
      setTimeout(() => {
        if (pendingRequests.current.has(id)) {
          pendingRequests.current.delete(id);
          reject(new Error(`Timeout: ${script}`));
        }
      }, 30000);
    });
  }, [addKlipperLog]);

  // Process queue
  useEffect(() => {
    if (klipper.isProcessingQueue || klipper.queue.length === 0 || klipper.status !== 'connected') return;

    let cancelled = false;
    setProcessingQueue(true);

    (async () => {
      addKlipperLog(`Procesando cola con ${klipper.queue.length} comandos...`, 'info');
      while (!cancelled) {
        const cmd = shiftKlipperQueue();
        if (!cmd) break;
        try {
          await sendCommand(cmd);
        } catch (err) {
          addKlipperLog(`Error ejecutando '${cmd}': ${err.message || err}`, 'error');
          setKlipperStatus('error', `Error en comando: ${cmd}`);
          break;
        }
      }
      if (!cancelled) {
        setProcessingQueue(false);
        addKlipperLog('Cola finalizada.', 'info');
      }
    })();

    return () => { cancelled = true; };
  }, [klipper.queue.length, klipper.status, klipper.isProcessingQueue]);

  // Auto-connect when IP is set and status is connecting
  useEffect(() => {
    if (klipper.status === 'connecting' && !wsRef.current) {
      connect();
    }
  }, [klipper.status, connect]);

  return { connect, disconnect };
}
