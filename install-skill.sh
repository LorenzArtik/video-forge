#!/bin/bash
# Install Video Forge skill for Claude Code

SKILL_DIR="$HOME/.claude/skills/video-forge"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[video-forge] Installing Claude Code skill..."

mkdir -p "$SKILL_DIR"
cp "$SCRIPT_DIR/skill/SKILL.md" "$SKILL_DIR/SKILL.md"

echo "[video-forge] Skill installed at: $SKILL_DIR/SKILL.md"
echo ""
echo "Done! You can now use Video Forge from Claude Code."
echo "Try: 'crea un video promo per https://example.com'"
