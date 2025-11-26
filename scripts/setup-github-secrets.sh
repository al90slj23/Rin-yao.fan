#!/bin/bash

# GitHub Actions 配置脚本
# 此脚本使用 GitHub CLI (gh) 自动配置所有 Secrets 和 Variables
# 使用前请确保已安装 gh CLI: https://cli.github.com/

set -e

echo "🚀 开始配置 GitHub Actions Secrets 和 Variables..."
echo ""

# 检查是否安装了 gh CLI
if ! command -v gh &> /dev/null; then
    echo "❌ 错误: 未找到 GitHub CLI (gh)"
    echo "请访问 https://cli.github.com/ 安装 gh CLI"
    exit 1
fi

# 检查是否已登录
if ! gh auth status &> /dev/null; then
    echo "❌ 错误: 未登录 GitHub CLI"
    echo "请运行: gh auth login"
    exit 1
fi

REPO="al90slj23/Rin-yao.fan"

echo "📦 仓库: $REPO"
echo ""

# 配置 Secrets
echo "🔐 配置 Secrets..."

gh secret set CLOUDFLARE_ACCOUNT_ID --body "e89f0ca09670c7117e52c2006b4096c4" --repo "$REPO"
echo "✅ CLOUDFLARE_ACCOUNT_ID"

gh secret set CLOUDFLARE_API_TOKEN --body "6CZVSVZjJwxY0nGj7VzBbyijpketh6ANy7OSwdNM" --repo "$REPO"
echo "✅ CLOUDFLARE_API_TOKEN"

gh secret set S3_ACCESS_KEY_ID --body "e2f99de4a5e12f03d5fadc551e5e4e39" --repo "$REPO"
echo "✅ S3_ACCESS_KEY_ID"

gh secret set S3_SECRET_ACCESS_KEY --body "88ce780948dc48ab7211040d6a492fe90f329fcd69d7f8813b7a57a551ff3d1e" --repo "$REPO"
echo "✅ S3_SECRET_ACCESS_KEY"

gh secret set JWT_SECRET --body "94e23383ddfd19977b48d478380d8db51c7e47f8c0c7941c8d1ea69d5cd25eba" --repo "$REPO"
echo "✅ JWT_SECRET"

gh secret set RIN_GITHUB_CLIENT_ID --body "0v231iQ5qFwvy5Tg8Q7Q" --repo "$REPO"
echo "✅ RIN_GITHUB_CLIENT_ID"

gh secret set RIN_GITHUB_CLIENT_SECRET --body "0263e5f5339cdc52964075c03ad76b69655f5cb1" --repo "$REPO"
echo "✅ RIN_GITHUB_CLIENT_SECRET"

echo ""
echo "📝 配置 Variables..."

gh variable set DB_NAME --body "rin" --repo "$REPO"
echo "✅ DB_NAME"

gh variable set WORKER_NAME --body "rin-server" --repo "$REPO"
echo "✅ WORKER_NAME"

gh variable set FRONTEND_URL --body "https://yao.fan" --repo "$REPO"
echo "✅ FRONTEND_URL"

gh variable set S3_ACCESS_HOST --body "https://pub-d73e6e2b7f33496bbde552d2304b1f3c.r2.dev" --repo "$REPO"
echo "✅ S3_ACCESS_HOST"

gh variable set S3_BUCKET --body "yao-fan" --repo "$REPO"
echo "✅ S3_BUCKET"

gh variable set S3_CACHE_FOLDER --body "cache/" --repo "$REPO"
echo "✅ S3_CACHE_FOLDER"

gh variable set S3_ENDPOINT --body "https://e89f0ca09670c7117e52c2006b4096c4.r2.cloudflarestorage.com" --repo "$REPO"
echo "✅ S3_ENDPOINT"

gh variable set S3_FOLDER --body "images/" --repo "$REPO"
echo "✅ S3_FOLDER"

gh variable set S3_REGION --body "auto" --repo "$REPO"
echo "✅ S3_REGION"

gh variable set S3_FORCE_PATH_STYLE --body "false" --repo "$REPO"
echo "✅ S3_FORCE_PATH_STYLE"

# WEBHOOK_URL 留空则不设置（可选配置）
# gh variable set WEBHOOK_URL --body "" --repo "$REPO"
echo "⏭️  WEBHOOK_URL (跳过 - 可选配置)"

gh variable set RSS_TITLE --body "要点儿饭" --repo "$REPO"
echo "✅ RSS_TITLE"

gh variable set RSS_DESCRIPTION --body "个人博客" --repo "$REPO"
echo "✅ RSS_DESCRIPTION"

echo ""
echo "🎉 配置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 访问 https://github.com/$REPO/settings/secrets/actions 查看配置"
echo "2. 推送代码到 dev 分支触发自动部署"
echo "3. 访问 https://github.com/$REPO/actions 查看部署状态"
echo ""
