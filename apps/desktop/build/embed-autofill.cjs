const { cp, mkdir, readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

exports.default = async function ({ appOutDir, electronPlatformName, packager }) {
  if (electronPlatformName !== 'darwin') return;
  const plist = await import('plist');
  const contents = path.join(appOutDir, 'Strongroom.app/Contents');
  // The signed release is built as a directory first; electron-builder only
  // writes this itself when building archive targets. Include it before signing.
  const publish = packager.platformSpecificBuildOptions.publish;
  if (publish) {
    await writeFile(
      path.join(contents, 'Resources/app-update.yml'),
      JSON.stringify({ ...publish, updaterCacheDirName: 'strongroom-updater' }),
    );
  }
  const iconResources = path.join(
    packager.projectDir,
    'dist/native/StrongroomAutoFill.appex/Contents/Resources',
  );
  for (const name of ['Assets.car', 'Strongroom.icns']) {
    await cp(path.join(iconResources, name), path.join(contents, 'Resources', name));
  }
  await cp(
    path.join(packager.projectDir, '../../assets/brand/macos/icon-1024.png'),
    path.join(contents, 'Resources/strongroom-dock.png'),
  );
  await mkdir(path.join(contents, 'Helpers'), { recursive: true });
  await cp(
    path.join(packager.projectDir, 'dist/native/StrongroomBridgeHost.app'),
    path.join(contents, 'Helpers/StrongroomBridgeHost.app'),
    { recursive: true },
  );
  const infoPath = path.join(contents, 'Info.plist');
  const info = plist.parse(await readFile(infoPath, 'utf8'));
  info.CFBundleIconName = 'Strongroom';
  info.CFBundleIconFile = 'Strongroom.icns';
  await writeFile(infoPath, plist.build(info));
  if (
    packager.platformSpecificBuildOptions.identity !== null ||
    !process.env.STRONGROOM_SIGN_IDENTITY ||
    !process.env.STRONGROOM_APP_PROFILE ||
    !process.env.STRONGROOM_AUTOFILL_PROFILE
  )
    return;
  const plugins = path.join(appOutDir, 'Strongroom.app/Contents/PlugIns');
  await mkdir(plugins, { recursive: true });
  await cp(
    path.join(packager.projectDir, 'dist/native/StrongroomAutoFill.appex'),
    path.join(plugins, 'StrongroomAutoFill.appex'),
    { recursive: true },
  );
  if (process.env.STRONGROOM_SAFARI_PROFILE) {
    await cp(
      path.join(packager.projectDir, 'dist/native/StrongroomSafari.appex'),
      path.join(plugins, 'StrongroomSafari.appex'),
      { recursive: true },
    );
  }
};
