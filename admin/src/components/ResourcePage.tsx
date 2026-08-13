import {ReactNode,useCallback,useEffect,useMemo,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {get} from '../api';import Button from './Button';import DataTable,{Column} from './DataTable';import SearchInput from './SearchInput';import Skeleton from './Skeleton';import Toast,{ToastMessage} from './Toast';
export default function ResourcePage<T extends {id?:unknown}>({endpoint,columns,searchText,children,title='Live management'}:{endpoint:string;columns:Column<T>[];searchText:(row:T)=>string;children?:(args:{rows:T[];reload:()=>Promise<void>;notify:(m:ToastMessage)=>void})=>ReactNode;title?:string}){
 const [rows,setRows]=useState<T[]>([]),[loading,setLoading]=useState(true),[query,setQuery]=useState(''),[toast,setToast]=useState<ToastMessage|null>(null);
 const load=useCallback(async()=>{setLoading(true);try{setRows(await get<T[]>(endpoint))}catch(e){setToast({kind:'error',text:e instanceof Error?e.message:'Could not load data'})}finally{setLoading(false)}},[endpoint]);
 useEffect(()=>{void load()},[load]);const filtered=useMemo(()=>rows.filter(r=>searchText(r).toLowerCase().includes(query.toLowerCase())),[rows,query,searchText]);
 return <section><div className="section-head"><div><h2>{title}</h2><p>Changes use the existing administrator-only API.</p></div><div className="toolbar"><SearchInput value={query} onChange={setQuery}/><Button variant="secondary" onClick={()=>void load()}><RefreshCw size={15}/>Refresh</Button></div></div>{children?.({rows:filtered,reload:load,notify:setToast})}{loading?<Skeleton/>:<DataTable rows={filtered} columns={columns}/>}<Toast message={toast} onClose={()=>setToast(null)}/></section>
}
