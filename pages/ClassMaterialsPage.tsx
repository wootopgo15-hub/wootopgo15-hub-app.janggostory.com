import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, getCachedSheetData } from '../services/googleSheets';
import { Play, CheckCircle2, Circle, Clock } from 'lucide-react';

const ClassMaterialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [totalWatchTime, setTotalWatchTime] = useState(0); // in seconds

  useEffect(() => {
    const cached = getCachedSheetData('CLASS_MATERIALS');
    if (cached.length > 0) {
      setVideos(cached);
      if (cached.length > 0) setSelectedVideo(cached[0]);
    }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSheetData('CLASS_MATERIALS', true);
      setVideos(data);
      if (data.length > 0 && !selectedVideo) {
        setSelectedVideo(data[0]);
      }
    } catch (error) {
      console.error('Failed to load class materials:', error);
    } finally {
      setLoading(false);
    }
  };

  // Simulate watching time (increment every second while a video is selected)
  useEffect(() => {
    if (!selectedVideo) return;
    const timer = setInterval(() => {
      setTotalWatchTime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedVideo]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleWatched = (index: number) => {
    setWatchedVideos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Extract Google Drive Video ID to embed if possible
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    // Handle Google Drive links
    const driveMatch = url.match(/\/file\/d\/(.+?)\//);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    // Handle YouTube links as fallback
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    return url;
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans flex flex-col">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/resource')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">장고 스타 강사 되는 방</h1>
            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-1">Class Materials</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl">
          <Clock className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-600 font-mono">{formatTime(totalWatchTime)}</span>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative">
            {selectedVideo && selectedVideo['주소'] ? (
              <iframe
                src={getEmbedUrl(selectedVideo['주소'])}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen"
                allowFullScreen
              ></iframe>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <Play className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm font-medium">영상을 선택해주세요</p>
              </div>
            )}
          </div>
          {selectedVideo && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-xl font-black text-gray-900 mb-2">{selectedVideo['제목'] || '제목 없음'}</h2>
              <p className="text-sm text-gray-500">{selectedVideo['설명'] || '강의 설명이 없습니다.'}</p>
            </div>
          )}
        </div>

        {/* Playlist Section */}
        <div className="w-full lg:w-96 flex flex-col gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full max-h-[calc(100vh-12rem)]">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">강의 목록</h3>
              <span className="text-xs font-medium text-gray-500">
                {watchedVideos.size} / {videos.length} 완료
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {loading && videos.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">목록을 불러오는 중...</div>
              ) : videos.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">등록된 강의가 없습니다.</div>
              ) : (
                videos.map((video, idx) => {
                  const isSelected = selectedVideo === video;
                  const isWatched = watchedVideos.has(idx);
                  return (
                    <div 
                      key={idx}
                      onClick={() => setSelectedVideo(video)}
                      className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-gray-50 border border-transparent'
                      }`}
                    >
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleWatched(idx);
                        }}
                        className="mt-0.5 shrink-0"
                      >
                        {isWatched ? (
                          <CheckCircle2 className="w-5 h-5 text-indigo-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-300 hover:text-indigo-400" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-indigo-900' : 'text-gray-700'}`}>
                          {video['제목'] || `강의 ${idx + 1}`}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {video['시간'] || '시간 미상'}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="shrink-0">
                          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ClassMaterialsPage;
