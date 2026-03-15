# IT-Slider

IT-Slider is a TypeScript-based interactive tool for planning IT resource allocation using a radar chart. It allows users to visualize and balance budgets across different IT dimensions like "Tagesgeschäft", "Digitalisierung", and "KI".

## 🚀 Features

- **Interactive Radar Chart**: Visualize resource allocation in real-time using [Chart.js](https://www.chartjs.org/).
- **Dynamic Balancing**: Sliders to adjust values with logic to maintain total budget constraints.
- **Locking Mechanism**: Support for min-lock and full-lock states for specific dimensions.
- **History Tracking**: Undo/Redo functionality for planning states.

## 📋 Requirements

- **Deno** (latest recommended)
- **Web Browser** (Chrome, Firefox, or Edge)

## 🛠️ Setup & Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd IT-Slider
   ```

## 🏗️ Building the Project

The project uses Deno tasks for building and bundling.

Run the TypeScript compiler:
```bash
deno task build
```

Bundle into a single file:
```bash
deno task bundle
```

## 🏃 Running the Application

After building the project, open `it-slider.html` in your web browser:

- Double-click `it-slider.html` in your file explorer.
- Or use a local server (e.g., Live Server extension in an IDE).

## 📜 Scripts

Currently defined scripts in `deno.json`:

| Task | Description |
| :--- | :--- |
| `build` | Compiles TypeScript to JavaScript using tsc. |
| `bundle` | Inlines CSS and JS into a single `bundle.html`. |
| `bundle-min` | Creates a minified `bundle.min.html` including external libraries. |
| `check` | Verifies DOM IDs match between app.ts and HTML. |
| `test` | Runs unit tests for domain logic. |

```bash
deno task <task_name>
```

## 🧪 Testing

### Static Integrity Check
Run the `check` task to ensure DOM elements in `app.ts` match `it-slider.html`.
```bash
deno task check
```

### Unit Testing
Run unit tests for core domain logic using Deno's built-in test runner:
```bash
deno task test
```

## 📂 Project Structure

- `src/`: Contains source code and assets.
  - `app.ts`: Main application logic.
  - `domain.ts`: Core domain logic.
  - `config.ts`: Configuration data.
  - `it-slider.html`: Main HTML entry point.
  - `style.css`: Application styling.
- `scripts/`: Contains build and maintenance scripts.
  - `bundle.ts`: Single-file bundling script.
  - `check_integrity.ts`: DOM integrity verification script.
- `dist/`: Compiled JavaScript output (generated after build).
- `bundle.html`: Self-contained version of the application (generated after bundle).
- `deno.json`: Deno configuration and tasks.

## 🚀 Releases

The project automatically generates standalone HTML bundles on every new version tag (`v*`). 
You can find the latest `bundle.html` (standard) and `bundle.min.html` (fully self-contained & minified) in the [GitHub Releases](https://github.com/nicolas-it/IT-Slider/releases) section.

## 📄 License

This project is licensed under the **ISC License**.

---

*Generated as part of IT-Slider project documentation.*
