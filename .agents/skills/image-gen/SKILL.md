---
name: image-gen
description: Generate images via OpenRouter API using Nano Banana 2 (Gemini 3.1 Flash Image Preview). Use when asked to "generate image", "create image", "нарисуй", "сгенерируй картинку", or "make a picture".
license: MIT
metadata:
  author: suenot
  version: "1.1"
---

# Image Generation via OpenRouter (Nano Banana 2)

Generate images using Google's Nano Banana 2 model (`google/gemini-3.1-flash-image-preview`) through the OpenRouter API.

## Requirements

- `OPENROUTER_API_KEY` must be set in the project `.env` file.

## Visual Style Guide

All generated images for this project must follow the trading terminal aesthetic:

- **Theme**: Dark mode / deep black background matching the terminal UI
- **Colors**: Neon accents — cyan (#00BCD4), green (#26a69a for bullish), red (#ef5350 for bearish), blue (#2196F3), orange (#FF9800). Use gradients and glows.
- **Feel**: Futuristic, sleek, high-tech, professional quant trading terminal aesthetic
- **Effects**: Glassmorphism, glowing candlestick charts, semi-transparent layers, data flow particles, grid lines, depth of field
- **Aspect ratio**: Always 16:9
- **Text**: No text on images (unless specific labels are essential, e.g. axis labels on charts)
- **Subject**: Abstract trading visualizations, candlestick patterns, order book heatmaps, network graphs of exchanges, data flow diagrams — NOT stock photos or photorealistic people
- **Inspiration**: Bloomberg Terminal from the future, premium crypto trading dashboard, sci-fi data center with live market feeds

### Prompt template

```
A premium dark-themed [VISUALIZATION TYPE] for [TOPIC]. [SPECIFIC VISUAL ELEMENTS]. [COLOR PALETTE DETAILS]. Modern, clean, professional crypto trading terminal aesthetic. 16:9 aspect ratio. No text.
```

## How to generate an image

Use the Bash tool to call the OpenRouter API.

**Important:** Always load the key from `.env` before calling the API:

```bash
export $(grep OPENROUTER_API_KEY .env | xargs)
```

### Generate and save

```bash
export $(grep OPENROUTER_API_KEY .env | xargs)

PROMPT='YOUR_PROMPT_HERE'
OUTPUT='public/images/generated/your-image-name.png'

curl -s https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"google/gemini-3.1-flash-image-preview\",
    \"modalities\": [\"text\", \"image\"],
    \"messages\": [
      {
        \"role\": \"user\",
        \"content\": [
          {
            \"type\": \"text\",
            \"text\": \"$PROMPT\"
          }
        ]
      }
    ]
  }" | jq -r '.choices[0].message.images[0].image_url.url' | sed 's/^data:image\/[a-z]*;base64,//' | base64 --decode > "$OUTPUT"

# Save the prompt alongside the image
echo "$PROMPT" > "${OUTPUT%.png}.txt"
```

### Verify the image

Use the Read tool to view the generated `.png` file and confirm it looks correct.

## Saving convention

For every generated image, always save TWO files:
1. **Image**: `public/images/generated/<name>.png`
2. **Prompt**: `public/images/generated/<name>.txt` — contains the exact prompt used to generate the image

This allows regeneration and style consistency in the future.

## Options

- **Aspect ratio**: Add `"image_config": {"aspect_ratio": "16:9"}` to the request body. Supported values: `1:1`, `3:4`, `4:3`, `9:16`, `16:9`.
- **Image size**: Add `"image_config": {"image_size": "1024x1024"}` for specific resolution.

## Usage notes

- Always save images to `public/images/generated/` directory.
- Use descriptive filenames matching the feature or context.
- The model supports image editing too — pass an existing image as a base64 `image_url` in the user message along with editing instructions.
- If the API returns an error, check that `OPENROUTER_API_KEY` is valid and has credits.
