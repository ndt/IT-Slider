# IT-Slider

IT-Slider is a TypeScript-based interactive tool for planning IT resource allocation using a radar chart. It allows users to visualize and balance budgets across different IT dimensions like "Tagesgeschäft", "Digitalisierung", and "KI".

## 🚀 Features

- **Interactive Radar Chart**: Visualize resource allocation in real-time using [Chart.js](https://www.chartjs.org/).
- **Dynamic Balancing**: Sliders to adjust values with logic to maintain total budget constraints.
- **Locking Mechanism**: Support for min-lock and full-lock states for specific dimensions.
- **History Tracking**: Undo/Redo functionality for planning states.

## 📋 Requirements

- **Node.js** (latest LTS recommended)
- **npm** or **yarn**
- **Web Browser** (Chrome, Firefox, or Edge)

## 🛠️ Setup & Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd IT-Slider
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

## 🏗️ Building the Project

Since this project is written in TypeScript, it needs to be transpiled to JavaScript for the browser.

Run the TypeScript compiler:
```bash
npx tsc
```

This will generate `app.js` based on the configuration in `tsconfig.json`.

## 🏃 Running the Application

After building the project, open `it-slider.html` in your web browser:

- Double-click `it-slider.html` in your file explorer.
- Or use a local server (e.g., Live Server extension in an IDE).

## 📜 Scripts

Currently defined scripts in `package.json`:

| Script | Description |
| :--- | :--- |
| `test` | Placeholder for testing (not yet implemented). |

To compile TypeScript manually:
```bash
npx tsc
```

## 🧪 Testing

Testing infrastructure is partially defined in the project guidelines.

### Static Integrity Check (TODO)
The guidelines mention a `check_integrity.py` script to ensure DOM elements in `app.ts` match `it-slider.html`.
- **Status**: TODO - Script currently missing from repository.

### Unit Testing (TODO)
Recommended setup with **Jest**:
1. Install Jest and ts-jest:
   ```bash
   npm install --save-dev jest ts-jest @types/jest jsdom @types/jsdom
   ```
2. Configure `jest.config.js`.
3. Create `app.test.ts`.

## 📂 Project Structure

- `app.ts`: Main application logic (TypeScript source).
- `app.js`: Compiled JavaScript output.
- `it-slider.html`: Main HTML entry point.
- `style.css`: Application styling.
- `tsconfig.json`: TypeScript configuration.
- `package.json`: Project dependencies and metadata.
- `main.py`: Default PyCharm script (can be removed if unused).

## 📄 License

This project is licensed under the **ISC License** (see `package.json`).

---

*Generated as part of IT-Slider project documentation.*
