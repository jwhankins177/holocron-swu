import {readFile} from 'node:fs/promises';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({root:new URL('.',import.meta.url).pathname,base:'./',plugins:[{name:'offline-catalog',enforce:'pre',async load(id){if(id===new URL('../public/catalog.json',import.meta.url).pathname)return await readFile(new URL('./catalog.json',import.meta.url),'utf8')}},react()],build:{outDir:'../native/ios/Holocron/Web',emptyOutDir:true}});
