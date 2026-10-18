# Administrator access and market operations

## Bootstrap an administrator
1. Set \`ADMIN_PHONE_E164\` in the API environment to the verified administrator's Nigerian mobile number in canonical E.164 format, for example \`+2348012345678\`. Do not use the example number as a real configuration.
2. Restart the API.
3. Request and verify an OTP for that phone number through the normal sign-up/sign-in flow. After successful verification, the matching account receives the ADMIN role. Keep this environment variable private and remove it after bootstrap if your deployment process supports a separate controlled role-management method.
4. Sign in on the website and open \`/admin\`. The API enforces the role; hiding the UI is not the security boundary.

## Market lifecycle
- Create a draft market with a half-number line and a future kickoff time.
- Review player, teams, competition, stat key/label, liquidity and fee.
- Open the market before kickoff to allow virtual-share trading.
- Close a market if it should stop taking trades.
- After kickoff, settle using the verified OVER or UNDER result. Settlement credits winning virtual positions through balanced ledger transactions. Settled markets cannot be traded again.

## Important
The admin settlement action is manual; YKB is not connected to a live football-data or player-stat provider yet. Independently verify results before settlement. Real-money payments and trading remain disabled and require security plus Nigerian legal/regulatory review.
