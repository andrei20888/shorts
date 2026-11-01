/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 */

import { Config } from "@remotion/cli/config";

Config.setRspack(true);
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setDefaultPremountInSeconds(2);

// Final delivery: MP4 · H.264 · CRF 18 · yuv420p (TikTok/YouTube safe)
Config.setCodec("h264");
Config.setCrf(18);
Config.setPixelFormat("yuv420p");

// Offline machines / CI: point Remotion at a local Chrome Headless Shell.
//   REMOTION_BROWSER_EXECUTABLE=/path/to/chrome-headless-shell npx remotion render ...
if (process.env.REMOTION_BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.REMOTION_BROWSER_EXECUTABLE);
}
