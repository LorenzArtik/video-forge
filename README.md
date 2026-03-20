# Video Forge

Generate professional marketing videos entirely from code. Designed as a Claude Code skill — describe what you want, and Claude creates the video for you.

## What it does

- Creates animated HTML scenes with your brand's exact design tokens
- Generates AI narration via Google Gemini TTS
- Renders MP4 videos with Puppeteer + ffmpeg
- Produces both 16:9 (YouTube) and 9:16 (TikTok/Reels) formats
- Includes a browser-based preview player with dual-view, live animations, subtitles, and background music

## Quick Start

### Prerequisites

- Node.js 18+
- ffmpeg (`brew install ffmpeg` on macOS)
- A Google Gemini API key (for TTS narration)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/video-forge.git
cd video-forge
npm install
npm link          # makes `vforge` available globally

# Install the Claude Code skill
./install-skill.sh
```

### Usage with Claude Code

Once installed, just tell Claude what you need:

```
> crea un video promo per https://example.com
```

Claude will:
1. Visit the site and extract the exact design tokens (colors, fonts, shadows)
2. Create scene HTML files matching the brand identity
3. Write narration text and generate TTS audio
4. Set up animations synced to the narration
5. Open a preview player where you can watch and iterate
6. Render the final MP4 in both 16:9 and 9:16 formats

### Manual CLI Usage

```bash
# Create a new project
vforge init my-video
vforge init --template product-launch my-video

# Set your API key
echo "GEMINI_API_KEY=your-key-here" > my-video/.env

# Edit scenes in my-video/scenes/ and project.vforge.json

# Generate narration audio
cd my-video && vforge tts

# Preview with animations, audio, and subtitles
vforge preview --port 3345

# Render MP4
vforge render                  # 16:9 landscape
vforge render --format 9:16   # 9:16 portrait
```

## Project Structure

A Video Forge project looks like this:

```
my-video/
  project.vforge.json         # Scenes, animations, narration, settings
  .env                        # GEMINI_API_KEY
  scenes/                     # HTML files for 16:9 landscape
    hero.html
    features.html
    cta.html
  scenes-vertical/            # HTML files for 9:16 portrait
    hero.html
    features.html
    cta.html
  assets/                     # Music, images
    music.mp3
  audio/                      # Generated TTS (auto)
  output/                     # Rendered MP4s (auto)
    video.mp4
    video-vertical.mp4
```

## Preview Player

The built-in player shows both formats side by side:

- **Left**: 16:9 landscape version
- **Right**: 9:16 portrait version
- **Single Play button** runs both in sync with shared audio
- Live animations, word-by-word subtitles, background music
- Render buttons with download links directly in the player

## Animation System

Animations are declared in JSON and synced to narration timing:

```json
{
  "animations": [
    { "type": "wait", "ms": 400 },
    { "type": "fadeIn", "target": "#logo", "duration": 600 },
    { "type": "wait", "until": "narration:0.15" },
    { "type": "slideIn", "target": "#headline", "from": "bottom", "duration": 800 },
    { "type": "wait", "until": "narration:0.5" },
    { "type": "counter", "target": "#stat", "from": 18, "to": 3, "format": "{}%", "duration": 1500 },
    { "type": "highlight", "target": "#cta-button", "duration": 1000 }
  ]
}
```

Available types: `fadeIn`, `fadeOut`, `slideIn`, `zoomIn`, `scale`, `highlight`, `typewriter`, `counter`, `morph`, `cursor.show`, `cursor.moveTo`, `cursor.click`, `parallel`, `wait`

## Templates

```bash
vforge init --template product-launch my-video   # Hero + Features + CTA
vforge init --template explainer-steps my-video   # Problem + Solution + Demo
vforge init --template social-reel my-video       # Vertical 9:16 reel
vforge init --template testimonial my-video       # Quote card
```

## TTS Voices

| Voice | Gender | Tone |
|-------|--------|------|
| Kore (default) | F | Professional, clear |
| Aoede | F | Soft, warm |
| Puck | M | Warm, conversational |
| Charon | M | Deep, authoritative |
| Fenrir | M | Energetic, dynamic |

## Scene Design Rules

- All styling must be **inline** (`style="..."`) — no external CSS
- Every animated element must have `opacity:0` in its initial style
- Every animation `target` must match an `id` in the HTML
- Use the exact design tokens from the reference site (never invent colors)
- Scenes are self-contained HTML fragments that fill 100% width and height

## License

MIT
