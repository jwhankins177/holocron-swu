'use client';
import {useEffect,useRef,type ReactNode} from 'react';

/** Native modal semantics keep the rest of the document inert and trap focus. */
export default function Modal({children,onDismiss,label}:{children:ReactNode;onDismiss:()=>void;label:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current!;
  const focusBefore=document.activeElement instanceof HTMLElement?document.activeElement:null;
  const y=window.scrollY,x=window.scrollX;
  const body=document.body;
  const original={position:body.style.position,top:body.style.top,left:body.style.left,width:body.style.width,overflow:body.style.overflow,paddingRight:body.style.paddingRight};
  const gutter=window.innerWidth-document.documentElement.clientWidth;
  if(gutter>0)body.style.paddingRight=`${parseFloat(getComputedStyle(body).paddingRight)+gutter}px`;
  Object.assign(body.style,{position:'fixed',top:`-${y}px`,left:`-${x}px`,width:'100%',overflow:'hidden'});
  dialog.showModal();
  return()=>{
   dialog.close();
   Object.assign(body.style,original);
   window.scrollTo(x,y);
   if(focusBefore?.isConnected)focusBefore.focus({preventScroll:true});
  };
 },[]);
 return <dialog ref={ref} className="overlay modal-layer" aria-label={label} onKeyDown={e=>{
  if(e.key!=='Tab')return;
  const items=Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])')).filter(el=>el.getClientRects().length>0);
  const first=items[0],last=items[items.length-1];
  if(!first){e.preventDefault();return}
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
  else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
 }} onCancel={e=>{e.preventDefault();onDismiss()}} onClick={e=>{if(e.target===e.currentTarget)onDismiss()}}>{children}</dialog>;
}
