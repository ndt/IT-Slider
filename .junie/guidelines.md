# IT-Slider Development Guidelines

This document provides essential information for developers working on the IT-Slider project.

## 1. Build and Configuration

### Requirements
- **Node.js** (latest LTS recommended)
- **npm** or **yarn**
- **TypeScript** (v5.0+)

### Setup
1. Clone the repository and navigate to the project root.
2. Install dependencies:
   ```bash
   npm install
   ```

### Compiling TypeScript
The project uses TypeScript for core logic. To transpile `.ts` files to `.js`:
```bash
npm run build
# OR
npx tsc
```
This will update `app.js`, `domain.js`, and `config.js` based on `tsconfig.json`.

## 2. Testing

### Unit Testing (Jest)
The core logic in `domain.ts` is tested using Jest.
- **Run all tests:**
  ```bash
  npm test
  ```
- **Configuration:** `jest.config.js` is set up with `ts-jest` to handle TypeScript files in a `jsdom` environment.
- **Test Files:** Follow the `.test.ts` naming convention (e.g., `domain.test.ts`).

### Static Integrity Check
A Python script is used to ensure that DOM elements referenced in `app.ts` exist in `it-slider.html`.
- **Run integrity check:**
  ```bash
  python check_integrity.py
  ```

### Adding New Tests
When adding new domain logic, create a corresponding test in `domain.test.ts`. Use standard Jest `describe`/`it` blocks and `expect` assertions.

## 3. Additional Development Information

### Code Style & Architecture
- **Strict Typing:** Always use specific types for DOM elements (e.g., `HTMLInputElement`).
- **Domain Separation:** Business logic (balancing, locking) is encapsulated in `domain.ts`. UI-specific logic remains in `app.ts`.
- **Configurable Dimensions:** The application's initial state is defined in `config.ts`.

### Balancing Algorithm
The `DimensionList.balance()` method in `domain.ts` is the heart of the budget allocation logic. It iteratively adjusts non-locked dimensions to maintain a fixed total budget. Any changes to this algorithm must be verified with unit tests to prevent regressions in locking behavior.

### Debugging
- Use the browser's developer console to inspect the `planner` instance (if exposed globally during development).
- Check the console for "Integrity check passed" or error messages regarding missing DOM elements.
