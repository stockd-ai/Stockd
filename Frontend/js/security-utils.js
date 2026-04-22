// ═══════════════════════════════════════════════
// js/security-utils.js — Shared client-side security helpers
// Provides safe text normalization and minimal rich-text formatting
// for imported data, AI responses, and UI rendering.
// ═══════════════════════════════════════════════

(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory();
    return;
  }

  root.StockdSecurity = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function toText(value) {
    if (value == null) return '';
    return String(value);
  }

  function normalizeUnicode(value) {
    const text = toText(value);
    if (typeof text.normalize === 'function') {
      return text.normalize('NFKC');
    }
    return text;
  }

  function limitLength(value, maxLength) {
    if (!Number.isFinite(maxLength) || maxLength <= 0) return value;
    return value.length > maxLength ? value.slice(0, maxLength) : value;
  }

  function sanitizePlainText(value, options) {
    const settings = options || {};
    const preserveNewlines = Boolean(settings.preserveNewlines);
    const maxLength = Number.isFinite(settings.maxLength) ? settings.maxLength : 500;

    let text = normalizeUnicode(value).replace(/\r\n?/g, '\n');

    if (preserveNewlines) {
      text = text
        .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '')
        .split('\n')
        .map(line => line.replace(/\s+/g, ' ').trim())
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    } else {
      text = text
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return limitLength(text, maxLength);
  }

  function sanitizeSingleLineText(value, maxLength) {
    return sanitizePlainText(value, {
      maxLength: Number.isFinite(maxLength) ? maxLength : 140,
      preserveNewlines: false
    });
  }

  function sanitizeCsvCell(value, maxLength) {
    return sanitizeSingleLineText(value, Number.isFinite(maxLength) ? maxLength : 120);
  }

  function sanitizeEmail(value) {
    return sanitizeSingleLineText(value, 254).toLowerCase();
  }

  function sanitizeUserNote(value, maxLength) {
    return sanitizePlainText(value, {
      maxLength: Number.isFinite(maxLength) ? maxLength : 250,
      preserveNewlines: true
    });
  }

  function escapeHtml(value) {
    return toText(value).replace(/[&<>"'`]/g, char => {
      switch (char) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case '\'': return '&#39;';
        case '`': return '&#96;';
        default: return char;
      }
    });
  }

  function applyInlineFormatting(escapedText) {
    return escapedText.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  function formatRichTextSafe(value) {
    const text = sanitizePlainText(value, { maxLength: 6000, preserveNewlines: true });
    if (!text) return '';

    const blocks = [];
    const listItems = [];

    function flushList() {
      if (!listItems.length) return;
      blocks.push('<ul>' + listItems.map(item => `<li>${item}</li>`).join('') + '</ul>');
      listItems.length = 0;
    }

    text.split('\n').forEach(line => {
      const trimmed = line.trim();

      if (!trimmed) {
        flushList();
        return;
      }

      const bulletMatch = trimmed.match(/^(?:[-*•])\s+(.*)$/);
      if (bulletMatch) {
        listItems.push(applyInlineFormatting(escapeHtml(bulletMatch[1])));
        return;
      }

      flushList();
      blocks.push(`<p>${applyInlineFormatting(escapeHtml(trimmed))}</p>`);
    });

    flushList();
    return blocks.join('');
  }

  function setSelectOptions(selectEl, items, options) {
    if (!selectEl || typeof document === 'undefined') return;

    const settings = options || {};
    const list = Array.isArray(items) ? items : [];
    const getValue = settings.getValue || (item => item && item.value);
    const getLabel = settings.getLabel || (item => item && item.label);
    const placeholder = settings.placeholder;

    selectEl.textContent = '';

    if (placeholder != null) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = sanitizeSingleLineText(placeholder, 80);
      selectEl.appendChild(option);
    }

    list.forEach(item => {
      const option = document.createElement('option');
      option.value = sanitizeSingleLineText(getValue(item), 128);
      option.textContent = sanitizeSingleLineText(getLabel(item), 200);
      selectEl.appendChild(option);
    });
  }

  return {
    escapeHtml,
    formatRichTextSafe,
    sanitizeCsvCell,
    sanitizeEmail,
    sanitizePlainText,
    sanitizeSingleLineText,
    sanitizeUserNote,
    setSelectOptions
  };
});
