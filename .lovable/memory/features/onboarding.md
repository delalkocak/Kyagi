Onboarding flow: 6 swipeable screens (village dots, feed preview, flare, calendar, notifications, closing) → "meet your circle" CTA on screen 6.
Onboarding steps: welcome → exploring → activated → complete (stored in profiles.onboarding_step).
Founders (Alyssa/Sonal) auto-seeded into every new circle via auto_follow_founders trigger.
Founder user IDs: del=2ed094aa, sonal=8eca5774. is_team_account=true.
Weekly flow gate: only shows for activated/complete users.
Feed nudge card shows for "exploring" users. Dismissible 3x via localStorage.
ShareInviteSheet: half-sheet with editable message + navigator.share fallback to clipboard.
ContactMatchScreen: uses Web Contacts API (Chrome Android only), fallback to search/invite.
Phone numbers hashed with SHA-256 client-side, stored as phone_hash. Never stored raw.
Discoverability toggle in profile settings controls profiles.discoverable column.
Screen 5 (notifications): triggers Notification.requestPermission(), no individual toggles. Granular toggles in profile settings.
Screen 6 (closing): "meet your circle" sets onboarding_step to 'exploring'. No skip on this screen.
