/**
 * Validation result interface
 */
interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validation utilities for file names, paths, and other input validation
 */
export class Validation {
  // Windows invalid characters for file names
  private static readonly WINDOWS_INVALID_CHARS = /[<>:"/\\|?*]/;

  // Reserved names in Windows
  private static readonly WINDOWS_RESERVED_NAMES = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ];

  /**
   * Validate file name for cross-platform compatibility
   * @param fileName - File name to validate
   * @returns Validation result
   */
  static validateFileName(fileName: string): ValidationResult {
    if (!fileName || fileName.trim().length === 0) {
      return {
        isValid: false,
        error: 'File name cannot be empty'
      };
    }

    const trimmedName = fileName.trim();

    // Check for Windows invalid characters
    if (this.WINDOWS_INVALID_CHARS.test(trimmedName)) {
      return {
        isValid: false,
        error: 'File name contains invalid characters: < > : " / \\ | ? *'
      };
    }

    // Check for Windows reserved names
    const nameWithoutExt = trimmedName.split('.')[0]?.toUpperCase();
    if (nameWithoutExt && this.WINDOWS_RESERVED_NAMES.includes(nameWithoutExt)) {
      return {
        isValid: false,
        error: `File name "${nameWithoutExt}" is reserved and cannot be used`
      };
    }

    // Check for names that start or end with spaces or dots
    if (trimmedName.startsWith(' ') || trimmedName.endsWith(' ')) {
      return {
        isValid: false,
        error: 'File name cannot start or end with spaces'
      };
    }

    if (trimmedName.startsWith('.') || trimmedName.endsWith('.')) {
      return {
        isValid: false,
        error: 'File name cannot start or end with dots'
      };
    }

    // Check length limits (255 chars for most file systems)
    if (trimmedName.length > 255) {
      return {
        isValid: false,
        error: 'File name is too long (maximum 255 characters)'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate directory path
   * @param dirPath - Directory path to validate
   * @returns Validation result
   */
  static validateDirectoryPath(dirPath: string): ValidationResult {
    if (!dirPath || dirPath.trim().length === 0) {
      return {
        isValid: false,
        error: 'Directory path cannot be empty'
      };
    }

    const trimmedPath = dirPath.trim();

    // Check for invalid characters in path segments
    const segments = trimmedPath.split(/[/\\]/);
    for (const segment of segments) {
      if (segment && segment.length > 0) {
        const result = this.validateFileName(segment);
        if (!result.isValid) {
          return {
            isValid: false,
            error: `Invalid directory name "${segment}": ${result.error}`
          };
        }
      }
    }

    return { isValid: true };
  }

  /**
   * Validate project name
   * @param projectName - Project name to validate
   * @returns Validation result
   */
  static validateProjectName(projectName: string): ValidationResult {
    if (!projectName || projectName.trim().length === 0) {
      return {
        isValid: false,
        error: 'Project name cannot be empty'
      };
    }

    const trimmedName = projectName.trim();

    // Use file name validation as base
    const fileValidation = this.validateFileName(trimmedName);
    if (!fileValidation.isValid) {
      return {
        isValid: false,
        error: `Invalid project name: ${fileValidation.error}`
      };
    }

    // Additional checks for project names
    if (trimmedName.length < 2) {
      return {
        isValid: false,
        error: 'Project name must be at least 2 characters long'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate uniform name for Blender
   * @param uniformName - Uniform name to validate
   * @returns Validation result
   */
  static validateUniformName(uniformName: string): ValidationResult {
    if (!uniformName || uniformName.trim().length === 0) {
      return {
        isValid: false,
        error: 'Uniform name cannot be empty'
      };
    }

    const trimmedName = uniformName.trim();

    // Check if it starts with 'u_'
    if (!trimmedName.startsWith('u_')) {
      return {
        isValid: false,
        error: 'Uniform name must start with "u_"'
      };
    }

    // Check for valid characters (alphanumeric and underscores only)
    if (!/^u_[a-zA-Z0-9_]+$/.test(trimmedName)) {
      return {
        isValid: false,
        error: 'Uniform name can only contain letters, numbers, and underscores'
      };
    }

    // Check length (GLSL has limits)
    if (trimmedName.length > 64) {
      return {
        isValid: false,
        error: 'Uniform name is too long (maximum 64 characters)'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate search query
   * @param query - Search query to validate
   * @returns Validation result
   */
  static validateSearchQuery(query: string): ValidationResult {
    if (!query || query.trim().length === 0) {
      return {
        isValid: false,
        error: 'Search query cannot be empty'
      };
    }

    const trimmedQuery = query.trim();

    // Check minimum length
    if (trimmedQuery.length < 1) {
      return {
        isValid: false,
        error: 'Search query must be at least 1 character long'
      };
    }

    // Check maximum length
    if (trimmedQuery.length > 1000) {
      return {
        isValid: false,
        error: 'Search query is too long (maximum 1000 characters)'
      };
    }

    return { isValid: true };
  }

  /**
   * Validate regex pattern
   * @param pattern - Regex pattern to validate
   * @returns Validation result
   */
  static validateRegexPattern(pattern: string): ValidationResult {
    if (!pattern || pattern.trim().length === 0) {
      return {
        isValid: false,
        error: 'Regex pattern cannot be empty'
      };
    }

    try {
      new RegExp(pattern);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Sanitize file name by removing invalid characters
   * @param fileName - File name to sanitize
   * @returns Sanitized file name
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName) return 'untitled';

    let sanitized = fileName.trim();

    // Replace invalid characters with underscores
    sanitized = sanitized.replace(this.WINDOWS_INVALID_CHARS, '_');

    // Remove leading/trailing dots and spaces
    sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, '');

    // Handle reserved names
    const nameWithoutExt = sanitized.split('.')[0]?.toUpperCase();
    if (nameWithoutExt && this.WINDOWS_RESERVED_NAMES.includes(nameWithoutExt)) {
      sanitized = `file_${sanitized}`;
    }

    // Ensure minimum length
    if (sanitized.length === 0) {
      sanitized = 'untitled';
    }

    // Truncate if too long
    if (sanitized.length > 255) {
      const ext = sanitized.substring(sanitized.lastIndexOf('.'));
      const name = sanitized.substring(0, 255 - ext.length);
      sanitized = name + ext;
    }

    return sanitized;
  }

  /**
   * Check if path is absolute
   * @param path - Path to check
   * @returns True if absolute path
   */
  static isAbsolutePath(path: string): boolean {
    if (!path) return false;

    // Windows: C:\ or UNC \\server\share
    if (/^[a-zA-Z]:[/\\]/.test(path) || /^\\\\/.test(path)) {
      return true;
    }

    // Unix: /path
    if (path.startsWith('/')) {
      return true;
    }

    return false;
  }
}