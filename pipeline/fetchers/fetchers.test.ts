import { describe, expect, it } from 'vitest';
import { normalizeDevto } from './devto';
import { normalizeGithub } from './github';
import { normalizeHn } from './hn';
import { normalizeRedditFeed } from './reddit';
import { normalizeFeed } from './rss';
import { normalizeYoutube } from './youtube';

describe('normalizeHn', () => {
  it('maps Algolia hits to candidates pointing at the HN thread', () => {
    const out = normalizeHn([
      {
        title: 'Show HN: My AI invoice workflow',
        url: 'https://example.com/blog',
        objectID: '12345',
        author: 'pg',
        created_at: '2026-06-01T10:00:00Z',
        points: 142,
        num_comments: 37,
        story_text: null,
      },
      { title: null, url: null, objectID: '0', author: 'x', created_at: '', points: 0, num_comments: 0, story_text: null },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      platform: 'hackernews',
      url: 'https://news.ycombinator.com/item?id=12345',
      author: 'pg',
      stats: { points: 142, comments: 37 },
    });
    expect(out[0].excerpt).toContain('https://example.com/blog');
  });
});

describe('normalizeRedditFeed', () => {
  it('parses Reddit Atom entries with author, link and stripped HTML content', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>top scoring links : ClaudeAI</title>
        <entry>
          <author><name>/u/opq</name><uri>https://www.reddit.com/user/opq</uri></author>
          <content type="html">&lt;p&gt;Step 1: paste your CV...&lt;/p&gt;</content>
          <id>t3_abc</id>
          <link href="https://www.reddit.com/r/ClaudeAI/comments/abc/how_i_automated_my_cv/"/>
          <published>2026-06-09T12:00:00+00:00</published>
          <title>How I automated my CV with Claude</title>
        </entry>
      </feed>`;
    const out = normalizeRedditFeed(xml);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      platform: 'reddit',
      author: '/u/opq',
      url: 'https://www.reddit.com/r/ClaudeAI/comments/abc/how_i_automated_my_cv/',
      title: 'How I automated my CV with Claude',
    });
    expect(out[0].excerpt).toContain('Step 1: paste your CV');
    expect(out[0].excerpt).not.toContain('<p>');
  });
});

describe('normalizeDevto', () => {
  it('maps articles', () => {
    const out = normalizeDevto([
      {
        title: 'My AI study workflow',
        url: 'https://dev.to/x/my-ai-study-workflow',
        published_at: '2026-05-20T00:00:00Z',
        description: 'How I study with NotebookLM',
        positive_reactions_count: 55,
        comments_count: 4,
        user: { username: 'amara' },
      },
    ]);
    expect(out[0]).toMatchObject({ platform: 'blog', author: 'amara', stats: { points: 55 } });
  });
});

describe('normalizeFeed', () => {
  it('parses RSS 2.0', () => {
    const xml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Some Blog</title>
      <item><title>An AI workflow post</title><link>https://blog.example/post</link>
      <pubDate>Mon, 01 Jun 2026 10:00:00 GMT</pubDate>
      <description>&lt;p&gt;Steps inside&lt;/p&gt;</description></item>
      </channel></rss>`;
    const out = normalizeFeed(xml);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      title: 'An AI workflow post',
      url: 'https://blog.example/post',
      platform: 'blog',
      excerpt: 'Steps inside',
    });
  });

  it('parses Atom', () => {
    const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
      <title>Simon</title><author><name>Simon Willison</name></author>
      <entry><title>Using LLMs for code</title>
      <link rel="alternate" href="https://simonwillison.net/2026/llms-code/"/>
      <published>2026-06-02T00:00:00Z</published><summary>How I do it</summary></entry>
      </feed>`;
    const out = normalizeFeed(xml);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      url: 'https://simonwillison.net/2026/llms-code/',
      author: 'Simon Willison',
    });
  });
});

describe('normalizeGithub', () => {
  it('keeps only repos with descriptions', () => {
    const out = normalizeGithub([
      {
        full_name: 'a/ai-workflows',
        html_url: 'https://github.com/a/ai-workflows',
        description: 'Curated AI workflows',
        stargazers_count: 900,
        pushed_at: '2026-06-01T00:00:00Z',
        owner: { login: 'a' },
      },
      {
        full_name: 'b/empty',
        html_url: 'https://github.com/b/empty',
        description: null,
        stargazers_count: 5,
        pushed_at: '2026-06-01T00:00:00Z',
        owner: { login: 'b' },
      },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].platform).toBe('github');
  });
});

describe('normalizeYoutube', () => {
  it('builds watch URLs and skips non-video results', () => {
    const out = normalizeYoutube([
      {
        id: { videoId: 'abc123' },
        snippet: {
          title: 'AI workflow tutorial',
          channelTitle: 'TechChannel',
          publishedAt: '2026-05-15T00:00:00Z',
          description: 'Full walkthrough',
        },
      },
      { id: {}, snippet: { title: 'x', channelTitle: 'y', publishedAt: '', description: '' } },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].url).toBe('https://www.youtube.com/watch?v=abc123');
  });
});
