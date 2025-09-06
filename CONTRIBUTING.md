# Contributing to Flow Control Center

Thanks for your interest in improving this project! The guidelines below help maintain a consistent and collaborative workflow.

## Coding standards

- Use **2 spaces** for indentation and terminate statements with semicolons.
- Favor modern, vanilla JavaScript; avoid transpilers.
- Keep functions small and documented when behavior is non‑obvious.
- Run the test suite before committing:
   ```bash
   npm test
   ```

## Pull request process

1. Fork the repository and create a feature branch.
2. Make focused changes with clear commit messages.
3. Ensure `npm test` passes and add tests for new behavior when possible.
4. Update documentation and sample diagrams if your change affects them.
5. Open a pull request describing the motivation and highlighting any diagrams or notes that reviewers should look at.

## Collaborating on diagrams and notes

- Use the in‑app **Save** workflow to store diagrams. Each save captures the BPMN XML, add‑ons, and optional notes.
- Provide descriptive names and notes so others can understand the purpose of each diagram.
- Share diagrams with collaborators by exporting the `.bpmn` file or by saving to a shared Firebase project.
- When editing a shared diagram, update the notes with a brief summary of your changes to keep the version history useful.

We appreciate your contributions!
