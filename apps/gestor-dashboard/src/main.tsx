import "./index.css"; // TEM que ser a primeira importação

import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { DateRangeProvider } from "@/context/DateRangeContext";

class ErrorBoundary extends React.Component<{children:React.ReactNode},{error:Error|null}>{
  constructor(p:any){super(p);this.state={error:null}}
  static getDerivedStateFromError(error:Error){return {error}}
  componentDidCatch(e:Error, info:any){console.error("App runtime error:", e, info)}
  render(){return this.state.error
    ? <div style={{padding:24,fontFamily:"system-ui,sans-serif"}}>
        <h1>App load error ❌</h1>
        <pre style={{whiteSpace:"pre-wrap"}}>{this.state.error.message}</pre>
        <p>Veja o <b>Console</b> e a aba <b>Network</b>.</p>
      </div>
    : this.props.children}
}

const LazyApp = React.lazy(() =>
  import("./App.tsx").then((m) => ({ default: m.default ?? m.App }))
);

const root = document.getElementById("root");
if (!root) console.error("Elemento #root não encontrado no index.html");

ReactDOM.createRoot(root!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Suspense fallback={<div className="p-3 text-sm">Carregando App…</div>}>
        <DateRangeProvider>
          <LazyApp />
        </DateRangeProvider>
      </Suspense>
    </ErrorBoundary>
  </React.StrictMode>
);
