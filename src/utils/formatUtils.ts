/**
 * Format utilities for text display, search results, and string manipulation
 */
export class FormatUtils {
  /**
   * Format search result line with context around match
   * @param lineContent - Full line content
   * @param matchText - Matched text
   * @param columnStart - Start column of match (0-based)
   * @param columnEnd - End column of match (0-based)
   * @param maxLength - Maximum display length
   * @returns Formatted line parts
   */
  static formatLineContentWithContext(
    lineContent: string,
    matchText: string,
    columnStart: number,
    columnEnd: number,
    maxLength: number = 80
  ): {
    beforeMatch: string;
    afterMatch: string;
    needsStartEllipsis: boolean;
    needsEndEllipsis: boolean;
  } {
    // If line fits within max length, show it all
    if (lineContent.length <= maxLength) {
      return {
        beforeMatch: lineContent.substring(0, columnStart),
        afterMatch: lineContent.substring(columnEnd),
        needsStartEllipsis: false,
        needsEndEllipsis: false
      };
    }

    // Calculate available space for context around the match
    const matchLength = matchText.length;
    const availableForContext = maxLength - matchLength - 6; // Reserve space for "..." on both sides
    const contextLength = Math.floor(availableForContext / 2);

    let startPos = Math.max(0, columnStart - contextLength);
    let endPos = Math.min(lineContent.length, columnEnd + contextLength);

    // Adjust if we have extra space on one side
    if (startPos === 0) {
      // Use extra space on the right
      endPos = Math.min(lineContent.length, endPos + (contextLength - columnStart));
    } else if (endPos === lineContent.length) {
      // Use extra space on the left
      startPos = Math.max(0, startPos - (contextLength - (lineContent.length - columnEnd)));
    }

    return {
      beforeMatch: lineContent.substring(startPos, columnStart),
      afterMatch: lineContent.substring(columnEnd, endPos),
      needsStartEllipsis: startPos > 0,
      needsEndEllipsis: endPos < lineContent.length
    };
  }

  /**
   * Truncate text with ellipsis
   * @param text - Text to truncate
   * @param maxLength - Maximum length
   * @param position - Where to place ellipsis ('end', 'middle', 'start')
   * @returns Truncated text
   */
  static truncateText(
    text: string,
    maxLength: number,
    position: 'end' | 'middle' | 'start' = 'end'
  ): string {
    if (!text || text.length <= maxLength) {
      return text;
    }

    const ellipsis = '...';
    const ellipsisLength = ellipsis.length;

    switch (position) {
      case 'start':
        return ellipsis + text.substring(text.length - maxLength + ellipsisLength);

      case 'middle':
        const sideLength = Math.floor((maxLength - ellipsisLength) / 2);
        const start = text.substring(0, sideLength);
        const end = text.substring(text.length - sideLength);
        return start + ellipsis + end;

      case 'end':
      default:
        return text.substring(0, maxLength - ellipsisLength) + ellipsis;
    }
  }

  /**
   * Format file size in human readable format
   * @param bytes - Size in bytes
   * @returns Formatted size string
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const k = 1024;
    const dm = 2; // decimal places

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const size = parseFloat((bytes / Math.pow(k, i)).toFixed(dm));

    return `${size} ${units[i]}`;
  }

  /**
   * Format timestamp to relative time
   * @param timestamp - Timestamp in milliseconds
   * @returns Relative time string
   */
  static formatRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
      return `${years} year${years > 1 ? 's' : ''} ago`;
    } else if (months > 0) {
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  }

  /**
   * Format number with thousand separators
   * @param num - Number to format
   * @returns Formatted number string
   */
  static formatNumber(num: number): string {
    return new Intl.NumberFormat().format(num);
  }

  /**
   * Format search results summary
   * @param totalMatches - Total number of matches
   * @param fileCount - Number of files containing matches
   * @param searchTime - Search time in milliseconds
   * @returns Summary string
   */
  static formatSearchSummary(
    totalMatches: number,
    fileCount: number,
    searchTime?: number
  ): string {
    const matchText = totalMatches === 1 ? 'match' : 'matches';
    const fileText = fileCount === 1 ? 'file' : 'files';

    let summary = `${this.formatNumber(totalMatches)} ${matchText} in ${fileCount} ${fileText}`;

    if (searchTime !== undefined) {
      summary += ` (${searchTime}ms)`;
    }

    return summary;
  }

  /**
   * Escape HTML special characters
   * @param text - Text to escape
   * @returns Escaped text
   */
  static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Highlight text within a string
   * @param text - Text to highlight in
   * @param searchTerm - Term to highlight
   * @param caseSensitive - Whether search is case sensitive
   * @returns Text with highlight markers
   */
  static highlightText(
    text: string,
    searchTerm: string,
    caseSensitive: boolean = false
  ): string {
    if (!searchTerm) return text;

    const flags = caseSensitive ? 'g' : 'gi';
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, flags);

    return text.replace(regex, '<mark>$1</mark>');
  }

  /**
   * Convert camelCase to readable text
   * @param camelCase - CamelCase string
   * @returns Readable text
   */
  static camelCaseToReadable(camelCase: string): string {
    return camelCase
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Format duration in milliseconds to readable string
   * @param ms - Duration in milliseconds
   * @returns Formatted duration
   */
  static formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    } else {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}h ${minutes}m`;
    }
  }

  /**
   * Format hotkey string for display
   * @param keys - Array of key combinations
   * @returns Formatted hotkey string
   */
  static formatHotkey(keys: string[]): string {
    if (!keys || keys.length === 0) return '';

    const firstKey = keys[0];
    if (!firstKey) return '';

    return firstKey.replace(/\+/g, ' + ');
  }

  /**
   * Pluralize a word based on count
   * @param count - Number count
   * @param singular - Singular form
   * @param plural - Plural form (optional, defaults to singular + 's')
   * @returns Pluralized word
   */
  static pluralize(count: number, singular: string, plural?: string): string {
    if (count === 1) {
      return singular;
    }
    return plural || (singular + 's');
  }

  /**
   * Extract initials from a name
   * @param name - Full name
   * @returns Initials
   */
  static getInitials(name: string): string {
    if (!name) return '';

    return name
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase())
      .slice(0, 2) // Max 2 initials
      .join('');
  }
}