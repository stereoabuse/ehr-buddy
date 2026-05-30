const flipAppFuses = require('./flip-fuses.cjs')
const adHocSignMac = require('./ad-hoc-sign-mac.cjs')

// electron-builder only allows a single afterPack hook, so chain the steps here.
// Order matters: flip the security fuses FIRST (this rewrites the binary and, on
// macOS, invalidates any existing signature), THEN ad-hoc re-sign so the shipped
// app has a valid signature over the hardened binary.
//
// TODO(user): for distribution, replace the ad-hoc signing step with real
// Developer ID signing + notarization (needs your Apple credentials/cert).
module.exports = async function combinedAfterPack(context) {
  await flipAppFuses(context)
  await adHocSignMac(context)
}
