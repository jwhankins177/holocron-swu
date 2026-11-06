import {APP_BUILD,APP_VERSION} from '../../../modern/lib/version';

export const dynamic='force-dynamic';
export function GET(){
 return Response.json({version:APP_BUILD,appVersion:APP_VERSION},{headers:{'Cache-Control':'no-store, max-age=0'}});
}
