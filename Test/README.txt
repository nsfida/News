Astra Signal — Static Launch Kit

Files
- index.html
- style.css
- script.js
- data.json
- data.zip

Password flow
1. Open index.html in a browser or deploy the folder on GitHub Pages.
2. The page fetches data.zip from the same folder.
3. Enter the archive password: ASTRA-2049
4. zip.js decrypts data.json in the browser and the dashboard renders dynamically.

Notes
- If the password is wrong, the gate shows an error and allows retry.
- The site is fully static and works without a backend.
- Keep data.zip next to index.html when deploying.

