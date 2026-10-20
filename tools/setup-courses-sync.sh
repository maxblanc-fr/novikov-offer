#!/usr/bin/env bash
# Разовая настройка витрины курсов на сервере (повторный запуск ничего не ломает):
#   1. deploy.sh начинает выкладывать NovikovCourses.html как /courses и копировать
#      туда свежий data/courses-live.json — site/ при каждом деплое собирается заново.
#   2. pm2-процесс courses-sync раз в день (09:00 МСК) сверяет цены и даты с
#      novikovspace.com и пишет data/courses-live.json сразу и в site/data/.
#
#   bash ~/workspace/novikov/repo/tools/setup-courses-sync.sh
set -euo pipefail
cd "$(dirname "$0")/../.."   # ~/workspace/novikov
ROOT="$PWD"

if ! grep -q 'NovikovCourses.html' deploy.sh; then
  cp deploy.sh deploy.sh.bak-precourses
  python3 - <<'EOF'
p = 'deploy.sh'
s = open(p, encoding='utf-8').read()
anchor = 'cp -r repo/images repo/uploads site/\n'
block = '''# Витрина курсов для продажников (внутренняя, без снимка). Цены и даты берёт из
# data/courses-live.json — его раз в день пишет pm2-процесс courses-sync.
cp repo/NovikovCourses.html site/courses.html
mkdir -p data site/data
if [ -f data/courses-live.json ]; then cp data/courses-live.json site/data/; fi

'''
assert s.count(anchor) == 1, 'deploy.sh: не нашёл строку копирования uploads'
open(p, 'w', encoding='utf-8').write(s.replace(anchor, block + anchor))
EOF
  echo "deploy.sh: добавлена витрина курсов (бэкап deploy.sh.bak-precourses)"
fi

# Пересобираем site/ уже с витриной: deploy.sh мог отработать до правки выше.
./deploy.sh

mkdir -p data site/data
pm2 delete courses-sync >/dev/null 2>&1 || true
pm2 start "$ROOT/repo/tools/sync-courses.mjs" \
  --name courses-sync \
  --interpreter node \
  --cron-restart "0 6 * * *" \
  --no-autorestart \
  -- "$ROOT/data/courses-live.json" "$ROOT/site/data/courses-live.json" >/dev/null
pm2 save >/dev/null
echo "courses-sync: запускается каждый день в 06:00 UTC (09:00 МСК), первый прогон идёт сейчас"
