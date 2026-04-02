import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

// Get staged files from git
const stagedFiles = execSync('git diff --cached --name-only --diff-filter=ACMR')
  .toString()
  .split('\n')
  .filter(Boolean);

// Filter to only new or modified posts
const postFiles = stagedFiles.filter(
  (file) => file.startsWith('content/posts/') && file.endsWith('.md') && !file.endsWith('_index.md'),
);

if (postFiles.length === 0) {
  process.exit(0);
}

let hasError = false;

for (const file of postFiles) {
  const basename = path.basename(file, '.md');
  
  // 1. Slug validation (kebab-case: lowercase letters, numbers, and hyphens)
  if (!/^[a-z0-9\-]+$/.test(basename)) {
    console.error(`[ERROR] in ${file}:`);
    console.error(`   Filename must be kebab-case (e.g. 'my-cool-post.md').`);
    hasError = true;
  }

  // 2. Front-matter validation
  const content = fs.readFileSync(file, 'utf8');
  
  // Zola uses +++ for TOML front-matter
  const frontMatterMatch = content.match(/^\+\+\+([\s\S]*?)\+\+\+/);
  
  if (!frontMatterMatch) {
    console.error(`[ERROR] in ${file}:`);
    console.error(`   Missing TOML front-matter (must be enclosed in +++).`);
    hasError = true;
    continue;
  }

  const frontMatter = frontMatterMatch[1];
  
  const hasTitle = /^title\s*=\s*".+"/m.test(frontMatter);
  const hasDate = /^date\s*=\s*\d{4}-\d{2}-\d{2}/m.test(frontMatter);

  if (!hasTitle) {
    console.error(`[ERROR] in ${file}:`);
    console.error(`   Missing 'title' field in front-matter (e.g. title = "My Post").`);
    hasError = true;
  }
  
  if (!hasDate) {
    console.error(`[ERROR] in ${file}:`);
    console.error(`   Missing 'date' field in front-matter (e.g. date = 2024-01-01).`);
    hasError = true;
  }
}

if (hasError) {
  console.error('\n[FATAL] Commit rejected due to validation errors. Please fix the issues above and try again.\n');
  process.exit(1);
} else {
  console.log('[SUCCESS] Post validation passed!');
}
