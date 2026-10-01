# Agent Guidelines

## Git Commit & Push Policy

1. **Explicit Approval Required**:
   - **NEVER** run `git commit` without explicit approval from the user.
   - **NEVER** run `git push` without explicit approval from the user.

2. **Commit Request & Preview Protocol**:
   When changes are ready to be committed, you must present a review to the user including:
   - **Staged Changes Summary**: List of modified/added/deleted files (e.g., `git status -s`).
   - **Proposed Commit Message**: The exact commit message to be used (following Conventional Commits format).
   - **Explicit Request**: Ask the user for confirmation before running `git commit`.

3. **Remote Push Protocol**:
   - After commits are made, do not push to any remote repository unless the user explicitly requests or confirms a push.
