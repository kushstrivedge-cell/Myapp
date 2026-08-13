import {isRouteErrorResponse,useRouteError} from 'react-router-dom';
export default function ErrorPage(){const e=useRouteError();return <main className="centred"><h1>Something went wrong</h1><p>{isRouteErrorResponse(e)?e.statusText:e instanceof Error?e.message:'The admin page could not be displayed.'}</p><a href="/dashboard">Return to dashboard</a></main>}
