import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, getCachedSheetData, submitToGoogleSheets } from '../services/googleSheets';
import { Play, Pause, CheckCircle2, Circle, Clock, Plus, X, Volume2, VolumeX, Loader2 } from 'lucide-react';
import ReactPlayer from 'react-player';

const ClassMaterialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [totalWatchTime, setTotalWatchTime] = useState(0); // in seconds

  // Player State
  const playerRef = useRef<ReactPlayer>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formTime, setFormTime] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (selectedVideo) {
      setVideoError(false);
      setPlayed(0);
      setPlaying(false);
      setIsReady(false);
      setIsBuffering(false);
    }
  }, [selectedVideo]);

  const handlePlayPause = () => setPlaying(!playing);

  const handleSeekMouseDown = () => setSeeking(true);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    setSeeking(false);
    if (playerRef.current) {
      playerRef.current.seekTo(parseFloat((e.target as HTMLInputElement).value));
    }
  };

  const handleProgress = (state: { played: number }) => {
    if (!seeking) {
      setPlayed(state.played);
    }
    if (playerRef.current) {
      const d = playerRef.current.getDuration();
      if (d && d !== duration) {
        setDuration(d);
      }
    }
  };

  const formatVideoTime = (seconds: number) => {
    if (isNaN(seconds)) return '00:00';
    const date = new Date(seconds * 1000);
    const hh = date.getUTCHours();
    const mm = date.getUTCMinutes();
    const ss = date.getUTCSeconds().toString().padStart(2, '0');
    if (hh) {
      return `${hh}:${mm.toString().padStart(2, '0')}:${ss}`;
    }
    return `${mm.toString().padStart(2, '0')}:${ss}`;
  };

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
  const isGoogleDriveUrl = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com/file');
  };

  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    
    // Handle Google Drive links (file/d/ID or id=ID)
    const driveRegex = /(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/;
    const driveMatch = url.match(driveRegex);
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

  const getPlayableUrl = (url: string) => {
    if (!url) return '';
    const driveRegex = /(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/;
    const driveMatch = url.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`;
    }
    return url;
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formUrl) {
      alert('제목과 주소를 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type: 'CLASS_MATERIALS',
        mode: 'APPEND',
        제목: formTitle,
        주소: formUrl,
        시간: formTime,
        설명: formDesc,
        타임스탬프: new Date().toISOString()
      };

      await submitToGoogleSheets(payload);
      alert('영상이 등록되었습니다.');
      setIsModalOpen(false);
      setFormTitle('');
      setFormUrl('');
      setFormTime('');
      setFormDesc('');
      loadData(); // Refresh list
    } catch (error) {
      console.error('Failed to add video:', error);
      alert('영상 등록에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] font-sans flex flex-col">
      <header className="px-4 pt-6 pb-3 bg-white/90 backdrop-blur-xl flex items-center justify-between sticky top-0 z-40 border-b border-gray-100 safe-top">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/resource')} className="size-8 rounded-full flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-all">
            <span className="material-symbols-outlined font-bold text-lg">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight leading-none">수업준비</h1>
            <p className="text-[8px] text-indigo-500 font-black uppercase tracking-[0.2em] mt-1">Class Materials</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            영상 등록
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-xl">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-indigo-600 font-mono">{formatTime(totalWatchTime)}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full pb-24">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col gap-4">
          <div 
            className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg border border-gray-200 relative group select-none"
            onContextMenu={(e) => e.preventDefault()}
          >
            {selectedVideo && selectedVideo['주소'] ? (
              videoError ? (
                <div className="w-full h-full relative">
                  <iframe
                    src={getEmbedUrl(selectedVideo['주소'])}
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  ></iframe>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  {(!isReady || isBuffering) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                  )}
                  <ReactPlayer
                    ref={playerRef}
                    url={getPlayableUrl(selectedVideo['주소'])}
                    playing={playing}
                    volume={volume}
                    muted={muted}
                    width="100%"
                    height="100%"
                    controls={false}
                    onProgress={handleProgress}
                    onBuffer={() => setIsBuffering(true)}
                    onBufferEnd={() => setIsBuffering(false)}
                    onReady={() => {
                      setIsReady(true);
                      setIsBuffering(false);
                      if (playerRef.current) {
                        setDuration(playerRef.current.getDuration() || 0);
                      }
                    }}
                    onError={() => {
                      setPlaying(false);
                      setVideoError(true);
                    }}
                    onPlay={() => { if (!playing) setPlaying(true); }}
                    onPause={() => { if (playing) setPlaying(false); }}
                    config={{
                      youtube: {
                        playerVars: { showinfo: 0, controls: 0, rel: 0, modestbranding: 1 }
                      },
                      file: {
                        attributes: {
                          controlsList: 'nodownload',
                          onContextMenu: (e: any) => e.preventDefault()
                        }
                      }
                    }}
                  />
                </div>
              )
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                <Play className="w-12 h-12 mb-2 opacity-20" />
                <p className="text-sm font-medium">영상을 선택해주세요</p>
              </div>
            )}
          </div>
          {selectedVideo && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-black text-gray-900">{selectedVideo['제목'] || '제목 없음'}</h2>
              </div>
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

      {/* Fixed Bottom Controls */}
      {selectedVideo && !videoError && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-3 md:gap-6 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <button 
            onClick={handlePlayPause} 
            disabled={!isReady}
            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full transition-colors shrink-0 shadow-md ${!isReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
          >
            {playing ? <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" /> : <Play className="w-5 h-5 md:w-6 md:h-6 ml-1" fill="currentColor" />}
          </button>
          
          <div className="text-xs md:text-sm font-mono text-gray-500 shrink-0 w-10 md:w-14 text-right">
            {formatVideoTime(duration * played)}
          </div>
          
          <div className="flex-1 relative flex items-center group">
            <input
              type="range"
              min={0}
              max={0.999999}
              step="any"
              value={played}
              onMouseDown={handleSeekMouseDown}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              onTouchStart={handleSeekMouseDown}
              onTouchEnd={handleSeekMouseUp}
              className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:h-2 md:hover:h-3 transition-all"
            />
          </div>
          
          <div className="text-xs md:text-sm font-mono text-gray-500 shrink-0 w-10 md:w-14">
            {formatVideoTime(duration)}
          </div>
          
          <div className="hidden md:flex items-center gap-2 shrink-0 ml-2">
            <button onClick={() => setMuted(!muted)} className="text-gray-500 hover:text-indigo-600 transition-colors">
              {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={muted ? 0 : volume}
              onChange={(e) => {
                setVolume(parseFloat(e.target.value));
                setMuted(false);
              }}
              className="w-20 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">영상 등록</h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddVideo} className="p-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">제목 <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="예: 장고 기본 장단 1강"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">구글 드라이브 주소 (또는 유튜브) <span className="text-red-500">*</span></label>
                <input 
                  type="url" 
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">재생 시간 (선택)</label>
                <input 
                  type="text" 
                  value={formTime}
                  onChange={(e) => setFormTime(e.target.value)}
                  placeholder="예: 15:30"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">설명 (선택)</label>
                <textarea 
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="강의에 대한 간단한 설명"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px] resize-none"
                />
              </div>
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? '등록 중...' : '등록하기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassMaterialsPage;
