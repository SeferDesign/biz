# SeferBiz for Apple platforms

The SwiftUI app is a single multiplatform target for iPhone, iPad, and Mac. It
provides sign-in, annual financial summaries, and read-only invoice and expense
lists. Its minimum OS versions are iOS 27, iPadOS 27, and macOS 27; older
systems are intentionally unsupported.

The interface uses adaptive tabs and sidebar navigation, Swift Charts, and
Liquid Glass surfaces. The app is built in Swift 6 with complete concurrency
checking.

## Build and run

Open `SeferBiz.xcodeproj` in Xcode 27 or later and choose an iOS 27 Simulator
or My Mac as the run destination.

For iPhone code signing, create `SeferBiz/LocalSigning.xcconfig` with your
Apple Developer Team ID:

```xcconfig
DEVELOPMENT_TEAM = YOUR_TEAM_ID
```

This local file is ignored by Git. `Signing.xcconfig` includes it when present;
on a fresh checkout, create the local file or choose a team in Xcode's Signing
& Capabilities settings.

The app connects to `https://api.biz.seferdesign.com/v1` by default. Change the
API address under Settings to use a development server. For a physical device,
use a host name or LAN address reachable from that device and a certificate it
trusts; `localhost` on a device points to the device itself.

Sign-in uses the API's user session bearer token and stores it in Keychain. The
shared `API_ACCESS_TOKEN` is not included in the app.

The current API session is valid for 30 days and is not server-revocable when
the app signs out. Add revocable per-device sessions before distributing this
client broadly.
