# SevaVoice frontend

The frontend is a React single-page application built with Vite. Start the
development server with `npm run dev`; use `npm run build` and `npm run lint` to
validate changes. Run `npm test` for normalization tests and
`npm run test:browser` for the Chromium voice-flow tests. The browser test uses
the installed Chrome/Edge binary when available (override with `CHROME_BIN`)
and Chromium fake-media flags.

## Pages

- `/` — SevaVoice home page
- `/login` — Sign in with a phone number and password
- `/register` — Choose Donor or Farmer registration (English, Marathi, and Hindi labels)
- `/register/donor` — Create a donor account
- `/register/farmer` — Voice-assisted farmer information form
- `/farmer` — Farmer workspace
- `/donor` — Donor workspace
- `/admin` — Admin workspace
- `/verifier` — Verifier workspace

Dashboard paths require a signed-in user with the matching role. Successful
login and donor registration open the workspace for the returned account role.
The session is stored in `sessionStorage` and is cleared on logout. The backend
API defaults to `http://localhost:5000`; set `VITE_API_URL` to override it.

## Source layout

Page components are grouped by feature under `src/pages`:

- `home/` — home page
- `login/` — login page
- `register/` — donor registration and voice-assisted farmer registration
- `farmer/` — farmer workspace
- `donor/` — donor workspace
- `admin/` — admin workspace
- `verifier/` — verifier workspace

Shared navigation components live in `src/components`; voice recording, API,
and question configuration code live in `src/lib`.

Farmer registrations are saved as pending farmer profiles. Donor registrations
create a donor user account and sign the donor in. Farmer registrations do not
create login credentials; farmers currently have no login path. The backend
Gnani key is optional; set `GNANI_API_KEY` in `backend/.env` to enable voice
input and playback. The configured Timbre v2.5 voices are Ishaan (Marathi),
Nalini (Hindi), and Kaveri (English).

Registration APIs are `POST /api/farmers/register` and
`POST /api/auth/register/donor`. Both validate request fields server-side and
return JSON errors; farmer mobile numbers and donor login phone numbers must be
10-digit Indian mobile numbers. Farmer land size must be greater than zero and
at most 10,000 acres.
