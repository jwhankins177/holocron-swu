import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import SyncTools from '../modern/SyncTools';
import OfflineTools from '../modern/OfflineTools';
import './offline.css';
window.__HOLOCRON_STANDALONE__=true;
const loopback=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
createRoot(document.getElementById('root')!).render(<><Home/>{!window.webkit?.messageHandlers?.holocron&&<><SyncTools/>{!loopback&&<OfflineTools/>}</>}</>);
