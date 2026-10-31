import {Config} from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setOverwriteOutput(true);
Config.setPixelFormat('yuv420p');

// Optional: point Remotion at an existing Chromium instead of downloading one
// (e.g. BROWSER_EXECUTABLE=/opt/pw-browsers/chromium npm run render:all)
if (process.env.BROWSER_EXECUTABLE) {
  Config.setBrowserExecutable(process.env.BROWSER_EXECUTABLE);
}
