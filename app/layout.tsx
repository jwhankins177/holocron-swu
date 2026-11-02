import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'Holocron · Your SWU collection',description:'Your cards. Your decks. A private Star Wars Unlimited collection and deck workshop.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
