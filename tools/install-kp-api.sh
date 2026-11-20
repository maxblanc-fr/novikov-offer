#!/bin/sh
# Ставит общий архив КП на сервер: kp-api.js рядом с server.js + 2 строки в server.js + перезапуск.
# Запуск на сервере после deploy.sh:  cd ~/workspace/novikov && sh repo/tools/install-kp-api.sh
set -e
cd "$(dirname "$0")/../.."            # ~/workspace/novikov
cp repo/tools/kp-api.js kp-api.js
mkdir -p data/kp
if ! grep -q "require('./kp-api')" server.js; then
  cp server.js server.js.bak-prekpapi
  sed -i "s#^const path = require('node:path')\$#const path = require('node:path')\nconst kpApi = require('./kp-api')   // общий архив КП генератора#" server.js
  sed -i "s#^  .createServer((req, res) => {\$#  .createServer((req, res) => {\n    if (kpApi(req, res)) return#" server.js
fi
grep -q "if (kpApi(req, res)) return" server.js && grep -q "require('./kp-api')" server.js || { echo "server.js не пропатчен — откатываю"; cp server.js.bak-prekpapi server.js; exit 1; }
node --check server.js
pm2 restart novikov >/dev/null
sleep 1
curl -s -o /dev/null -w "API: %{http_code}\n" http://127.0.0.1:8081/api/kp/max
