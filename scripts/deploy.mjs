// Publica dist/ en la rama gh-pages (GitHub Pages) con la base /carga/.
import { execSync } from 'node:child_process'
const run = (cmd) => execSync(cmd, { stdio: 'inherit', env: { ...process.env, BASE_PATH: '/carga/' } })
run('npx vitest run')
run('npm run build')
run('npx -y gh-pages -d dist -m "Deploy a GitHub Pages" --nojekyll')
