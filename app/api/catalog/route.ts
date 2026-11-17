import {env} from 'cloudflare:workers';
import {catalogSnapshot} from '../../../server/catalog-refresh';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await catalogSnapshot(env.DB),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Catalog is unavailable. Use the bundled catalog and try again.'},{status:503})}}
