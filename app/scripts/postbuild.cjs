const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const standalone = path.join(root, '.next', 'standalone')

fs.cpSync(path.join(root, '.next', 'static'), path.join(standalone, '.next', 'static'), { recursive: true })
if (fs.existsSync(path.join(root, 'public'))) {
  fs.cpSync(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true })
}
console.log('postbuild: copied static and public into standalone')
