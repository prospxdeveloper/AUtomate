import React from 'react';
import ReactDOM from 'react-dom/client';
import Sidepanel from './Sidepanel';
import '@/styles/globals.css';
import { AnalyticsProvider } from '@/analytics/AnalyticsProvider';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AnalyticsProvider>
      <Sidepanel />
    </AnalyticsProvider>
  </React.StrictMode>
);
