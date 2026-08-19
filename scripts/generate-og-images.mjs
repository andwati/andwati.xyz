import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { decompress } from 'wawoff2';

const root = process.cwd();
const postsDir = path.join(root, 'content', 'posts');
const outDir = path.join(root, 'static', 'images', 'og');

const COLORS = {
  bg: '#131311',
  text: '#e9e7de',
  muted: '#8b8a80',
  accent: '#ff5a46',
  border: 'rgba(233, 231, 222, 0.16)',
};

function tomlString(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`, 'm'));
  return match ? JSON.parse(match[1]) : undefined;
}

function tomlStringArray(source, key) {
  const match = source.match(new RegExp(`^${key}\\s*=\\s*\\[([^\\]]*)\\]`, 'm'));
  if (!match) return [];
  return [...match[1].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
}

function frontMatter(source) {
  return source.match(/^\+\+\+\s*\n([\s\S]*?)\n\+\+\+/)?.[1];
}

function taxonomies(source) {
  return source.match(/^\[taxonomies\]\s*\n([\s\S]*?)(?:\n\[|\n?$)/m)?.[1] ?? '';
}

function markdownFiles(directory) {
  return fs.readdir(directory, { withFileTypes: true }).then((entries) =>
    Promise.all(
      entries.map((entry) => {
        const location = path.join(directory, entry.name);
        if (entry.isDirectory()) return markdownFiles(location);
        return entry.isFile() && entry.name.endsWith('.md') ? [location] : [];
      }),
    ).then((lists) => lists.flat()),
  );
}

function slugFor(file, metadata) {
  const relative = path.relative(postsDir, file).replaceAll(path.sep, '/');
  const defaultSlug = relative.endsWith('/index.md')
    ? relative.slice(0, -'/index.md'.length)
    : relative.slice(0, -'.md'.length);
  return tomlString(metadata, 'slug') ?? defaultSlug;
}

async function loadFont(relPath) {
  const woff2 = await fs.readFile(path.join(root, 'static', relPath));
  const ttf = await decompress(woff2);
  return Buffer.from(ttf);
}

function h(type, props, ...children) {
  return { type, props: { ...props, children: children.flat().filter((c) => c !== null && c !== undefined) } };
}

function formatDate(date) {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function card({ title, date, tags }) {
  const stampTag = tags[0];
  const footerTags = tags.length > 4 ? `${tags.slice(0, 4).join(' · ')} ⋯` : tags.join(' · ');
  const titleSize = title.length > 70 ? 46 : title.length > 45 ? 54 : 64;

  return h(
    'div',
    {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        backgroundColor: COLORS.bg,
        color: COLORS.text,
        fontFamily: 'IBM Plex Serif',
      },
    },
    h(
      'div',
      {
        style: {
          flex: 1,
          margin: '40px',
          border: `1px solid ${COLORS.border}`,
          borderRadius: '6px',
          padding: '48px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        },
      },
      h(
        'div',
        { style: { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' } },
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontWeight: 400,
              fontSize: '22px',
              color: COLORS.muted,
              letterSpacing: '2px',
            },
          },
          'ANDWATI.COM · CASE FILE',
        ),
        stampTag
          ? h(
              'div',
              {
                style: {
                  display: 'flex',
                  border: `2px solid ${COLORS.accent}`,
                  borderRadius: '4px',
                  padding: '8px 16px',
                  color: COLORS.accent,
                  fontFamily: 'JetBrains Mono',
                  fontWeight: 700,
                  fontSize: '20px',
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                  transform: 'rotate(3deg)',
                },
              },
              stampTag,
            )
          : null,
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            fontFamily: 'IBM Plex Serif',
            fontWeight: 700,
            fontSize: `${titleSize}px`,
            lineHeight: 1.15,
            letterSpacing: '-1px',
            color: COLORS.text,
            overflow: 'hidden',
          },
        },
        title,
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `1px solid ${COLORS.border}`,
            paddingTop: '24px',
          },
        },
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontWeight: 400,
              fontSize: '20px',
              color: COLORS.muted,
              letterSpacing: '1px',
            },
          },
          formatDate(date),
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              fontFamily: 'JetBrains Mono',
              fontWeight: 400,
              fontSize: '20px',
              color: COLORS.muted,
              letterSpacing: '1px',
            },
          },
          footerTags,
        ),
      ),
    ),
  );
}

const fonts = [
  { name: 'IBM Plex Serif', data: await loadFont('fonts/ibm-plex-serif/ibm-plex-serif-v20-latin-700.woff2'), weight: 700, style: 'normal' },
  { name: 'JetBrains Mono', data: await loadFont('fonts/jetbrains-mono/JetBrainsMono-Regular.woff2'), weight: 400, style: 'normal' },
  { name: 'JetBrains Mono', data: await loadFont('fonts/jetbrains-mono/JetBrainsMono-Bold.woff2'), weight: 700, style: 'normal' },
];

const files = (await markdownFiles(postsDir)).filter((file) => path.basename(file) !== '_index.md');

await fs.mkdir(outDir, { recursive: true });

let count = 0;
for (const file of files) {
  const source = await fs.readFile(file, 'utf8');
  const metadata = frontMatter(source);
  if (!metadata || /^draft\s*=\s*true$/m.test(metadata)) continue;

  const title = tomlString(metadata, 'title');
  const date = metadata.match(/^date\s*=\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
  if (!title || !date) continue;

  const tags = tomlStringArray(taxonomies(metadata), 'tags');
  const slug = slugFor(file, metadata);

  const svg = await satori(card({ title, date, tags }), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg).render().asPng();
  await fs.writeFile(path.join(outDir, `${slug}.png`), png);
  count += 1;
}

console.log(`Generated ${count} OG image${count === 1 ? '' : 's'} in ${path.relative(root, outDir)}/`);
