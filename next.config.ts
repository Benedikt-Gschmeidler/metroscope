import type { NextConfig } from "next";

const isGithubActions = process.env.GITHUB_ACTIONS || false;

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  output: 'export', 
  basePath: isGithubActions ? '/metroscope' : '', 
  env: {
    NEXT_PUBLIC_BASE_PATH: isGithubActions ? '/metroscope' : '',
  }
};

export default nextConfig;
