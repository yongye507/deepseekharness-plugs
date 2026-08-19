#!/usr/bin/env bash
# 安装插件到 personal-platform
# 用法: ./install.sh <平台目录>   (默认 ../personal-platform)
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "$0")" && pwd)"
PLATFORM="${1:-$PLUGIN_DIR/../personal-platform}"
PLATFORM="$(cd "$PLATFORM" && pwd)"

echo "▶ 安装 yuketang 插件到: $PLATFORM"

# 1. 复制插件代码到平台 features/
rm -rf "$PLATFORM/features/yuketang"
cp -R "$PLUGIN_DIR/yuketang" "$PLATFORM/features/yuketang"
echo "  ✓ features/yuketang 已复制"

# 2. 注册到平台(更新 features/index.ts 与 src/db/index.ts)
node "$PLUGIN_DIR/scripts/register.mjs" "$PLATFORM"
echo "  ✓ 平台注册表已更新"

# 3. 安装依赖
echo "  ▶ 安装 qrcode 依赖…"
(cd "$PLATFORM" && npm_config_cache=/tmp/npm-cache npm install qrcode >/dev/null 2>&1)
echo "  ✓ 依赖已安装"

# 4. 建表
echo "  ▶ 同步数据库表…"
(cd "$PLATFORM" && npm_config_cache=/tmp/npm-cache npx drizzle-kit push --force 2>&1 | tail -2)
echo "  ✓ 数据表已就绪"

echo "✅ 安装完成。启动平台后访问 /features/yuketang"
