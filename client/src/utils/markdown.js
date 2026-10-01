import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked
marked.setOptions({
  breaks: true, // line breaks on single newline
  gfm: true
});

// Custom marked extension to style @username mentions
const mentionExtension = {
  name: 'mention',
  level: 'inline',
  start(src) {
    const match = src.match(/(?:^|[^a-zA-Z0-9_@])@([a-zA-Z0-9_]+(?:[.-][a-zA-Z0-9_]+)*)/);
    if (!match) return -1;
    const atIndex = match[0].indexOf('@');
    return match.index + atIndex;
  },
  tokenizer(src) {
    const rule = /^@([a-zA-Z0-9_]+(?:[.-][a-zA-Z0-9_]+)*)/;
    const match = rule.exec(src);
    if (match) {
      return {
        type: 'mention',
        raw: match[0],
        username: match[1]
      };
    }
  },
  renderer(token) {
    return `<span class="mention-badge inline-flex items-center font-semibold px-1.5 py-0.5 rounded-md text-xs bg-indigo-50 text-indigo-700 border border-indigo-200/80 transition-colors">@${token.username}</span>`;
  }
};

marked.use({ extensions: [mentionExtension] });

// Configure DOMPurify hook to open links in new tabs safely
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * Render Markdown content to safe sanitized HTML
 * @param {string} content
 * @returns {string} Safe HTML string
 */
export function renderMarkdown(content) {
  if (!content || typeof content !== 'string') return '';
  try {
    const rawHtml = marked.parse(content);
    return DOMPurify.sanitize(rawHtml);
  } catch (err) {
    console.error('Markdown rendering error:', err);
    return content;
  }
}
