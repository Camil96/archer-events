// Legacy React entrypoint.
// De productie-runtime gebruikt `index.html -> src/main.js -> src/appShell.js`.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
