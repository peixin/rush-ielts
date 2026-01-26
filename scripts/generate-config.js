import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const publicDir = path.join(rootDir, 'public');
const configPath = path.join(publicDir, 'config.json');

// Create public dir if not exists (though it should)
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

// Extract author name if format is "Name <email>"
let authorName = packageJson.author;
let authorEmail = "";

if (typeof packageJson.author === 'string') {
  const match = packageJson.author.match(/(.*) <(.*)>/);
  if (match) {
    authorName = match[1];
    authorEmail = match[2];
  }
} else if (typeof packageJson.author === 'object') {
    authorName = packageJson.author.name;
    authorEmail = packageJson.author.email;
}

const config = {
  version: packageJson.version,
  productName: "RUSH IELTS",
  author: authorName,
  email: authorEmail,
  copyrightYear: new Date().getFullYear()
};

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
console.log(`Generated public/config.json with version ${config.version}`);
