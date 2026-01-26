import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { useEffect, useState } from "react";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  { rel: "manifest", href: "/manifest.webmanifest" },
  { rel: "icon", href: "/favicon.ico" },
  { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState({
    version: "v0.0.1",
    productName: "RUSH IELTS",
    author: "Percival",
    email: "fengyi.mail@gmail.com"
  });

  useEffect(() => {
    fetch("/config.json")
      .then(res => res.json())
      .then(data => {
        if (data) {
          setConfig({
            version: `v${data.version}`,
            productName: data.productName || "RUSH IELTS",
            author: data.author || "Percival",
            email: data.email || "fengyi.mail@gmail.com"
          });
        }
      })
      .catch(() => { /* ignore error, use defaults */ });
  }, []);

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563EB" />
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-50 dark:bg-gray-900">
        <div className="flex flex-col min-h-screen">
          <div className="flex-grow flex flex-col">
            {children}
          </div>
          <footer className="py-6 text-center text-gray-400 text-sm border-t border-gray-100 dark:border-gray-800">
            <p className="font-semibold text-gray-500 dark:text-gray-400">{config.productName} <span className="text-xs font-normal opacity-70">{config.version}</span></p>
            <p className="mt-1">
              Created by <span className="font-medium text-gray-600 dark:text-gray-300">{config.author}</span>
            </p>
            <a href={`mailto:${config.email}`} className="mt-1 inline-block hover:text-blue-500 transition-colors">
              {config.email}
            </a>
          </footer>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}