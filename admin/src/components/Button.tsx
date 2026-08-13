import {ButtonHTMLAttributes,ReactNode} from 'react';
export default function Button({children,variant='primary',busy=false,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{children:ReactNode;variant?:'primary'|'secondary'|'danger';busy?:boolean}){
  return <button {...props} disabled={busy||props.disabled} className={`button button-${variant} ${props.className??''}`}>{busy?'Working…':children}</button>;
}
