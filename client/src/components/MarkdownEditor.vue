<template>
  <div
    class="rounded-xl border border-slate-200 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all bg-white overflow-hidden shadow-2xs"
  >
    <!-- Editor Toolbar -->
    <div class="flex items-center justify-between px-2.5 py-1.5 bg-slate-50/90 border-b border-slate-200/80 text-slate-600 select-none">
      <!-- Formatting Buttons -->
      <div class="flex items-center space-x-1">
        <!-- Bold -->
        <button
          type="button"
          @click="applyFormat('bold')"
          title="Bold (Ctrl+B)"
          class="p-1.5 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition"
        >
          <Bold class="w-3.5 h-3.5" />
        </button>

        <!-- Italic -->
        <button
          type="button"
          @click="applyFormat('italic')"
          title="Italic (Ctrl+I)"
          class="p-1.5 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition"
        >
          <Italic class="w-3.5 h-3.5" />
        </button>

        <div class="w-px h-3.5 bg-slate-300 mx-1"></div>

        <!-- Bullet List -->
        <button
          type="button"
          @click="applyFormat('list')"
          title="Bullet List"
          class="p-1.5 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition"
        >
          <List class="w-3.5 h-3.5" />
        </button>

        <!-- Code -->
        <button
          type="button"
          @click="applyFormat('code')"
          title="Code formatting"
          class="p-1.5 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition"
        >
          <Code class="w-3.5 h-3.5" />
        </button>

        <!-- Link -->
        <button
          type="button"
          @click="applyFormat('link')"
          title="Insert Link (Ctrl+K)"
          class="p-1.5 rounded-lg hover:bg-slate-200/80 hover:text-slate-900 transition"
        >
          <Link class="w-3.5 h-3.5" />
        </button>
      </div>

      <!-- Mode Switcher: Write vs Preview -->
      <div class="flex items-center space-x-1 bg-slate-200/60 p-0.5 rounded-lg text-xs font-semibold">
        <button
          type="button"
          @click="activeTab = 'write'"
          class="px-2.5 py-1 rounded-md transition"
          :class="activeTab === 'write' ? 'bg-white text-slate-800 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
        >
          Write
        </button>
        <button
          type="button"
          @click="activeTab = 'preview'"
          class="px-2.5 py-1 rounded-md transition inline-flex items-center space-x-1"
          :class="activeTab === 'preview' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-500 hover:text-slate-800'"
        >
          <Eye class="w-3 h-3" />
          <span>Preview</span>
        </button>
      </div>
    </div>

    <!-- Textarea (Write mode) -->
    <div v-show="activeTab === 'write'">
      <textarea
        ref="textareaRef"
        :value="modelValue"
        @input="$emit('update:modelValue', $event.target.value)"
        @keydown="handleKeydown"
        :placeholder="placeholder"
        :required="required"
        :rows="rows"
        class="w-full px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none transition resize-y font-normal leading-relaxed block"
      ></textarea>
    </div>

    <!-- Preview (Preview mode) -->
    <div
      v-show="activeTab === 'preview'"
      class="w-full px-4 py-3 min-h-[6.5rem] max-h-[16rem] overflow-y-auto text-sm markdown-content bg-white"
    >
      <div v-if="modelValue && modelValue.trim()" v-html="previewHtml"></div>
      <p v-else class="text-slate-400 italic text-xs pt-2">
        Nothing to preview yet. Switch back to "Write" to format your response with Markdown.
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { Bold, Italic, List, Code, Link, Eye } from '@lucide/vue';
import { renderMarkdown } from '@/utils/markdown.js';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'Write your answer in markdown...'
  },
  required: {
    type: Boolean,
    default: false
  },
  rows: {
    type: Number,
    default: 3
  }
});

const emit = defineEmits(['update:modelValue']);

const textareaRef = ref(null);
const activeTab = ref('write');

const previewHtml = computed(() => {
  return renderMarkdown(props.modelValue);
});

