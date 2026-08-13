import {ReactNode} from 'react';
import EmptyState from './EmptyState';
export type Column<T>={key:string;header:string;render:(row:T)=>ReactNode};
export default function DataTable<T extends object>({rows,columns}:{rows:T[];columns:Column<T>[]}){
  if(!rows.length)return <EmptyState title="No records found"/>;
  return <div className="table"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.header}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={String(('id' in row ? row.id : undefined)??i)}>{columns.map(c=><td key={c.key}>{c.render(row)}</td>)}</tr>)}</tbody></table></div>;
}
