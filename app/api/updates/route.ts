import {env} from 'cloudflare:workers';
import {refreshCatalog,updateStatus} from '../../../server/catalog-refresh';
export const dynamic='force-dynamic';
export async function GET(){try{return Response.json(await updateStatus(env.DB),{headers:{'Cache-Control':'no-store'}})}catch{return Response.json({error:'Update status is unavailable.'},{status:503})}}
// This shared writer relies on the confirmed owner-private Sites access boundary.
// Dispatch authenticates browser visitors or consumes OAI-Sites-Authorization service access.
// Service calls deliberately have no visitor identity. It never reads/writes workspaces.
// Before changing this Site to public/shared, add owner authorization to this endpoint.
export async function POST(request:Request){
 const origin=request.headers.get('Origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Cross-origin updates are not allowed.'},{status:403});
 if(!env.DB)return Response.json({error:'Database unavailable.'},{status:503});
 let action:'refresh'|'rollback'='refresh';try{const body=await request.text();if(body.length>1000)return Response.json({error:'Request too large.'},{status:413});if(body){const parsed=JSON.parse(body);if(parsed.action!==undefined&&!['refresh','rollback'].includes(parsed.action))throw Error();action=parsed.action??'refresh'}}catch{return Response.json({error:'Invalid update request.'},{status:400})}
 try{return Response.json(await refreshCatalog(env.DB,action),{headers:{'Cache-Control':'no-store'}})}catch(error){return Response.json({error:error instanceof Error?error.message:'Update failed; previous data is retained.'},{status:503})}
}
