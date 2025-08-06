import React from 'react';
import { MaterialIcon } from './icons/MaterialIcons';

interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  column: number;
  lineText: string;
  beforeText: string;
  afterText: string;
  matchStart: number;
  matchEnd: number;
}

interface SearchPanelProps {
  onSearchResult: (filePath: string, line: number, column: number) => void;
  projectRoot: string | null;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ onSearchResult, projectRoot }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [searchStats, setSearchStats] = React.useState({ matches: 0, files: 0 });

    // 検索実行
  const performSearch = React.useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([]);
      setSearchStats({ matches: 0, files: 0 });
      return;
    }

    if (!projectRoot) {
      console.warn('No project folder opened for search');
      setResults([]);
      setSearchStats({ matches: 0, files: 0 });
      return;
    }

    setIsSearching(true);
    try {
      // Electron APIを使用してファイル検索（プロジェクトルートを指定）
      if (window.electronAPI) {
        const searchResults = await window.electronAPI.searchInFiles(term, projectRoot);
        setResults(searchResults || []);

        // 統計情報を計算
        const uniqueFiles = new Set(searchResults?.map(r => r.filePath) || []);
        setSearchStats({
          matches: searchResults?.length || 0,
          files: uniqueFiles.size
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
      setSearchStats({ matches: 0, files: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [projectRoot]);

  // デバウンス付き検索
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // テキストの前後を切り取って三点リーダで処理
  const truncateText = (text: string, maxLength: number = 50) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // 検索語句をハイライト
  const highlightMatch = (text: string, matchStart: number, matchLength: number) => {
    const before = text.substring(0, matchStart);
    const match = text.substring(matchStart, matchStart + matchLength);
    const after = text.substring(matchStart + matchLength);

    return (
      <>
        {before}
        <span className="search-highlight">
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div className="search-panel">
            {/* 検索入力エリア */}
      <div className="search-input-area">
        <div className="search-input-container">
          <div className="search-icon-container">
            <MaterialIcon
              name="search"
              size={16}
              className="search-icon"
            />
          </div>
          <input
            type="text"
            placeholder="Search in files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input-field"
          />
          {isSearching && (
            <div className="search-loading-indicator">
              <MaterialIcon
                name="loading"
                size={14}
                className="loading-icon"
              />
            </div>
          )}
        </div>

        {/* 検索統計 */}
        {searchTerm && (
          <div className="search-stats">
            {searchStats.matches} results in {searchStats.files} files
          </div>
        )}
      </div>

      {/* 検索結果リスト */}
      <div className="search-results-container">
        {!projectRoot ? (
          <div className="search-no-results">
            Open a folder to start searching
          </div>
        ) : results.length === 0 && searchTerm && !isSearching ? (
          <div className="search-no-results-message">
            No results found
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={`${result.filePath}-${result.line}-${index}`}
              onClick={() => onSearchResult(result.filePath, result.line, result.column)}
              className="search-result-item"
            >
              {/* ファイル名と行番号 */}
              <div className="search-result-header">
                <div className="search-file-icon-container">
                  <MaterialIcon
                    name="description"
                    size={12}
                  />
                </div>
                <span className="search-result-filename">
                  {truncateText(result.fileName, 25)}
                </span>
                <span className="search-result-location">
                  :{result.line}:{result.column}
                </span>
              </div>

              {/* マッチしたテキスト */}
              <div className="search-result-text">
                {highlightMatch(
                  truncateText(result.lineText.trim(), 60),
                  Math.max(0, result.matchStart - result.lineText.indexOf(result.lineText.trim())),
                  searchTerm.length
                )}
              </div>
            </div>
          ))
        )}
      </div>


    </div>
  );
};

export default SearchPanel;