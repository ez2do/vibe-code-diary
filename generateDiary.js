#!/usr/bin/env node

// generateDiary.js – create a markdown diary entry from Cursor chat history.
// Run with `npm run diary` inside the vibe-diary folder.
// Usage: 
//   node generateDiary.js                           # Process all history
//   node generateDiary.js 2024-01-01 2024-01-31    # Process date range

const fs = require('fs-extra');
const path = require('path');
const glob = require('glob');
const dayjs = require('dayjs');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
const isSameOrBefore = require('dayjs/plugin/isSameOrBefore');
const dotenv = require('dotenv');
const OpenAI = require('openai').default;

// Load dayjs plugins
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Configuration from environment variables with defaults
const CUSTOM_PROMPT = process.env.CUSTOM_PROMPT || 'Turn the following Cursor chat into a concise diary entry (≤ 250 words). Tell a story based on the chat, infer the mood and list some interesting take away points. Create a title for the diary entry and write a viral tweet for the diary entry.';
const TEMPERATURE = parseFloat(process.env.TEMPERATURE) || 0.7;
const HISTORY_PATH = process.env.HISTORY_PATH || path.join(process.env.HOME || process.env.USERPROFILE || '', 'Library/Application Support/Cursor/User/History');

function findAllCursorFiles() {
  const pattern = path.join(HISTORY_PATH, '**', '*.md');
  return glob.sync(pattern, { nodir: true });
}

function groupFilesByDate(files) {
  const groups = {};
  files.forEach(file => {
    const stat = fs.statSync(file);
    const date = dayjs(stat.mtime).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(file);
  });
  return groups;
}

function concatChatText(files) {
  return files
    .map((file) => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        return content;
      } catch {
        return '';
      }
    })
    .filter(content => content.trim().length > 0)
    .join('\n\n---\n\n');
}

async function generateDiaryEntry(rawText) {
  const prompt = CUSTOM_PROMPT + '\n' + rawText;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful diary ghost writer.' },
      { role: 'user', content: prompt },
    ],
    temperature: TEMPERATURE,
  });

  return completion.choices[0].message.content.trim();
}

function parseArguments() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { fromDate: null, toDate: null };
  }
  
  if (args.length === 2) {
    const [fromDate, toDate] = args;
    
    // Validate date formats
    if (!dayjs(fromDate, 'YYYY-MM-DD', true).isValid()) {
      console.error(`Invalid from_date format: ${fromDate}. Use YYYY-MM-DD format.`);
      process.exit(1);
    }
    
    if (!dayjs(toDate, 'YYYY-MM-DD', true).isValid()) {
      console.error(`Invalid to_date format: ${toDate}. Use YYYY-MM-DD format.`);
      process.exit(1);
    }
    
    if (dayjs(fromDate).isAfter(dayjs(toDate))) {
      console.error(`from_date (${fromDate}) cannot be after to_date (${toDate})`);
      process.exit(1);
    }
    
    return { fromDate, toDate };
  }
  
  console.error('Usage: node generateDiary.js [from_date] [to_date]');
  console.error('  from_date and to_date should be in YYYY-MM-DD format');
  console.error('  Or run without arguments to process all history');
  process.exit(1);
}

function filterDatesByRange(dates, fromDate, toDate) {
  if (!fromDate || !toDate) {
    return dates;
  }
  
  const from = dayjs(fromDate);
  const to = dayjs(toDate);
  
  return dates.filter(date => {
    const current = dayjs(date);
    return current.isSameOrAfter(from) && current.isSameOrBefore(to);
  });
}

async function main() {
  const { fromDate, toDate } = parseArguments();
  
  const allFiles = findAllCursorFiles();
  if (!allFiles.length) {
    console.log('No Cursor chats found. Nothing to do.');
    return;
  }

  const filesByDate = groupFilesByDate(allFiles);
  const allDates = Object.keys(filesByDate).sort();
  const dates = filterDatesByRange(allDates, fromDate, toDate);

  if (dates.length === 0) {
    if (fromDate && toDate) {
      console.log(`No chat history found between ${fromDate} and ${toDate}.`);
    } else {
      console.log('No chat history found.');
    }
    return;
  }

  if (fromDate && toDate) {
    console.log(`Processing ${dates.length} days with chat history between ${fromDate} and ${toDate}.`);
  } else {
    console.log(`Processing ${dates.length} days with chat history.`);
  }

  for (const date of dates) {
    const files = filesByDate[date];
    const rawText = concatChatText(files);
    
    if (rawText.trim().length === 0) {
      console.log(`Skipping ${date}: no meaningful content found.`);
      continue;
    }
    
    const diaryEntry = await generateDiaryEntry(rawText);
    
    const diaryDir = path.join(process.cwd(), 'diary');
    fs.ensureDirSync(diaryDir);
    const filePath = path.join(diaryDir, `${date}.md`);
    fs.writeFileSync(filePath, `${diaryEntry}\n`);
    console.log(`Diary written for ${date}: ${filePath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
}); 