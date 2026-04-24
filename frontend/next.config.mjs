import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use this app as Turbopack root when other lockfiles exist elsewhere on the machine
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
