import { createFileRoute, Link } from "@tanstack/react-router";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { baseOptions } from "@/lib/layout.shared";

export const Route = createFileRoute("/")({
  component: Home,
});

const code = `import { send, verify } from "clasp-sh";

// send a signed webhook
await send({
  secret,
  url: "https://example.com/webhook",
  event: { type: "user.created", data },
});

// verify a signed webhook
const event = await verify({ secret, request });`;

function Home() {
  return (
    <HomeLayout {...baseOptions()} links={[{ text: "Docs", url: "/docs" }]}>
      <main className="mx-auto w-full max-w-5xl px-6 pt-32 pb-48 md:pt-48 md:pb-48">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Webhook signing
              <br />
              <span className="text-fd-muted-foreground">
                in two functions.
              </span>
            </h1>

            <p className="mt-4 text-fd-muted-foreground text-[15px] leading-relaxed max-w-md">
              HMAC-SHA256 signing and verification in two functions.{" "}
              <a
                href="https://www.standardwebhooks.com/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fd-foreground transition-colors"
              >
                Standard Webhooks
              </a>{" "}
              spec. No vendor, no dependencies, no bill.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <div className="min-w-[220px]">
                <DynamicCodeBlock
                  lang="bash"
                  code="npm i clasp-sh"
                  options={{
                    themes: {
                      light: "ayu-light",
                      dark: "ayu-dark",
                    },
                  }}
                />
              </div>
              <Link
                to="/docs/$"
                params={{ _splat: "" }}
                className="text-sm font-medium text-fd-primary transition-colors hover:underline hover:underline-offset-4 decoration-skip-none shrink-0"
              >
                Docs <span aria-hidden>→</span>
              </Link>
            </div>
          </div>

          <DynamicCodeBlock
            lang="ts"
            code={code}
            options={{
              themes: {
                light: "ayu-light",
                dark: "ayu-dark",
              },
            }}
          />
        </div>
      </main>
    </HomeLayout>
  );
}
