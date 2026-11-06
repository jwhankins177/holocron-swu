import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import OfflineTools from './OfflineTools';
import catalog from '../catalog-source.json';
import './styles.css';
window.__HOLOCRON_CATALOG__=catalog as import('./lib/model').Catalog;
createRoot(document.getElementById('root')!).render(<><App/><OfflineTools/></>);
