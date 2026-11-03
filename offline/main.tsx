import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import catalog from '../public/catalog.json';
import './offline.css';
window.__HOLOCRON_CATALOG__=catalog as import('../lib/model').Catalog;
createRoot(document.getElementById('root')!).render(<Home/>);
