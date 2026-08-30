import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // src/pages/ holds component files, not Next.js Pages Router pages
  pageExtensions: ['tsx', 'ts'],

  /**
   * Emit a self-contained server bundle for the container image.
   *
   * Without this the runtime image has to carry the whole `node_modules` tree —
   * the AWS SDK alone is most of it. `standalone` traces what the server
   * actually imports and copies only that, which is the difference between an
   * image around 200 MB and one over a gigabyte.
   */
  output: 'standalone',

  // The image is built once and run anywhere, so the version has to come from
  // the build rather than from a file read at runtime.
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.npm_package_version ?? '0.0.0',
  },
};

export default nextConfig;
