const path = require('node:path')
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses')

// Harden the packaged Electron binary by flipping security fuses. This disables
// the Node.js escape hatches that would otherwise let an attacker turn the
// signed app into a generic Node runtime, and pins the app to load only from a
// validated ASAR.
//
// Invoked from electron-builder's afterPack hook (see combined-afterpack.cjs).
module.exports = async function flipAppFuses(context) {
  const productFilename = context.packager.appInfo.productFilename
  const platform = context.electronPlatformName

  // Resolve the path to the Electron executable that fuses must be written to.
  let electronBinary
  if (platform === 'darwin') {
    electronBinary = path.join(context.appOutDir, `${productFilename}.app`)
  } else if (platform === 'win32') {
    electronBinary = path.join(context.appOutDir, `${productFilename}.exe`)
  } else {
    // linux
    electronBinary = path.join(context.appOutDir, productFilename)
  }

  await flipFuses(electronBinary, {
    version: FuseVersion.V1,
    resetAdHocDarwinSignature: platform === 'darwin',
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true
  })
}
