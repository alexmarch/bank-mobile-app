# BankDash Android app

This Expo app is Android-first. The web target is provided as a fast UI preview and does not replace Android testing.

## Preview without an emulator

1. Copy `.env.example` to `.env.local`.
2. Leave `EXPO_PUBLIC_API_URL=http://localhost:3000` for a browser preview on the same computer.
3. Start the API from the repository root with `npm run start:api`.
4. In another terminal, run:

   ```sh
   npm run web --workspace apps/customer-mobile
   ```

5. Open the local URL printed by Expo. You can inspect the layout using the browser's responsive/mobile view.

The sign-in and account-opening screens follow the supplied Figma mobile frames. They use PanelUI, share the saved light/dark theme and English, French, Turkish, or Russian locale, and connect registration and login to the existing API. Login remains email-based; the registration design's unsupported `User Name` field is omitted to match the production portal and API. Google signup, Help, password recovery, and legal links are visibly unavailable until their flows or destinations are wired.

The API allows localhost origins in non-production mode for this preview. In production, add any browser origin that needs direct API access to `CORS_ORIGINS` as a comma-separated list. Native Android requests do not use browser CORS.

## Test on an Android phone

Install Expo Go on the phone and run `npm run start --workspace apps/customer-mobile` on the computer. Scan the QR code with Expo Go. Set `EXPO_PUBLIC_API_URL` to the computer's LAN address (currently `http://192.168.0.111:3000` in `.env`; find yours with `ipconfig getifaddr en0`) so the phone can reach the API; `localhost` on the phone refers to the phone itself.

The authenticated app area uses Expo Router native tabs. Dashboard/account screens are placeholders until their individual Figma frames are provided.

The customer mobile app is not intended to ship as a web app. Use an Android development or production build when preparing a release.

## Screens

Sign in / Open an account, then NativeTabs: Home, Accounts, Cards, Transactions and More (Transfer, Loans, Investments, Settings with profile, preferences, 2FA with QR and password change). Not yet ported: KYC verification, crypto deposits, services, privileges, notifications, support chat, external SEPA/SWIFT transfers, card/account applications.
