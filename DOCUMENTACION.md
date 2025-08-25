# LABFLOW - Configurador de Protocolos para Automatización de Laboratorio

## 1. Introducción

LABFLOW es una aplicación web interactiva diseñada para configurar y gestionar protocolos de laboratorio automatizados, específicamente para sistemas robóticos controlados por Klipper. Permite a los usuarios diseñar secuencias de acciones (como transferencias de líquidos, lavados, mezclas) en una mesa de trabajo virtual, gestionar una biblioteca de labware, guardar y cargar protocolos, y controlar manualmente el robot. La aplicación está construida con HTML, CSS (Tailwind CSS) y JavaScript puro, enfocándose en una interfaz de usuario intuitiva y una experiencia de usuario fluida.

## 2. Características Principales

*   **Configuración de Workflow Visual**:
    *   Representación interactiva de una mesa de trabajo (deck) con 6 bahías.
    *   Arrastrar y soltar labware en las bahías.
    *   Visualización detallada del labware seleccionado, incluyendo pocillos y volúmenes.
    *   Creación de una secuencia de pasos de protocolo con diversas acciones (transferir, distribuir, consolidar, aspirar, lavar, mezclar, pausar, comentar).
    *   Configuración detallada de cada paso con parámetros específicos (volumen, pocillos de origen/destino, estrategia de pipeteo, etc.).
    *   Funcionalidad de deshacer/rehacer para la edición de protocolos.
    *   Validación de pasos y advertencias en tiempo real.
*   **Librería de Labware**:
    *   Gestión de una colección de labware predefinido y personalizado.
    *   Capacidad para añadir, editar y eliminar labware con propiedades detalladas (dimensiones, rejilla, propiedades de pocillo, volumen máximo).
    *   Asistente de calibración manual para labware, permitiendo definir puntos Z seguros y de fondo.
*   **Galería de Protocolos**:
    *   Guardar y cargar protocolos completos.
    *   Visualización de un resumen de los protocolos guardados, incluyendo acciones principales, labware utilizado y un registro de movimientos.
*   **Control del Robot (Klipper)**:
    *   Conexión y desconexión a un robot Klipper a través de una dirección IP.
    *   Monitor de comunicación en tiempo real para comandos enviados y recibidos.
    *   Control manual (jogging) del robot en los ejes X, Y y Z.
    *   Funcionalidades de pausa, reanudar y cancelar la ejecución de protocolos.
*   **Asistentes de Protocolo**:
    *   **Dilución en Serie**: Genera automáticamente pasos para diluciones en serie.
    *   **Ensayo ELISA**: Asistente para configurar protocolos ELISA, incluyendo asignación de reactivos y lavados.
    *   **Ensayo AlamarBlue**: Asistente para configurar protocolos AlamarBlue, con selección de pocillos de ensayo y control.
*   **Interfaz de Usuario Moderna**:
    *   Diseño responsivo con Tailwind CSS.
    *   Iconografía clara con Lucide Icons.
    *   Animaciones sutiles para una mejor experiencia.

## 3. Estructura de Archivos

La aplicación sigue una estructura de archivos modular para organizar el código JavaScript, CSS y HTML.

```
.
├── css/
│   └── styles.css          # Estilos principales de la aplicación
├── js/
│   ├── calibration.js      # Lógica para la calibración de labware
│   ├── events.js           # Manejadores de eventos para interacciones de usuario
│   ├── klipper-connector.js# Módulo para la comunicación con Klipper
│   ├── main.js             # Punto de entrada principal de la aplicación
│   ├── state.js            # Gestión del estado global de la aplicación
│   ├── ui.js               # Funciones para renderizar y actualizar la interfaz de usuario
│   └── wizards.js          # Lógica para los asistentes de protocolo (Dilución, ELISA, AlamarBlue)
└── index.html              # Estructura HTML principal de la aplicación
```

## 4. Tecnologías Utilizadas

*   **HTML5**: Estructura de la página web.
*   **CSS3**: Estilos y diseño, utilizando:
    *   **Tailwind CSS**: Framework CSS utility-first para un desarrollo rápido y responsivo.
