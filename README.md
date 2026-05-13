# Labflow

Labflow es una plataforma web avanzada diseñada para la orquestación, simulación y ejecución de protocolos de manejo de líquidos (liquid handling) en entornos de laboratorio automatizados. Con un enfoque profundo en la precisión matemática y eficiencia, Labflow elimina la fricción de programar rutinas complejas para robots pipeteadores, ofreciendo un entorno automatizado y altamente interactivo.

## ✨ Capacidades y Bondades del Sistema

### 🧪 Configuración Dinámica del *Deck*
* **Gestor de Bahías Espacial:** Interfaz gráfica interactiva para disponer instrumental en un tablero de 6 bahías.
* **Soporte Universal de Labware:** Soporte nativo para microplacas (ej. 96 pocillos), reservorios de reactivos y cajas de puntas (*TipRacks*), estandarizados para un posicionamiento preciso.
* **Selección Matricial Avanzada:** Configuración de pocillos uno a uno o mediante una selección de "lazo" por arrastre, permitiendo delinear patrones completos de pipeteo en segundos.

### 🤖 Asistentes Automatizados (Wizards)
El sistema incluye flujos de trabajo pre-programados (wizards) orientados a acelerar la creación de protocolos de laboratorio altamente estandarizados sin requerir configuración manual paso a paso:
* **Ensayo ELISA:** Automatiza las adiciones de antígenos, bloqueos, lavados sucesivos y lectura de sustratos.
* **AlamarBlue:** Preconfigura rutinas de viabilidad celular y dosificación de fluoróforos.
* **Diluciones Seriadas:** Asistente matemático para propagar concentraciones a través de una placa de forma paramétrica.

### 🧬 Motor de Protocolos Inteligente
* **Simulador Matemático de Fluidos:** Calcula el volumen de líquido en cada pocillo y reservorio en *tiempo real* conforme avanzan los pasos del protocolo, alertando predictivamente de falta de reactivos o desbordamientos.
* **Secuenciador Visual de Pasos:** Flujo de trabajo estructurado para ordenar y editar parámetros lógicos.
* **Operaciones Primitivas Completas:** Control atómico sobre todas las acciones posibles del robot:
  * **Transfer (Transferir):** Movimiento de volumen 1 a 1.
  * **Distribute (Distribuir):** Dosificación de 1 origen a N destinos.
  * **Consolidate (Consolidar):** Agrupación de N orígenes a 1 destino.
  * **Aspirate (Aspirar):** Extracción para desechos.
  * **Wash (Lavar):** Ciclos automatizados de adición y remoción.
  * **Mix (Mezclar):** Repeticiones de aspiración/dispensación en un mismo pocillo.
  * **Pause (Pausa):** Detención temporal del sistema por tiempo cronometrado o hasta confirmación manual del usuario.
  * **Comment (Comentario):** Notas textuales inyectadas en la secuencia.

### ⚙️ Generación de G-Code y Control Directo
* **Traductor Cinemático:** Convierte automáticamente la secuencia de pasos lógicos en trayectorias de G-Code estandarizadas.
* **Integración Nativa (Klipper-ready):** Capacidad de conectarse directamente a un firmware de control de impresoras 3D o robots (como Klipper) para la inyección directa y remota de los comandos generados.
* **Exportación JSON:** Capacidad de almacenar y compartir protocolos lógicos en formato portátil.

## 🚀 Arquitectura y Tecnologías
Este sistema es completamente agnóstico al hardware subyacente de los motores, focalizándose puramente en la lógica de automatización y la interfaz de control:

- **Frontend:** React + Vite
- **Estado Global:** Zustand (Gestión inmutable y ultra-rápida de las simulaciones matemáticas).
- **Estilos:** Tailwind CSS

## 📦 Instalación y Desarrollo Local

Para desplegar Labflow de forma local en modo de desarrollo:

1. **Clona el repositorio** y entra en la carpeta del proyecto.
2. **Instala las dependencias**:
   ```bash
   npm install
   ```
3. **Inicia el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
4. Navega a la URL local (por defecto `http://localhost:5173`) en tu navegador web.