function applyFormat(type) {
  // If in preview tab, switch to write tab first
  if (activeTab.value === 'preview') {
    activeTab.value = 'write';
  }

  nextTick(() => {
    if (!textareaRef.value) return;
    const el = textareaRef.value;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const value = props.modelValue || '';
    const selectedText = value.substring(start, end);

    let newText = '';
    let newStart = start;
    let newEnd = end;

    switch (type) {
      case 'bold': {
        if (selectedText) {
          newText = value.substring(0, start) + `**${selectedText}**` + value.substring(end);
          newStart = start + 2;
          newEnd = end + 2;
        } else {
          const placeholder = 'bold text';
          newText = value.substring(0, start) + `**${placeholder}**` + value.substring(end);
          newStart = start + 2;
          newEnd = newStart + placeholder.length;
        }
        break;
      }
      case 'italic': {
        if (selectedText) {
          newText = value.substring(0, start) + `*${selectedText}*` + value.substring(end);
          newStart = start + 1;
          newEnd = end + 1;
        } else {
          const placeholder = 'italic text';
          newText = value.substring(0, start) + `*${placeholder}*` + value.substring(end);
          newStart = start + 1;
          newEnd = newStart + placeholder.length;
        }
        break;
      }
      case 'list': {
        if (selectedText) {
          const lines = selectedText.split('\n');
          const allBulleted = lines.every(l => l.startsWith('- '));
          const formattedLines = lines.map(line => (allBulleted ? line.substring(2) : `- ${line}`)).join('\n');
          newText = value.substring(0, start) + formattedLines + value.substring(end);
          newStart = start;
          newEnd = start + formattedLines.length;
        } else {
          // Find start of line
          const before = value.substring(0, start);
          const lastNewline = before.lastIndexOf('\n');
          const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;
          const currentLine = value.substring(lineStart, start);
          if (currentLine.startsWith('- ')) {
            newText = value.substring(0, lineStart) + currentLine.substring(2) + value.substring(start);
            newStart = Math.max(lineStart, start - 2);
            newEnd = newStart;
          } else {
            newText = value.substring(0, lineStart) + '- ' + currentLine + value.substring(start);
            newStart = start + 2;
            newEnd = newStart;
          }
        }
        break;
      }
      case 'code': {
        if (selectedText.includes('\n')) {
          newText = value.substring(0, start) + '```\n' + selectedText + '\n```' + value.substring(end);
          newStart = start + 4;
          newEnd = newStart + selectedText.length;
        } else if (selectedText) {
          newText = value.substring(0, start) + `\`${selectedText}\`` + value.substring(end);
          newStart = start + 1;
          newEnd = end + 1;
        } else {
          const placeholder = 'code';
          newText = value.substring(0, start) + `\`${placeholder}\`` + value.substring(end);
          newStart = start + 1;
          newEnd = newStart + placeholder.length;
        }
        break;
      }
      case 'link': {
        if (selectedText.startsWith('http://') || selectedText.startsWith('https://')) {
          newText = value.substring(0, start) + `[link text](${selectedText})` + value.substring(end);
          newStart = start + 1;
          newEnd = start + 10;
        } else if (selectedText) {
          newText = value.substring(0, start) + `[${selectedText}](https://)` + value.substring(end);
          newStart = end + 3;
          newEnd = newStart + 8;
        } else {
          newText = value.substring(0, start) + `[link text](https://)` + value.substring(end);
          newStart = start + 1;
          newEnd = start + 10;
        }
        break;
      }
    }

    emit('update:modelValue', newText);
    nextTick(() => {
      el.focus();
      el.setSelectionRange(newStart, newEnd);
    });
  });
}

function handleKeydown(e) {
  const isCtrlOrMeta = e.ctrlKey || e.metaKey;
  if (!isCtrlOrMeta) return;

  if (e.key === 'b' || e.key === 'B') {
    e.preventDefault();
    applyFormat('bold');
  } else if (e.key === 'i' || e.key === 'I') {
    e.preventDefault();
    applyFormat('italic');
  } else if (e.key === 'k' || e.key === 'K') {
    e.preventDefault();
    applyFormat('link');
  }
}
</script>