*   **JavaScript (ES6+)**: Lógica de la aplicación, gestión del estado, manipulación del DOM y comunicación con el backend/robot.
*   **Lucide Icons**: Biblioteca de iconos vectoriales para una interfaz visualmente rica.

## 5. Conceptos Clave

### 5.1. Gestión del Estado (`js/state.js`)

El archivo `state.js` centraliza el estado de la aplicación, incluyendo:
*   `deck`: Un objeto que representa la mesa de trabajo con las bahías y el labware ocupado.
*   `protocolSequence`: Un array de objetos que define los pasos del protocolo actual.
*   `modal`: Controla qué modal está visible.
*   `activeTab`: La pestaña actualmente seleccionada (Workflow, Labware, Gallery, Control).
*   `activeLabwareLibrary`: La biblioteca de labware disponible.
*   `savedProtocols`: Los protocolos guardados por el usuario.
*   `history`: Un array para la funcionalidad de deshacer/rehacer.
*   `protocolWarnings`: Advertencias asociadas a los pasos del protocolo.
*   `calibrationState`: Estado específico para el proceso de calibración.
*   `wizardAssayWells`, `wizardControlWells`: Conjuntos de pocillos seleccionados para los asistentes.

### 5.2. Renderizado de la Interfaz (`js/ui.js`)

El módulo `ui.js` contiene funciones para renderizar y actualizar dinámicamente diferentes partes de la interfaz de usuario basándose en el estado actual. Esto incluye:
*   `renderAll()`: Función principal que llama a todas las demás funciones de renderizado.
*   `renderTabs()`: Actualiza la visibilidad y el estilo de las pestañas.
*   `renderDeck()`: Dibuja la mesa de trabajo y el labware en las bahías.
*   `renderDeckDetail()`: Muestra una vista detallada del labware seleccionado, incluyendo los pocillos y sus volúmenes.
*   `renderRoutine()`: Dibuja la secuencia de pasos del protocolo.
*   `renderConfigPanel()`: Muestra el formulario de configuración para el paso de protocolo activo.
*   `renderLabwareLibrary()`: Muestra la lista de labware en la librería.
*   `renderProtocolGallery()`: Muestra los protocolos guardados.
*   `renderModals()`: Controla la visibilidad de los modales.
*   `populateWizardSelectors()`, `populateElisaWizard()`, `populateAlamarBlueWizard()`: Funciones para llenar los selectores de los asistentes con el labware disponible.

### 5.3. Manejo de Eventos (`js/events.js`)

El archivo `events.js` gestiona todas las interacciones del usuario, como clics en botones, selección de labware, arrastrar y soltar pasos, y envíos de formularios. Las funciones clave incluyen:
*   `handleDeckEvent()`: Gestiona clics en las bahías de la mesa de trabajo.
*   `handleRoutineEvent()`: Gestiona clics y arrastrar/soltar en los pasos del protocolo.
*   `addStep()`: Añade un nuevo paso al protocolo.
*   `selectLabware()`: Asigna labware a una bahía.
*   `handleAddLabwareSubmit()`: Guarda nuevo labware en la librería.
*   `handleSaveProtocolSubmit()`: Guarda el protocolo actual.
*   `undo()`, `redo()`: Implementan la funcionalidad de historial.
*   `handleSerialDilutionSubmit()`, `handleElisaSubmit()`, `handleAlamarBlueSubmit()`: Procesan los datos de los formularios de los asistentes y generan los pasos del protocolo.
*   `handleAlamarBlueWellSelectionRequest()`: Abre el selector de pocillos para el asistente AlamarBlue.

### 5.4. Conexión Klipper (`js/klipper-connector.js`)

Este módulo se encarga de la comunicación con el firmware Klipper, que controla el robot.
*   Establece y gestiona la conexión WebSocket con la dirección IP de Klipper.
*   Envía comandos G-code al robot.
*   Recibe y procesa las respuestas del robot.
*   Emite eventos personalizados (`klipperStatusChange`, `klipperLog`) para que la UI pueda reaccionar.

