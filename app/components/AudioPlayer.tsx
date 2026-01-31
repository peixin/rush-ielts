import { useEffect, useRef, useState } from "react";
import type { WordRecord } from "~/utils/db";

interface AudioPlayerProps {
    playlist: WordRecord[];
    initialIndex: number;
    onClose: () => void;
}

export function AudioPlayer({ playlist, initialIndex, onClose }: AudioPlayerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [error, setError] = useState<string | null>(null);

    const currentWord = playlist[currentIndex];

    // Helper to get audio URL
    const getAudioUrl = (word: WordRecord) => {
        let url = word.audio || "";
        if (!url) {
            // Fallback to Youdao fallback
             return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word.word)}&type=1`;
        }
        if (!url.startsWith("http")) {
            return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(url)}`;
        }
        return url.replace("http://", "https://");
    };

    const playTrack = async (index: number) => {
        if (index < 0 || index >= playlist.length) {
            setIsPlaying(false);
            return;
        }

        const word = playlist[index];
        const url = getAudioUrl(word);

        if (!audioRef.current) return;

        try {
            audioRef.current.src = url;
            audioRef.current.playbackRate = 1.0; 
            await audioRef.current.play();
            setIsPlaying(true);
            setError(null);
            
            updateMediaSession(word, index);

        } catch (e) {
            console.error("Playback error:", e);
            setError("Error playing audio");
            // Auto skip after error?
            setTimeout(() => {
                 handleNext();
            }, 1000);
        }
    };

    const updateMediaSession = (word: WordRecord, index: number) => {
        if (!('mediaSession' in navigator)) return;

        navigator.mediaSession.metadata = new MediaMetadata({
            title: word.word,
            artist: 'Rush IELTS Vocabulary',
            album: 'Vocabulary List',
            artwork: [
                 { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }
            ]
        });
        
        // Define handlers that use the LATEST state/updater
        // Note: In this render cycle, 'index' is fixed. 
        // We rely on the fact that playTrack is called whenever index changes, so handlers are re-bound.

        navigator.mediaSession.setActionHandler('play', () => {
            audioRef.current?.play();
            setIsPlaying(true);
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            audioRef.current?.pause();
            setIsPlaying(false);
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            handlePrev();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            handleNext();
        });
    };

    // Helper for navigation to support looping
    // We use functional state updates inside effects, but here we can just use the state
    // However, since we are inside `playTrack` (closure), we need to be careful.
    // Actually, `playTrack` is called with a specific `index`. 
    // `handleNext` and `handlePrev` below are defined in the component scope, so they use the `currentIndex` state.
    // BUT checking `currentIndex` inside `handleNext` event handler:
    // If we bind `navigator.mediaSession.setActionHandler('nexttrack', handleNext)`, `handleNext` closes over `currentIndex`.
    // Since `playTrack` is callled on `currentIndex` change, and it calls `updateMediaSession`, 
    // the handlers are re-bound with fresh closures. Ideally.

    // Let's define navigation functions that are stable or updated.
    
    // We'll rely on playTrack updating the media session handlers every time.
    // But `handleNext` inside `updateMediaSession` (which is inside `playTrack`) needs to refer to the logic.
    // Simplest: just define the logic inline in `updateMediaSession` using the passed `index`.
    
    // Wait, if I am at index 5. playTrack(5) runs. 
    // It sets NEXT handler to: setCurrentIndex(6).
    // This is correct.
    
    // Logic for next: if at end, go to 0. (Loop)
    const getNextIndex = (idx: number) => {
        if (idx >= playlist.length - 1) return 0; // Loop
        return idx + 1;
    };

    const getPrevIndex = (idx: number) => {
        if (idx <= 0) return playlist.length - 1; // Loop back to end? Or just stop at 0? Standard is 0.
        return idx - 1;
    };

    const handleNext = () => {
        setCurrentIndex(prev => {
            if (prev >= playlist.length - 1) return 0; 
            return prev + 1;
        });
    };

    const handlePrev = () => {
        setCurrentIndex(prev => {
            if (prev <= 0) return 0; // Don't loop backwards? Usually track 1 start stays at 1.
            return prev - 1;
        });
    };

    // Effect to play when index changes
    useEffect(() => {
        playTrack(currentIndex);
    }, [currentIndex]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
             if ('mediaSession' in navigator) {
                 navigator.mediaSession.setActionHandler('play', null);
                 navigator.mediaSession.setActionHandler('pause', null);
                 navigator.mediaSession.setActionHandler('previoustrack', null);
                 navigator.mediaSession.setActionHandler('nexttrack', null);
             }
        };
    }, []);

    // Sync Playback State
    useEffect(() => {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
        }
    }, [isPlaying]);


    // Handle Ended -> Loop
    const handleEnded = () => {
        handleNext(); 
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 shadow-xl z-50 animate-in slide-in-from-bottom duration-300">
            <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mb-1">
                        Playing {currentIndex + 1} / {playlist.length}
                    </div>
                    <div className="font-bold text-gray-900 dark:text-white truncate text-lg">
                        {currentWord?.word}
                    </div>
                    {currentWord?.phonetic && <div className="text-gray-500 text-sm font-mono">{currentWord.phonetic}</div>}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3">
                     <button 
                        onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white disabled:opacity-30"
                    >
                        ⏮
                    </button>

                    <button 
                        onClick={togglePlay}
                        className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg transition-transform active:scale-95"
                    >
                        {isPlaying ? "⏸" : "▶"}
                    </button>

                    <button 
                        onClick={handleNext}
                        className="p-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                    >
                        ⏭
                    </button>
                </div>

                 {/* Close */}
                 <button 
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors ml-2"
                >
                    ✕
                </button>
            </div>

            <audio 
                ref={audioRef}
                onEnded={handleEnded}
                onError={(e) => {
                    console.error("Audio tag error", e);
                    // Skip if error
                    // handleNext();
                }}
            />
        </div>
    );
}
