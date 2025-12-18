import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '@/styles/globals.css';
import { AnalyticsProvider } from '@/analytics/AnalyticsProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AnalyticsProvider>
      <Popup />
    </AnalyticsProvider>
  </React.StrictMode>
);
