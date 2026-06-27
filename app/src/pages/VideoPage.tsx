import { useEffect } from 'react';
import EmptyState from '../ui/EmptyState';
import FloatingDeleteBar from '../features/video/FloatingDeleteBar';
import MultiWatchPanel from '../features/video/MultiWatchPanel';
import VideoBrowseGrid from '../features/video/VideoBrowseGrid';
import VideoModal from '../features/video/VideoModal';
import VideoSidebar from '../features/video/VideoSidebar';
import VideoTabs from '../features/video/VideoTabs';
import { useVideoCuller } from '../hooks/useVideoCuller';
import { useSidebar } from '../SidebarContext';

export default function VideoPage() {
  const setSidebarContent = useSidebar();
  const culler = useVideoCuller();

  useEffect(() => {
    setSidebarContent(
      <VideoSidebar
        root={culler.root}
        total={culler.videos.length}
        filteredCount={culler.filteredSortedVideos.length}
        unmarkedCount={culler.unmarkedCount}
        keepCount={culler.keepCount}
        skipCount={culler.skipCount}
        deleteCount={culler.deleteCount}
        isScanning={culler.isScanning}
        isDeleting={culler.isDeleting}
        onPickFolder={culler.openFolderPicker}
        onScan={culler.scan}
        statusFilter={culler.statusFilter}
        onStatusFilterChange={culler.setStatusFilter}
        sizeFilter={culler.sizeFilter}
        maxSizeBytes={culler.maxSizeBytes}
        onSizeFilterChange={culler.setSizeFilter}
        durationFilter={culler.durationFilter}
        maxDurationSeconds={culler.maxDurationSeconds}
        onDurationFilterChange={culler.setDurationFilter}
        groupByFolder={culler.groupByFolder}
        onGroupByFolderChange={culler.setGroupByFolder}
        folderSortDir={culler.folderSortDir}
        onFolderSortDirChange={culler.setFolderSortDir}
        itemSortBy={culler.itemSortBy}
        onItemSortByChange={culler.setItemSortBy}
        itemSortDir={culler.itemSortDir}
        onItemSortDirChange={culler.setItemSortDir}
        cardSize={culler.cardSize}
        onCardSizeChange={culler.setCardSize}
      />,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    culler.root, culler.isScanning, culler.isDeleting,
    culler.videos.length, culler.keepCount, culler.deleteCount, culler.unmarkedCount, culler.skipCount,
    culler.filteredSortedVideos.length,
    culler.statusFilter, culler.sizeFilter, culler.durationFilter,
    culler.maxSizeBytes, culler.maxDurationSeconds,
    culler.groupByFolder, culler.folderSortDir, culler.itemSortBy, culler.itemSortDir,
    culler.cardSize,
  ]);

  return (
    <div>
      <VideoTabs activeTab={culler.activeTab} count={culler.filteredSortedVideos.length} onChange={culler.setActiveTab} />

      {culler.activeTab === 'browse' && (
        <VideoBrowseGrid
          videos={culler.filteredSortedVideos}
          focusedIndex={culler.focusedIndex}
          cardSize={culler.cardSize}
          groupByFolder={culler.groupByFolder}
          videoRefs={culler.videoRefs}
          onFocus={culler.setFocusedIndex}
          onAction={culler.applyAction}
          onExpand={culler.openModal}
          onDurationLoaded={culler.handleDurationLoaded}
        />
      )}

      {culler.activeTab === 'multiwatch' && (
        <MultiWatchPanel
          videos={culler.filteredSortedVideos}
          pageVideos={culler.multiWatchVideos}
          page={culler.multiWatchPage}
          totalPages={culler.totalMultiWatchPages}
          isPlaying={culler.isMultiWatchPlaying}
          isDeleting={culler.isDeleting}
          refs={culler.multiWatchRefs}
          onTogglePlay={culler.toggleMultiWatchPlay}
          onSeek={culler.seekMultiWatch}
          onPageChange={culler.changeMultiWatchPage}
          onAction={culler.applyAction}
          onExpand={culler.openModal}
          onDurationLoaded={culler.handleDurationLoaded}
        />
      )}

      <FloatingDeleteBar
        count={culler.deleteCount}
        sizeBytes={culler.deleteSize}
        isDeleting={culler.isDeleting}
        isScanning={culler.isScanning}
        onDelete={culler.deleteMarked}
      />

      {!culler.isScanning && culler.videos.length === 0 && (
        <EmptyState title="No videos found" description={'Select a folder and click \u201cRescan\u201d to get started.'} />
      )}

      {!culler.isScanning && culler.videos.length > 0 && culler.filteredSortedVideos.length === 0 && (
        <EmptyState title="No videos match filters" description="Try adjusting your filters in the sidebar." />
      )}

      <VideoModal
        index={culler.modalIndex}
        video={culler.modalVideo}
        filename={culler.modalFilename}
        src={culler.modalSrc}
        action={culler.modalAction}
        totalVideos={culler.videos.length}
        isPlaying={culler.modalIsPlaying}
        videoRef={culler.modalVideoRef}
        onClose={culler.closeModal}
        onIndexChange={culler.setModalIndex}
        onTogglePlay={culler.toggleModalPlay}
        onSeek={culler.seekModal}
        onLoadedMetadata={culler.handleModalVideoLoaded}
        onAction={(action) => culler.modalIndex !== null && culler.applyAction(culler.modalIndex, action)}
      />
    </div>
  );
}
