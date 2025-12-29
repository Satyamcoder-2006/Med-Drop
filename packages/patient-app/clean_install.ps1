Remove-Item -Recurse -Force node_modules
if (Test-Path package-lock.json) { Remove-Item package-lock.json }
npm install
npx expo install --fix
npx expo start -c
