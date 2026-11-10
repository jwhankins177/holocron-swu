import type {Metadata} from 'next';
import '../modern/styles.css';
import '../modern/tuning.css';
import '../modern/palettes.css';
export const metadata:Metadata={title:'Holocron · Your SWU collection',description:'Your Star Wars Unlimited collection, decks, lists and guides.',manifest:'/manifest.webmanifest',icons:{icon:[{url:'/holocron-icon-v19.svg',type:'image/svg+xml'},{url:'/holocron-icon-v19-192.png',sizes:'192x192',type:'image/png'}],apple:[{url:'/apple-touch-icon-v19.png',sizes:'180x180',type:'image/png'}]},appleWebApp:{capable:true,title:'Holocron',statusBarStyle:'black-translucent'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
