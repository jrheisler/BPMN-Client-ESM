# Flow Control Center

Flow Control Center is a browser‑based BPMN modeling and simulation client. It uses [bpmn‑js](https://github.com/bpmn-io/bpmn-js) for diagram editing and Firebase for authentication and storage. Diagrams can be simulated token by token and saved along with notes and version history.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Firebase**
   Copy the example configuration and fill in your Firebase project credentials:
   ```bash
   cp public/js/firebase.example.js public/js/firebase.js
   ```
   Edit `public/js/firebase.js` to replace the placeholder values and initialize Firebase with your project's settings:
   ```js
   // public/js/firebase.js
   export const firebaseConfig = { /* your real config */ };
   firebase.initializeApp(firebaseConfig);
   ```
3. **Serve the app**
   Serve the `public/` directory using your preferred static server (e.g. `npx http-server public` or `firebase serve`).
4. **Run tests** *(optional but recommended)*
   ```bash
   npm test
   ```

## Saving diagrams and notes

1. Log in via the in‑app dialog.
2. Create or open a diagram.
3. Click the **💾 Save** button.
4. Provide a diagram name and optional notes when prompted.
5. Each save stores a new version in Firestore, preserving the diagram XML, notes, and add‑on configuration.
6. Use the “Select or New Diagram” option to reload or start fresh.

## RACI role assignments

Tasks and other flow elements support RACI metadata to capture
responsible, accountable, consulted and informed roles.

### Assigning roles in the sidebar

1. Select a task or other flow element in the diagram.
2. Open the property sidebar (right‑hand panel).
3. Enter one or more identifiers in the **Responsible**, **Accountable**,
   **Consulted** and **Informed** fields.
4. Close the sidebar or click away to persist the values.

### Viewing the RACI matrix

Click the **RACI Matrix** button in the top toolbar to open a modal
showing a table of all elements and their assigned roles.

### XML representation

RACI entries are stored as extension elements in the BPMN XML. A task
with all four roles specified looks like this:

```xml
<bpmn:task id="Task_1">
  <bpmn:extensionElements>
    <custom:raci responsible="alice"
                 accountable="bob"
                 consulted="carol"
                 informed="dave" />
  </bpmn:extensionElements>
</bpmn:task>
```

## Repository structure

- `public/` – front‑end assets and scripts
- `docs/` – documentation resources
- `test/` – automated tests using Node's built‑in test runner
- `sample*.bpmn` – example diagrams

## License

This project is licensed under the MIT License.
