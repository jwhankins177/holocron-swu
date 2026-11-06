import type {Metadata} from 'next';
import '../modern/styles.css';
import '../modern/tuning.css';
export const metadata:Metadata={title:'Holocron · Your SWU collection',description:'Your Star Wars Unlimited collection, decks, lists and guides.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
