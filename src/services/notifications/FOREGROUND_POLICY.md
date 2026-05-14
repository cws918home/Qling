# Notification Foreground Policy

Server push is best-effort and audited through `pushLogs`.

Foreground UI and Firestore read-model state are the source of truth. When the app is open, UI should not show duplicate toasts for events that are already reflected by live Firestore/read-model updates.

Permission denied or no available token is not a delivery failure. The core mutation remains successful, and the user can see the updated read model when they open the app.
