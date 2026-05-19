import { defineConfig, defineDocs } from "fumadocs-mdx/config";
import { rehypeCode, type RehypeCodeOptions } from "fumadocs-core/mdx-plugins";

const rehypeCodeOptions: RehypeCodeOptions = {
  themes: {
    light: "ayu-light",
    dark: "ayu-dark",
  },
};

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export default defineConfig({
  mdxOptions: {
    rehypePlugins: [[rehypeCode, rehypeCodeOptions]],
  },
});
