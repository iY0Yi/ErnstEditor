/**
 * Path utilities for file and directory operations
 * Provides cross-platform path handling and file name operations
 */
export class PathUtils {
  /**
   * Extract file name from file path
   * @param filePath - Full file path
   * @returns File name with extension
   */
  static getFileName(filePath: string): string {
    if (!filePath) return 'Unknown';
    const fileName = filePath.split(/[/\\]/).pop();
    return fileName || 'Unknown';
  }

  /**
   * Extract file name without extension
   * @param filePath - Full file path
   * @returns File name without extension
   */
  static getFileNameWithoutExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? fileName : fileName.substring(0, lastDotIndex);
  }

  /**
   * Extract file extension
   * @param filePath - Full file path
   * @returns File extension with dot (e.g., '.txt') or empty string
   */
  static getFileExtension(filePath: string): string {
    const fileName = this.getFileName(filePath);
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
  }

  /**
   * Extract directory name from path
   * @param dirPath - Directory path
   * @returns Directory name
   */
  static getDirectoryName(dirPath: string): string {
    if (!dirPath) return 'Unknown';
    // Remove trailing slashes and get last segment
    const cleanPath = dirPath.replace(/[/\\]+$/, '');
    const parts = cleanPath.split(/[/\\]/);
    return parts[parts.length - 1] || parts[parts.length - 2] || 'Unknown';
  }

  /**
   * Normalize path separators to forward slashes
   * @param path - Path to normalize
   * @returns Normalized path
   */
  static normalizePath(path: string): string {
    return path.replace(/\\/g, '/');
  }

  /**
   * Generate uniform name for Blender from file path
   * @param filePath - File path
   * @returns Uniform name (e.g., 'u_myShader')
   */
  static generateUniformName(filePath: string): string {
    if (!filePath) return 'u_sliderValue';

    const fileNameWithoutExt = this.getFileNameWithoutExtension(filePath);
    // Sanitize for uniform name (alphanumeric and underscores only)
    const sanitized = fileNameWithoutExt.replace(/[^a-zA-Z0-9_]/g, '_');
    return `u_${sanitized}`;
  }

  /**
   * Get file icon based on file extension
   * @param fileName - File name
   * @returns Material icon name
   */
  static getFileIcon(fileName: string): string {
    const ext = this.getFileExtension(fileName).toLowerCase();

    switch (ext) {
      case '.glsl':
      case '.frag':
      case '.vert':
      case '.comp':
        return 'code';
      case '.js':
      case '.ts':
      case '.jsx':
      case '.tsx':
        return 'javascript';
      case '.json':
        return 'data_object';
      case '.txt':
      case '.md':
        return 'description';
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.gif':
      case '.svg':
        return 'image';
      case '.mp4':
      case '.mov':
      case '.avi':
        return 'movie';
      case '.mp3':
      case '.wav':
      case '.ogg':
        return 'audio_file';
      default:
        return 'description';
    }
  }

  /**
   * Check if file is a shader file
   * @param fileName - File name
   * @returns True if shader file
   */
  static isShaderFile(fileName: string): boolean {
    const ext = this.getFileExtension(fileName).toLowerCase();
    return ['.glsl', '.frag', '.vert', '.comp'].includes(ext);
  }

  /**
   * Check if file is a text file
   * @param fileName - File name
   * @returns True if text file
   */
  static isTextFile(fileName: string): boolean {
    const ext = this.getFileExtension(fileName).toLowerCase();
    const textExtensions = [
      '.txt', '.md', '.json', '.js', '.ts', '.jsx', '.tsx',
      '.glsl', '.frag', '.vert', '.comp', '.html', '.css',
      '.xml', '.yaml', '.yml', '.ini', '.conf', '.log'
    ];
    return textExtensions.includes(ext);
  }

  /**
   * Join path segments with appropriate separator
   * @param segments - Path segments
   * @returns Joined path
   */
  static join(...segments: string[]): string {
    return segments
      .filter(segment => segment && segment.length > 0)
      .join('/')
      .replace(/\/+/g, '/'); // Remove multiple slashes
  }

  /**
   * Get relative path from base to target
   * @param from - Base path
   * @param to - Target path
   * @returns Relative path
   */
  static getRelativePath(from: string, to: string): string {
    const normalizedFrom = this.normalizePath(from);
    const normalizedTo = this.normalizePath(to);

    if (normalizedTo.startsWith(normalizedFrom)) {
      return normalizedTo.substring(normalizedFrom.length).replace(/^\//, '');
    }

    return normalizedTo;
  }
}