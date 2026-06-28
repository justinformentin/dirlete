import { useState, useCallback, ReactNode } from 'react';
import FilesPage from './pages/FilesPage';
import VideoPage from './pages/VideoPage';
import { SidebarContext } from './SidebarContext';
import { ThemeProvider, useTheme } from './ThemeContext';
import { Folder, Film, Sun, Moon } from 'lucide-react';
import Button from './ui/Button';
import './App.css';

type Page = 'files' | 'video';

function AppShell() {
  const [page, setPage] = useState<Page>('files');
  const [sidebarContent, setSidebarContentState] = useState<ReactNode>(null);
  const { theme, toggleTheme } = useTheme();

  const setSidebarContent = useCallback((content: ReactNode) => {
    setSidebarContentState(content);
  }, []);

  return (
    <SidebarContext.Provider value={setSidebarContent}>
      <div className="flex h-screen overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 bg-sidebar border-r border-border flex flex-col flex-shrink-0">
          {/* App header */}
          <div className="px-4 py-4 flex items-center gap-2">
            <Film className="w-5 h-5 text-purple-400 shrink-0" />
            <span className="text-foreground font-semibold text-base">Dirlete</span>
          </div>

          {/* Page nav */}
          <nav className="px-2 pb-3 border-b border-border space-y-0.5">
            <Button
              variant="unstyled"
              size="sm"
              fullWidth
              className={`flex items-center gap-2.5 px-3 py-2 ${
                page === 'files'
                  ? 'bg-purple-600 text-white'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              }`}
              onClick={() => setPage('files')}
            >
              <Folder className="w-4 h-4 shrink-0" />
              Folder Cleaner
            </Button>
            <Button
              variant="unstyled"
              size="sm"
              fullWidth
              className={`flex items-center gap-2.5 px-3 py-2 ${
                page === 'video'
                  ? 'bg-purple-600 text-white'
                  : 'text-muted hover:text-foreground hover:bg-surface'
              }`}
              onClick={() => setPage('video')}
            >
              <Film className="w-4 h-4 shrink-0" />
              Video Cull
            </Button>
          </nav>

          {/* Page-specific sidebar content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarContent}
          </div>

          {/* Theme toggle */}
          <div className="px-4 py-3 border-t border-border">
            <Button
              variant="unstyled"
              size="sm"
              fullWidth
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-2 text-muted hover:text-foreground hover:bg-surface"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark'
                ? <><Sun className="w-4 h-4 shrink-0" /> Light mode</>
                : <><Moon className="w-4 h-4 shrink-0" /> Dark mode</>}
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {page === 'files' ? <FilesPage /> : <VideoPage />}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppShell />
    </ThemeProvider>
  );
}
