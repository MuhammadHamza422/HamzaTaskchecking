import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext.jsx";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { persistor, store } from "./store/index.js";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always",
      refetchOnMount: false,
      retry: 1,               // fail fast(ish)
      staleTime: 60 * 1000,   // data considered fresh for 1 min
      gcTime: 5 * 60 * 1000,  // cache garbage-collected after 5 min (v5: gcTime)
    },
    mutations: {
      retry: 0, 
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <App />
          </PersistGate>
        </Provider>
      </AuthProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
