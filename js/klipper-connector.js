/**
 * klipper-connector.js
 * * Este módulo gestiona la comunicación con la API de Moonraker (Klipper)
 * a través de WebSockets. Se encarga de la conexión, el envío de comandos G-code,
 * y la gestión de una cola para evitar la saturación del buffer de Klipper.
 */

// --- Estado del Módulo ---
let websocket;
const commandQueue = [];
let isProcessingQueue = false;
let jsonRpcId = 1;
const pendingRequests = new Map();

/**
 * Emite un evento personalizado para notificar a la aplicación principal sobre cambios de estado.
 * @param {'connecting'|'connected'|'disconnected'|'error'} status - El nuevo estado.
 * @param {string|null} message - Un mensaje opcional.
 */
function dispatchStatusEvent(status, message = null) {
    const event = new CustomEvent('klipperStatusChange', {
        detail: { status, message }
    });
    document.dispatchEvent(event);
}

/**
 * Emite un evento personalizado con un mensaje de log para ser mostrado en la UI.
 * @param {string} message - El mensaje a registrar.
 * @param {'info'|'sent'|'received'|'error'} type - El tipo de mensaje.
 */
function dispatchLogEvent(message, type) {
    const event = new CustomEvent('klipperLog', {
        detail: { message, type }
    });
    document.dispatchEvent(event);
}


/**
 * Intenta conectar con el servidor Moonraker en la IP especificada.
 * @param {string} ip - La dirección IP del host de Klipper (Raspberry Pi).
 */
function connect(ip) {
    if (websocket && websocket.readyState === WebSocket.OPEN) {
        dispatchLogEvent('Ya hay una conexión activa.', 'info');
        return;
    }

    if (!ip) {
        dispatchLogEvent('Se requiere una dirección IP para conectar.', 'error');
        dispatchStatusEvent('error', 'IP no válida.');
        return;
    }

    dispatchLogEvent(`Conectando a ws://${ip}/websocket...`, 'info');
    dispatchStatusEvent('connecting');
    websocket = new WebSocket(`ws://${ip}/websocket`);

    websocket.onopen = () => {
        dispatchLogEvent('Conexión WebSocket establecida.', 'info');
        dispatchStatusEvent('connected');
    };

    websocket.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Filtrar mensajes para solo mostrar los relevantes
        if (data.id && pendingRequests.has(data.id)) {
            dispatchLogEvent(`Respuesta para ID ${data.id}: ${JSON.stringify(data.result || data.error)}`, 'received');
            const promiseCallbacks = pendingRequests.get(data.id);
            if (data.error) {
                promiseCallbacks.reject(data.error);
            } else {
                promiseCallbacks.resolve(data.result);
            }
            pendingRequests.delete(data.id);
        } else if (data.method === 'notify_gcode_response') {
            dispatchLogEvent(data.params[0], 'received');
        }
    };

    websocket.onerror = (error) => {
        dispatchLogEvent('Error en WebSocket. Revisa la IP y que Moonraker esté funcionando.', 'error');
        console.error("WebSocket Error:", error);
        dispatchStatusEvent('error', 'No se pudo conectar. Revisa la IP y la consola.');
    };

    websocket.onclose = () => {
        dispatchLogEvent('Conexión WebSocket cerrada.', 'info');
        dispatchStatusEvent('disconnected');
        pendingRequests.forEach(p => p.reject('Conexión cerrada.'));
        pendingRequests.clear();
        websocket = null;
    };
}

/**
 * Cierra la conexión WebSocket activa.
 */
function disconnect() {
    if (websocket) {
        websocket.close();
    }
}

/**
 * Envía un script G-code a Klipper y devuelve una promesa que se resuelve
 * cuando Moonraker confirma la recepción.
 * @param {string} script - El comando o comandos G-code a enviar.
 * @returns {Promise<any>}
 */
function sendCommand(script) {
    return new Promise((resolve, reject) => {
        if (!websocket || websocket.readyState !== WebSocket.OPEN) {
            return reject('WebSocket no está conectado.');
        }

        const id = jsonRpcId++;
        const payload = {
            jsonrpc: "2.0",
            method: "printer.gcode.script",
            params: { script },
            id: id
        };

        pendingRequests.set(id, { resolve, reject });
        
        const payloadString = JSON.stringify(payload);
        websocket.send(payloadString);
        dispatchLogEvent(payloadString, 'sent');

        // Timeout por si Klipper no responde
        setTimeout(() => {
            if (pendingRequests.has(id)) {
                pendingRequests.delete(id);
                reject(new Error(`Timeout para el comando: ${script}`));
            }
        }, 30000);
    });
}

/**
 * Añade un comando o una lista de comandos a la cola de procesamiento.
 * @param {string|string[]} commands - El/los comando(s) a añadir.
 */
function addToQueue(commands) {
    const commandsArray = Array.isArray(commands) ? commands : [commands];
    commandsArray.forEach(cmd => {
        const trimmedCmd = cmd.trim();
        if (trimmedCmd) {
            commandQueue.push(trimmedCmd);
        }
    });
    // Inicia el procesamiento si no está ya en marcha
    processQueue();
}

/**
 * Procesa los comandos en la cola uno por uno, esperando a que el anterior
 * se complete antes de enviar el siguiente.
 */
async function processQueue() {
    if (isProcessingQueue || commandQueue.length === 0) {
        return;
    }
    isProcessingQueue = true;
    dispatchLogEvent(`Iniciando procesamiento de cola con ${commandQueue.length} comandos.`, 'info');
    
    while(commandQueue.length > 0) {
        const command = commandQueue.shift();
        try {
            await sendCommand(command);
        } catch (error) {
            dispatchLogEvent(`Error ejecutando '${command}': ${error.message}`, 'error');
            dispatchStatusEvent('error', `Error en el comando: ${command}. Se detuvo la ejecución.`);
            // Detener y limpiar la cola en caso de error
            isProcessingQueue = false;
            commandQueue.length = 0;
            return;
        }
    }

    isProcessingQueue = false;
    dispatchLogEvent('Lote de comandos finalizado.', 'info');
}

/**
 * Devuelve el estado actual de la conexión.
 * @returns {boolean} - true si está conectado, false en caso contrario.
 */
function isConnected() {
    return websocket && websocket.readyState === WebSocket.OPEN;
}

// Exportar las funciones públicas del módulo
export { connect, disconnect, addToQueue, isConnected };
