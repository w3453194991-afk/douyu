import React from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/zcool-kuaile/400.css';
import '@fontsource/baloo-2/latin-600.css';
import '@fontsource/baloo-2/latin-700.css';
import '@fontsource/baloo-2/latin-800.css';
import './styles.css';
import './lib/devtools';
import App from './App';

createRoot(document.getElementById('root')!).render(<App />);
