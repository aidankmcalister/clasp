import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import * as React from 'react';
import appCss from '@/styles/app.css?url';
import { RootProvider } from 'fumadocs-ui/provider/tanstack';

// Runs synchronously before the browser paints. Reads the stored theme (or
// prefers-color-scheme as a fallback) and applies the `.dark` class on <html>
// up front, so dark-mode users don't see a flash of light bg on refresh.
const noFlashScript = `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;d?r.classList.add('dark'):r.classList.remove('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'clasp — lightweight signed webhooks for TypeScript',
      },
      {
        name: 'description',
        content:
          'A tiny, opinionated TypeScript library for sending and receiving signed webhooks. Zero dependencies.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  component: RootComponent,
});

function RootComponent() {
  return (
    <html suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: anti-FOUC inline script
          dangerouslySetInnerHTML={{ __html: noFlashScript }}
        />
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
