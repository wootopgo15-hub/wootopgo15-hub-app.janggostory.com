import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchSheetData, getCachedSheetData, submitToGoogleSheets } from '../services/googleSheets';
import { Play, Pause, CheckCircle2, Circle, Clock, Plus, X, Volume2, VolumeX, Loader2, AlertCircle, ExternalLink, Rewind, FastForward } from 'lucide-react';
import ReactPlayer from 'react-player';

const ClassMaterialsPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null);
  const [watchedVideos, setWatchedVideos] = useState<Set<number>>(new Set());
  const [totalWatchTime, setTotalWatchTime] = useState(0); // in seconds

  // Player State
  const playerRef = useRef<any>(null);
  const [playing, setPlaying] = useState(false);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [isReady, setIsReady] = useState(false);

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
      playerRef.current.currentTime = parseFloat((e.target as HTMLInputElement).value) * duration;
    }
  };

  const handleRewind = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.max(0, playerRef.current.currentTime - 10);
    }
  };

  const handleFastForward = () => {
    if (playerRef.current) {
      playerRef.current.currentTime = Math.min(duration, playerRef.current.currentTime + 10);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const currentTime = e.currentTarget.currentTime;
    const d = e.currentTarget.duration;
    if (d && d !== duration) {
      setDuration(d);
    }
    if (!seeking && d > 0) {
      setPlayed(currentTime / d);
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

  const isGoogleDriveUrl = (url: string) => {
    if (!url) return false;
    return url.includes('drive.google.com') || url.includes('docs.google.com/file');
  };

  const isGoogleSlidesUrl = (url: string) => {
    if (!url) return false;
    return url.includes('docs.google.com/presentation');
  };

  const isGoogleSheetsUrl = (url: string) => {
    if (!url) return false;
    return url.includes('docs.google.com/spreadsheets');
  };

  const getSlidesEmbedUrl = (url: string) => {
    if (!url) return '';
    let embedUrl = url;
    if (!url.includes('/embed')) {
      const slideRegex = /\/presentation\/d\/([a-zA-Z0-9_-]+)/;
      const match = url.match(slideRegex);
      if (match && match[1]) {
        embedUrl = `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
      }
    }
    if (embedUrl.includes('/embed') && !embedUrl.includes('rm=minimal')) {
      embedUrl += embedUrl.includes('?') ? '&rm=minimal' : '?rm=minimal';
    }
    return embedUrl;
  };

  const getDriveEmbedUrl = (url: string) => {
    if (!url) return '';
    const driveRegex = /(?:file\/d\/|id=)([a-zA-Z0-9_-]+)/;
    const driveMatch = url.match(driveRegex);
    if (driveMatch && driveMatch[1]) {
      return `https://drive.google.com/file/d/${driveMatch[1]}/preview`;
    }
    return url;
  };

  const getSheetsEmbedUrl = (url: string) => {
    if (!url) return '';
    const sheetRegex = /spreadsheets\/d\/([a-zA-Z0-9_-]+)/;
    const sheetMatch = url.match(sheetRegex);
    if (sheetMatch && sheetMatch[1]) {
      return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/htmlembed?widget=false&chrome=false&headers=false`;
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

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full pb-24 flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Video Player Section */}
        <div className="flex-1 flex flex-col">
          <div 
            className="w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-lg relative group select-none shrink-0"
            onContextMenu={(e) => e.preventDefault()}
          >
            {selectedVideo && selectedVideo['주소'] ? (
              isGoogleSlidesUrl(selectedVideo['주소']) ? (
                <div className="w-full h-full relative flex flex-col bg-gray-900">
                  <iframe
                    src={getSlidesEmbedUrl(selectedVideo['주소'])}
                    className="w-full h-full border-0 flex-1"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  ></iframe>
                </div>
              ) : isGoogleSheetsUrl(selectedVideo['주소']) ? (
                <div className="w-full h-full relative flex flex-col bg-gray-900">
                  <iframe
                    src={getSheetsEmbedUrl(selectedVideo['주소'])}
                    className="w-full h-full border-0 flex-1 bg-white"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  ></iframe>
                </div>
              ) : isGoogleDriveUrl(selectedVideo['주소']) ? (
                <div className="w-full h-full relative flex flex-col bg-gray-900">
                  <iframe
                    src={getDriveEmbedUrl(selectedVideo['주소'])}
                    className="w-full h-full border-0 flex-1"
                    allow="autoplay; fullscreen"
                    allowFullScreen
                    referrerPolicy="no-referrer"
                  ></iframe>
                </div>
              ) : videoError ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                  <h3 className="text-lg font-bold mb-2">영상을 재생할 수 없습니다</h3>
                  <p className="text-sm text-gray-400 mb-6 max-w-md">
                    Google Drive 보안 정책이나 접근 권한 문제로 인해 브라우저에서 직접 재생이 차단되었을 수 있습니다.
                  </p>
                  <a
                    href={selectedVideo['주소']}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold transition-colors"
                  >
                    <ExternalLink className="w-5 h-5" />
                    새 창에서 영상 보기
                  </a>
                </div>
              ) : (
                <div className="w-full h-full relative">
                  {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-sm">
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                    </div>
                  )}
                  <ReactPlayer
                    ref={playerRef}
                    src={getPlayableUrl(selectedVideo['주소'])}
                    playing={playing}
                    volume={volume}
                    muted={muted}
                    width="100%"
                    height="100%"
                    controls={false}
                    onTimeUpdate={handleTimeUpdate}
                    onReady={() => {
                      setIsReady(true);
                      if (playerRef.current) {
                        setDuration(playerRef.current.duration || 0);
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
                    } as any}
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
            <div className="py-5 md:py-6 shrink-0">
              <div className="flex justify-between items-start mb-2">
                <h2 className="text-2xl font-black text-gray-900">{selectedVideo['제목'] || '제목 없음'}</h2>
              </div>
              <p className="text-base text-gray-600 leading-relaxed">{selectedVideo['설명'] || '강의 설명이 없습니다.'}</p>
            </div>
          )}
        </div>

        {/* Playlist Section */}
        <div className="w-full lg:w-96 flex flex-col shrink-0">
          <div className="pb-4 flex items-center justify-between sticky top-0 z-10 bg-[#f8fafc]">
            <h3 className="font-bold text-gray-900 text-lg">강의 목록</h3>
            <span className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
              {watchedVideos.size} / {videos.length} 완료
            </span>
          </div>
          <div className="space-y-3">
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
                      className={`flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all ${
                        isSelected ? 'bg-white border-2 border-indigo-500 shadow-md transform scale-[1.02]' : 'bg-white border border-gray-100 hover:border-indigo-200 hover:shadow-md'
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
      </main>

      {/* Fixed Bottom Controls */}
      {selectedVideo && !videoError && !isGoogleDriveUrl(selectedVideo['주소']) && !isGoogleSlidesUrl(selectedVideo['주소']) && !isGoogleSheetsUrl(selectedVideo['주소']) && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center gap-2 md:gap-4 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            <button 
              onClick={handleRewind} 
              disabled={!isReady}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Rewind className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
            </button>
            
            <button 
              onClick={handlePlayPause} 
              disabled={!isReady}
              className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full transition-colors shadow-md ${!isReady ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
            >
              {playing ? <Pause className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" /> : <Play className="w-5 h-5 md:w-6 md:h-6 ml-1" fill="currentColor" />}
            </button>

            <button 
              onClick={handleFastForward} 
              disabled={!isReady}
              className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors ${!isReady ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <FastForward className="w-4 h-4 md:w-5 md:h-5" fill="currentColor" />
            </button>
          </div>
          
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
              onTouchStart={handleSeekMouseDown as any}
              onTouchEnd={handleSeekMouseUp as any}
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
                <label className="block text-xs font-bold text-gray-700 mb-1">구글 드라이브/슬라이드 주소 (또는 유튜브) <span className="text-red-500">*</span></label>
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
