import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import SyncTools from '../modern/SyncTools';
import OfflineTools from '../modern/OfflineTools';
import './offline.css';
window.__HOLOCRON_STANDALONE__=true;
createRoot(document.getElementById('root')!).render(<><Home/>{!window.webkit?.messageHandlers?.holocron&&<><SyncTools/><OfflineTools/></>}</>);
