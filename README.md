# Vibe Code Diary 📔

A tiny CLI to turn your Cursor chat history into daily markdown journal entries.

## Setup

```
cd vibe-diary
npm install
```

Create a `.env` file with your configuration:

```
cp env.example .env   # Copy the example file
# Then edit .env with your actual values
```

## Usage

Generate diary entries for all available chat history:

```
npm run diary
```

Generate diary entries for a specific date range:

```
node generateDiary.js 2024-01-01 2024-01-31
```

You'll find **diary/YYYY-MM-DD.md** files inside the `vibe-diary` folder, one for each day with chat activity.

## How it works

The tool reads Cursor chat history from a configurable path (defaults to `~/Library/Application Support/Cursor/User/History/`).

Each workspace folder contains `.md` files with your chat conversations, grouped by modification date.

## Configuration

Environment variables (use a `.env` file):

```
OPENAI_API_KEY=sk-...
CUSTOM_PROMPT=Turn the following Cursor chat into a diary entry...
TEMPERATURE=0.7
HISTORY_PATH=/path/to/cursor/history
```

### Available Environment Variables

- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `CUSTOM_PROMPT` - Custom prompt for diary generation (optional, default creates ≤250 word entries)
- `TEMPERATURE` - Temperature for AI generation (optional, default: 0.7)
- `HISTORY_PATH` - Path to Cursor chat history (optional, default: `~/Library/Application Support/Cursor/User/History`) 
