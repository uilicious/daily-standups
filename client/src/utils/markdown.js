import { marked } from 'marked';
import DOMPurify from 'dompurify';

// Configure marked
marked.setOptions({
  breaks: true, // line breaks on single newline
  gfm: true
});

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
