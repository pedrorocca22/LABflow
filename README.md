# Labflow

> **Disclaimer: This software is currently a beta version and is still under active development. Features and performance are subject to change.**

Labflow is an advanced web platform designed for the orchestration, simulation, and execution of liquid handling protocols in automated laboratory environments. With a deep focus on mathematical precision and efficiency, Labflow eliminates the friction of programming complex routines for pipetting robots, offering a highly interactive and automated environment.

## ✨ System Capabilities and Features

### 🧪 Dynamic Deck Configuration
* **Spatial Bay Manager:** Interactive graphical interface to arrange instruments on a 6-bay deck grid.
* **Universal Labware Support:** Native support for microplates (e.g., 96-well), reagent reservoirs, and TipRacks, standardized for precise positioning.
* **Advanced Matrix Selection:** Configure wells individually or using a drag-and-drop "lasso" selection, allowing the outlining of complete pipetting patterns in seconds.

### 🤖 Automated Assistants (Wizards)
The system includes pre-programmed workflows (wizards) aimed at accelerating the creation of highly standardized laboratory protocols without requiring step-by-step manual configuration:
* **ELISA Assay:** Automates antigen additions, blocking, successive washes, and substrate reading.
* **AlamarBlue:** Preconfigures cell viability routines and fluorophore dosing.
* **Serial Dilutions:** Mathematical assistant to parametrically propagate concentrations across a plate.

### 🧬 Intelligent Protocol Engine
* **Mathematical Fluid Simulator:** Calculates the liquid volume in each well and reservoir in *real-time* as the protocol steps progress, predictively alerting about reagent shortages or overflows.
* **Visual Step Sequencer:** Structured workflow to organize and edit logical parameters.
* **Complete Primitive Operations:** Atomic control over all possible robot actions:
  * **Transfer:** 1-to-1 volume movement.
  * **Distribute:** Dosing from 1 source to N destinations.
  * **Consolidate:** Grouping from N sources to 1 destination.
  * **Aspirate:** Extraction for waste disposal.
  * **Wash:** Automated cycles of addition and removal.
  * **Mix:** Repeated aspiration/dispensation cycles in the same well.
  * **Pause:** Temporary system halt by a timer or until manual user confirmation.
  * **Comment:** Text notes injected into the sequence.

### ⚙️ G-Code Generation and Direct Control
* **Kinematic Translator:** Automatically converts the sequence of logical steps into standardized G-Code toolpaths.
* **Native Integration (Klipper-ready):** Ability to connect directly to 3D printer or robot control firmware (such as Klipper) for the direct and remote injection of generated commands.
* **JSON Export:** Ability to store and share logical protocols in a portable format.

## 🚀 Architecture and Technologies
This system is completely agnostic to the underlying hardware of the motors, focusing purely on automation logic and the control interface:

- **Frontend:** React + Vite
- **Global State:** Zustand (Immutable and ultra-fast management of mathematical simulations).
- **Styling:** Tailwind CSS

## 📦 Installation and Local Development

To deploy Labflow locally in development mode:

1. **Clone the repository** and navigate to the project folder.
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Start the development server**:
   ```bash
   npm run dev
   ```
4. Navigate to the local URL (default `http://localhost:5173`) in your web browser.