### 5.5. Asistentes de Protocolo (`js/wizards.js`)

Los asistentes son herramientas que simplifican la creación de protocolos complejos generando automáticamente una serie de pasos basados en unos pocos parámetros de entrada.
*   **Dilución en Serie**: Calcula volúmenes y secuencias de transferencia para diluciones.
*   **Ensayo ELISA**: Genera pasos para lavados, adición de reactivos e incubaciones.
*   **Ensayo AlamarBlue**: Orquesta lavados, adición de reactivos y transferencias para este tipo de ensayo.

### 5.6. Calibración (`js/calibration.js`)

Este módulo maneja el proceso de calibración manual del labware.
*   Permite al usuario mover el cabezal del robot (jogging) a puntos específicos del labware.
*   Registra las coordenadas Z seguras y de fondo para cada labware.
*   Guarda los datos de calibración para su uso futuro en los protocolos.

## 6. Cómo Usar la Aplicación

1.  **Iniciar la Aplicación**: Abre `index.html` en un navegador web o usa un servidor local (ej. `npx --yes serve`).
2.  **Configurar la Mesa de Trabajo (Workflow)**:
    *   Haz clic en una bahía vacía en la "Mesa de Trabajo" para añadir labware.
    *   Selecciona el labware deseado de la librería.
    *   Haz clic en "Añadir Acción" para empezar a construir tu protocolo.
    *   Selecciona una acción (ej. "Transferir") o un asistente (ej. "Dilución en Serie").
    *   Configura los parámetros de cada paso en el panel de "Configuración de Acción".
    *   Usa los botones "Deshacer" y "Rehacer" para corregir errores.
3.  **Gestionar Labware (Librería Labware)**:
    *   Haz clic en la pestaña "Librería Labware".
    *   Puedes "Añadir Labware" para definir tus propios tipos de labware.
    *   "Calibrar" el labware para definir sus coordenadas Z.
4.  **Guardar y Cargar Protocolos (Galería de Protocolos)**:
    *   En la pestaña "Workflow", haz clic en "Guardar Protocolo" para guardar tu secuencia actual.
    *   En la pestaña "Galería de Protocolos", puedes cargar o eliminar protocolos guardados.
5.  **Conectar y Ejecutar (Control)**:
    *   Haz clic en "Conectar al Robot" en la cabecera e introduce la IP de tu Klipper.
    *   Una vez conectado, puedes usar el "Control Manual (Jog)" para mover el robot.
    *   Haz clic en "Ejecutar Protocolo" para enviar la secuencia de pasos al robot.
    *   El "Monitor de Comunicación" mostrará los comandos enviados y recibidos.

## 7. Notas de Desarrollo

*   **Dependencias Externas**: Tailwind CSS y Lucide Icons se cargan directamente desde CDN en `index.html`.
*   **Modularidad**: El código JavaScript está dividido en módulos para mejorar la organización y mantenibilidad.
*   **Persistencia**: La librería de labware y los protocolos guardados se almacenan en `localStorage` del navegador. La IP de Klipper también se guarda.
*   **Accesibilidad**: Se han considerado elementos básicos de accesibilidad, como etiquetas de formulario y atributos `aria`.

## 8. Posibles Mejoras Futuras

*   **Validación de Protocolos**: Implementar una validación más robusta para asegurar que los protocolos generados sean físicamente posibles y seguros para el robot.
*   **Simulación 3D**: Una representación 3D de la mesa de trabajo y los movimientos del robot.
*   **Integración con LIMS**: Conexión con sistemas de gestión de información de laboratorio.
*   **Generación de Informes**: Creación de informes detallados de la ejecución de protocolos.
*   **Optimización de Rutas**: Algoritmos para optimizar la secuencia de movimientos del robot y reducir el tiempo de ejecución.
*   **Gestión de Usuarios**: Autenticación y perfiles de usuario para guardar configuraciones y protocolos personalizados.
