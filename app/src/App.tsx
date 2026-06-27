import { useState } from 'react';
import FilesPage from './pages/FilesPage';
import VideoPage from './pages/VideoPage';
import './App.css';

type Page = 'files' | 'video';

function PageRenderer({ page }: { page: Page }) {
  switch (page) {
    case 'files':
      return <FilesPage />;
    case 'video':
      return <VideoPage />;
    default:
      return null;
  }
}

export default function App() {
  const [page, setPage] = useState<Page>('files');

  const tabClass = (p: Page) =>
    [
      'px-5 py-2 rounded-lg font-medium text-sm transition-colors',
      page === p
        ? 'bg-sky-600 text-white shadow'
        : 'text-gray-600 hover:bg-gray-100',
    ].join(' ');

  return (
    <div className="max-w-7xl mx-auto p-6 lg:p-8">
      {/* Header */}
      <div className="bg-white p-6 lg:p-8 rounded-2xl shadow-soft hover:shadow-soft-lg transition-shadow duration-300 mb-6">
        <h1 className="text-3xl font-bold bg-primary mb-2">Dirlete</h1>
        <p className="text-sm text-gray-600 mb-4">
          Delete node_modules and other folders efficiently
        </p>
        <div className="flex gap-2">
          <button
            className={tabClass('files')}
            onClick={() => setPage('files')}
          >
            Folder Cleaner
          </button>
          <button
            className={tabClass('video')}
            onClick={() => setPage('video')}
          >
            Video Culler
          </button>
        </div>
      </div>

      <PageRenderer page={page} />
    </div>
  );
}
