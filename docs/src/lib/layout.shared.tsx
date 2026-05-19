import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: appName,
    },
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
    links: [
      {
        type: "icon",
        label: "Visit npm", // `aria-label`
        icon: (
          <svg
            viewBox="0 0 512 512"
            xmlns="http://www.w3.org/2000/svg"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          >
            <path d="M10.999 500.999v-490h490v490h-490zM102.874 102.874h306.25v306.25h-61.25v-245h-91.875v245H102.874v-306.25z" />
          </svg>
        ),
        text: "npm",
        url: "https://www.npmjs.com/package/clasp-sh",
      },
    ],
  };
}
