import type { Plugin } from "vite";
import fs from "fs";
import path from "path";

/**
 * Vite plugin that updates og:image and twitter:image meta tags
 * to point to the app's opengraph image using an absolute URL when
 * a deployment domain is configured, otherwise a relative path.
 *
 * Set PUBLIC_URL (or RAILWAY_PUBLIC_DOMAIN / RENDER_EXTERNAL_URL)
 * to enable absolute URLs for better social-media previews.
 */
export function metaImagesPlugin(): Plugin {
  return {
    name: "vite-plugin-meta-images",
    transformIndexHtml(html) {
      const publicDir = path.resolve(process.cwd(), "client", "public");
      const imageExt = pickOpengraphExt(publicDir);
      if (!imageExt) return html;

      const baseUrl = getDeploymentUrl();
      const imageUrl = baseUrl
        ? `${baseUrl}/opengraph.${imageExt}`
        : `/opengraph.${imageExt}`;

      html = html.replace(
        /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/g,
        `<meta property="og:image" content="${imageUrl}" />`
      );
      html = html.replace(
        /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/g,
        `<meta name="twitter:image" content="${imageUrl}" />`
      );

      return html;
    },
  };
}

function pickOpengraphExt(publicDir: string): string | null {
  const candidates: Array<[string, string]> = [
    ["opengraph.png", "png"],
    ["opengraph.jpg", "jpg"],
    ["opengraph.jpeg", "jpeg"],
  ];
  for (const [filename, ext] of candidates) {
    if (fs.existsSync(path.join(publicDir, filename))) return ext;
  }
  return null;
}

function getDeploymentUrl(): string | null {
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/$/, "");
  }
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }
  return null;
}
