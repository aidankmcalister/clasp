import { createFileRoute, Link } from '@tanstack/react-router';
import { DynamicCodeBlock } from 'fumadocs-ui/components/dynamic-codeblock';
import { HomeLayout } from 'fumadocs-ui/layouts/home';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { baseOptions } from '@/lib/layout.shared';

export const Route = createFileRoute('/')({
  component: Home,
});

const install = `bun add clasp-sh`;

const usage = `import { clasp } from "clasp-sh";

const webhooks = clasp({ secret });

// outgoing
await webhooks.send(url, {
  type: "user.created",
  data,
});

// incoming
const event = await webhooks.verify(request);`;

const codeOptions = {
  themes: {
    light: 'min-light' as const,
    dark: 'vesper' as const,
  },
};

function ActionLink({
  href,
  to,
  external,
  children,
}: {
  href?: string;
  to?: string;
  external?: boolean;
  children: React.ReactNode;
}) {
  const Arrow = external ? ArrowUpRight : ArrowRight;
  const arrowMotion = external
    ? 'group-hover:translate-x-0.5 group-hover:-translate-y-0.5'
    : 'group-hover:translate-x-[3px]';

  const inner = (
    <>
      <span className="relative inline-block pb-[2px] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-page-faint after:transition-colors after:duration-[220ms] group-hover:after:bg-page-ink">
        {children}
      </span>
      <Arrow
        size={11}
        strokeWidth={1.75}
        aria-hidden
        className={`text-page-faint transition-all duration-150 group-hover:text-page-ink ${arrowMotion}`}
      />
    </>
  );

  const linkClass =
    'group inline-flex items-center gap-2 py-1 text-[13px] text-page-ink transition-colors duration-[220ms]';

  if (to) {
    return (
      <Link to={to} params={{ _splat: '' }} className={linkClass}>
        {inner}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={linkClass}
    >
      {inner}
    </a>
  );
}

function Home() {
  return (
    <HomeLayout {...baseOptions()}>
      <main className="mx-auto w-full max-w-[1080px] animate-fade px-5 pt-14 pb-12 md:px-12 md:pt-32 md:pb-32">
        {/* Hero — text left, code right */}
        <div className="grid gap-10 md:grid-cols-[5fr_6fr] md:items-start md:gap-16">
          {/* Left: heading + copy + action links */}
          <div>
            <h1 className="font-medium text-[22px] leading-[1.25] tracking-[-0.018em] md:text-[28px] md:leading-[1.3]">
              Send a webhook. Receive a webhook.
            </h1>

            <p className="mt-6 max-w-[40ch] text-[14px] text-page-mid leading-[1.75]">
              An open source tool for webhooks. No accounts, no dashboards, no
              vendor, no bill.
            </p>

            <div className="mt-8">
              <DynamicCodeBlock
                lang="bash"
                code={install}
                options={codeOptions}
              />
            </div>

            <nav className="mt-8 flex flex-wrap gap-x-6 gap-y-1">
              <ActionLink to="/docs/$">docs</ActionLink>
              <ActionLink
                href="https://github.com/aidankmcalister/clasp"
                external
              >
                github
              </ActionLink>
              <ActionLink
                href="https://www.npmjs.com/package/clasp-sh"
                external
              >
                npm
              </ActionLink>
            </nav>
          </div>

          {/* Right: hero code block */}
          <div>
            <DynamicCodeBlock lang="ts" code={usage} options={codeOptions} />
          </div>
        </div>

        <div className="mt-12 h-px w-full bg-page-border-soft md:mt-20" />

        <dl className="mt-8 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 md:mt-10 md:grid-cols-4 md:gap-x-12">
          <Stat label="License" value="MIT" />
          <Stat label="Size" value="1.76 KB gzipped" />
          <Stat label="Dependencies" value="Zero" />
          <Stat
            label="Spec"
            value={
              <a
                href="https://www.standardwebhooks.com/"
                target="_blank"
                rel="noreferrer"
                className="group relative inline-flex items-center gap-1 text-page-ink"
              >
                <span className="relative pb-[1px] after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-page-faint after:transition-colors after:duration-[220ms] group-hover:after:bg-page-ink">
                  Standard Webhooks
                </span>
                <ArrowUpRight
                  size={10}
                  strokeWidth={1.75}
                  aria-hidden
                  className="text-page-faint transition-all duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-page-ink"
                />
              </a>
            }
          />
        </dl>
      </main>
    </HomeLayout>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <dt className="mb-1.5 text-[10.5px] text-page-muted uppercase tracking-[0.08em]">
        {label}
      </dt>
      <dd className="text-[13px] text-page-ink">{value}</dd>
    </div>
  );
}
