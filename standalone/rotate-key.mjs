import {readFile,rename,writeFile} from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
import {join} from 'node:path';

const data=process.env.HOLOCRON_DATA_DIR||join(process.env.LOCALAPPDATA||'.','Holocron');
try{
 const reply=await fetch('http://127.0.0.1:8765/',{signal:AbortSignal.timeout(1000)});
 if(reply.ok)throw Error('Stop start.cmd before rotating the key, then run this command again.');
}catch(error){if(error.message.startsWith('Stop start.cmd'))throw error}
const path=join(data,'server.json');
const config=JSON.parse(await readFile(path,'utf8'));
if(typeof config.serverId!=='string'||typeof config.key!=='string')throw Error('Invalid server configuration. No changes made.');
config.key=randomBytes(24).toString('base64url');
const temp=path+'.new';
await writeFile(temp,JSON.stringify(config,null,2),{flag:'wx',mode:0o600});
await rename(temp,path);
console.log('New pairing key: '+config.key);
console.log('Restart start.cmd. Use Home sync → Update key on each device.');
