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
        <span style={{
          background: 'var(--theme-search-highlight, #ff6600)',
          color: 'var(--theme-search-highlightText, #000000)',
          fontWeight: 'bold'
        }}>
          {match}
        </span>
        {after}
      </>
    );
  };

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--theme-sidebar-background, #1e1e1e)',
      color: 'var(--theme-sidebar-foreground, #cccccc)'
    }}>
            {/* 検索入力エリア */}
      <div style={{
        padding: '12px'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          background: 'var(--theme-input-background, #2d2d2d)',
          overflow: 'hidden'
        }}>
          <div style={{
            marginLeft: '8px',
            color: 'var(--theme-input-placeholder, #888888)',
            display: 'flex',
            alignItems: 'center'
          }}>
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
            style={{
              flex: 1,
              padding: '8px 12px 8px 8px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--theme-input-foreground, #ffffff)',
              fontSize: '13px'
            }}
          />
          {isSearching && (
            <div style={{
              marginRight: '8px',
              display: 'flex',
              alignItems: 'center',
              color: 'var(--theme-input-foreground, #ffffff)'
            }}>
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
          <div style={{
            marginTop: '8px',
            fontSize: '11px',
            color: 'var(--theme-sidebar-foreground, #888888)'
          }}>
            {searchStats.matches} results in {searchStats.files} files
          </div>
        )}
      </div>

      {/* 検索結果リスト */}
      <div style={{
        flex: 1,
        overflow: 'auto'
      }}
      className="search-results-list"
      >
        {!projectRoot ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--theme-sidebar-foreground, #888888)',
            fontSize: '12px'
          }}>
            Open a folder to start searching
          </div>
        ) : results.length === 0 && searchTerm && !isSearching ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--theme-sidebar-foreground, #888888)',
            fontSize: '12px'
          }}>
            No results found
          </div>
        ) : (
          results.map((result, index) => (
            <div
              key={`${result.filePath}-${result.line}-${index}`}
              onClick={() => onSearchResult(result.filePath, result.line, result.column)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--theme-sidebar-hoverBackground, #2a2a2a)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {/* ファイル名と行番号 */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '4px',
                fontSize: '11px'
              }}>
                <div style={{
                  marginRight: '6px',
                  color: 'var(--theme-sidebar-foreground, #cccccc)',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <MaterialIcon
                    name="description"
                    size={12}
                  />
                </div>
                <span style={{
                  color: 'var(--theme-sidebar-foreground, #cccccc)',
                  fontWeight: '500'
                }}>
                  {truncateText(result.fileName, 25)}
                </span>
                <span style={{
                  marginLeft: '6px',
                  color: 'var(--theme-sidebar-foreground, #888888)',
                  fontSize: '10px'
                }}>
                  :{result.line}:{result.column}
                </span>
              </div>

              {/* マッチしたテキスト */}
              <div style={{
                fontSize: '12px',
                lineHeight: '1.4',
                color: 'var(--theme-sidebar-foreground, #bbbbbb)',
                fontFamily: 'var(--theme-font-mono, "Overpass Mono", monospace)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
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

            <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-icon {
          animation: spin 1s linear infinite;
        }

        .search-results-list::-webkit-scrollbar {
          display: none;
        }

        .search-results-list {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
      `}</style>
    </div>
  );
};

export default SearchPanel;