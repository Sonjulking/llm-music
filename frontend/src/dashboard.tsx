import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend
} from "chart.js";

import { 
  ThemeProvider, createTheme, CssBaseline, Box, Typography, Button, IconButton, Select, MenuItem, LinearProgress, CircularProgress, Paper, Tooltip as MuiTooltip, Stack, TextField
} from "@mui/material";
import { 
  Home as HomeIcon, 
  UploadFile as UploadFileIcon, 
  PlayArrow as PlayArrowIcon, 
  ThumbDown as ThumbDownIcon, 
  Refresh as RefreshIcon, 
  FavoriteBorder as FavoriteBorderIcon,
  MusicNote as MusicNoteIcon,
  Album as AlbumIcon
} from "@mui/icons-material";

// 동적 API 주소 설정 (외부 접속 허용)
const API_BASE_URL = `http://${window.location.hostname}:8000`;

// API 응답 데이터의 타입
interface AnalysisData {
  report: string;
  recommended_song: string;
  youtube_link: string;
  similarity: number;
  reason: string;
  metrics?: { bpm: number; energy: number; brightness: number; rhythmic_intensity?: number; };
  thumbnail?: string;
}

interface UploadResponse {
  message: string;
  playlist_id: string;
  total_links: number;
}

interface PlaylistInfo {
  name: string;
  created_At: string;
}

type FeedbackChoice = "O" | "X" | "Q";
type Mode = "rds" | "upload";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

// MUI Dark Theme
const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#000000',
      paper: '#181818',
    },
    primary: {
      main: '#1DB954',
    },
    text: {
      primary: '#ffffff',
      secondary: '#b3b3b3',
    },
  },
  typography: {
    fontFamily: '"Circular", "Inter", sans-serif',
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 500,
          textTransform: 'none',
          fontWeight: 'bold',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    }
  },
});

const MetricItem = ({ label, value, desc, color }: {
  label: string,
  value: string | number,
  desc: string,
  color: string
}) => {
  return (
    <MuiTooltip 
      title={
        <Box sx={{ p: 1, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
          <Typography variant="subtitle2" sx={{ color: '#1DB954', fontWeight: 'bold', mb: 0.5 }}>{label}</Typography>
          <Typography variant="body2">{desc}</Typography>
        </Box>
      } 
      placement="top"
      arrow
      PopperProps={{
        sx: {
          '& .MuiTooltip-tooltip': {
            backgroundColor: 'rgba(40, 40, 40, 0.95)',
            border: '1px solid #444',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            fontSize: '12px'
          },
          '& .MuiTooltip-arrow': {
            color: 'rgba(40, 40, 40, 0.95)',
          }
        }
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', cursor: 'help' }}>
        <Typography sx={{ fontSize: '12px', color: 'text.secondary', mb: 0.5 }}>{label}</Typography>
        <Typography sx={{ fontSize: '18px', fontWeight: 'bold', color: color }}>{value}</Typography>
      </Box>
    </MuiTooltip>
  );
};

const SoundRadarChart = ({ metrics }: { metrics: any }) => {
  if (!metrics) return null; 

  const chartData = {
    labels: ["BPM", "Energy", "Brightness", "Rhythm"],
    datasets: [
      {
        label: "Sound DNA",
        data: [
          (metrics.bpm / 200) * 100,      
          metrics.energy * 1000,          
          (metrics.brightness / 5000) * 100, 
          Math.min(((metrics.rhythmic_intensity || 0) / 2.5) * 100, 100) 
        ],
        backgroundColor: "rgba(29, 185, 84, 0.4)", 
        borderColor: "#1DB954",
        borderWidth: 2,
        pointBackgroundColor: "#1DB954",
        pointBorderColor: "#fff",
        pointHoverBackgroundColor: "#fff",
        pointHoverBorderColor: "#1DB954",
      },
    ],
  };

  return (
    <Box sx={{ my: 1.5 }}>
      <Box sx={{ width: '100%', height: 200 }}>
        <Radar
          data={chartData}
          options={{
            maintainAspectRatio: false,
            scales: {
              r: {
                min: 0,
                max: 100,
                ticks: { display: false }, 
                grid: { color: "#333" }, 
                angleLines: { color: "#333" },
                pointLabels: { font: { size: 12, weight: "bold" }, color: "#b3b3b3" }
              }
            },
            plugins: {
              legend: { display: false },
              tooltip: {
                backgroundColor: "#282828",
                titleColor: "#fff",
                bodyColor: "#b3b3b3",
                borderColor: "#333",
                borderWidth: 1,
                callbacks: {
                  label: (context) => {
                    const label = context.label;
                    if (label === "BPM") return `BPM: ${metrics.bpm}`;
                    if (label === "Energy") return `Energy: ${Math.round(metrics.energy * 1000)}`;
                    if (label === "Brightness") return `Brightness: ${Math.round(metrics.brightness)}Hz`;
                    if (label === "Rhythm") return `Rhythm: ${(Number(metrics.rhythmic_intensity || 0)).toFixed(1)}`;
                    return `${label}: ${Math.round(context.raw as number)}`;
                  }
                }
              }
            }
          }}
        />
      </Box>

      {/* Numeric Stats */}
      <Paper
        elevation={0}
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 1,
          mt: 2,
          p: 1.5,
          backgroundColor: "background.paper",
          borderRadius: 2,
          border: "1px solid #333"
        }}
      >
        <MetricItem
          label="BPM"
          value={metrics.bpm}
          color="#1DB954"
          desc="음악의 빠르기(Tempo)입니다.\n• 120 이상: 신나는 댄스/록\n• 90~120: 적당한 그루브 (팝/재즈)\n• 90 이하: 감성적인 발라드/R&B"
        />
        <MetricItem
          label="ENERGY"
          value={Math.round(metrics.energy * 1000)}
          color="#fff"
          desc="소리의 격렬함(0~100)입니다.\n• 70 이상: 꽉 찬 사운드 (일렉, 메탈)\n• 40~70: 균형 잡힌 팝/밴드 사운드\n• 40 이하: 어쿠스틱하고 편안한 분위기"
        />
        <MetricItem
          label="BRIGHT"
          value={Math.round(metrics.brightness)}
          color="#fff"
          desc="음색의 밝기(Hz)입니다.\n• 3000 이상: 시원하고 챙챙거리는 고음\n• 1500~3000: 선명하고 깔끔한 음색\n• 1500 이하: 웅장하고 묵직한 저음 베이스"
        />
        <MetricItem
          label="RHYTHM"
          value={(Number(metrics.rhythmic_intensity || 0)).toFixed(1)}
          color="#fff"
          desc="비트의 강도(명확성)입니다.\n• 1.5 이상: 박자가 뚜렷한 가요/팝\n• 1.0~1.5: 부드러운 리듬감 (재즈/OST)\n• 1.0 미만: 리듬이 흐릿한 클래식/앰비언트"
        />
      </Paper>
    </Box>
  );
};

const MusicDashboard: React.FC = () => {
  const [mode, setMode] = useState<Mode>("rds");
  const [name, setName] = useState<string>("");
  const [playlists, setPlaylists] = useState<PlaylistInfo[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  const [sortOrder, setSortOrder] = useState<"latest" | "name">("name");
  const [playlistId, setPlaylistId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<AnalysisData | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [feedbackLoading, setFeedbackLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("🔍 재생목록 분석 중...");
  const [progress, setProgress] = useState<number>(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  // 진행률 바 컴포넌트
  const ProgressBar = () => (
    <LinearProgress 
      variant="determinate" 
      value={progress} 
      sx={{ 
        width: '100%', 
        mt: 1.5, 
        height: 6, 
        borderRadius: 5, 
        backgroundColor: '#3e3e3e',
        '& .MuiLinearProgress-bar': { backgroundColor: '#1DB954' }
      }} 
    />
  );

  // 저장된 플레이리스트 목록 로드
  const fetchPlaylists = async () => {
    try {
      const res = await axios.get<PlaylistInfo[]>(`${API_BASE_URL}/playlists`);
      setPlaylists(res.data);
    } catch (error) {
      console.error("목록 로드 실패:", error);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, []);

  // 컴포넌트 언마운트 또는 새로고침 시 진행 중인 요청 취소
  useEffect(() => {
    return () => {
      if (abortController) {
        console.log("⚠️ 분석 중단: 페이지 종료 감지");
        abortController.abort();
      }
    };
  }, [abortController]);

  // 모드가 바뀌면 상태 초기화
  useEffect(() => {
    setProgress(0);
    setLoadingMessage("대기 중...");
    setLoading(false);
    setCurrentPage(1);
    if (mode === "rds") fetchPlaylists(); // 모드 전환 시 목록 갱신
  }, [mode]);

  // RDS 재생목록 분석
  const startAnalysis = async (targetName?: string): Promise<void> => {
    const queryName = typeof targetName === "string" ? targetName : name;

    if (!queryName.trim()) return alert("이름을 입력해주세요!");

    if (queryName !== name) setName(queryName);

    if (abortController) abortController.abort();
    const newController = new AbortController();
    setAbortController(newController);

    setLoading(true);
    setProgress(0);
    setLoadingMessage("서버 연결 중...");

    const taskId = `task_${Date.now()}`;
    const evtSource = new EventSource(`${API_BASE_URL}/progress/${taskId}`);

    evtSource.onmessage = (e) => {
      const d = JSON.parse(e.data);
      if (d.error) return;
      setLoadingMessage(d.message);
      setProgress(d.progress);
      if (d.progress >= 100) evtSource.close();
    };

    evtSource.onerror = () => {
      evtSource.close();
    };

    try {
      const res = await axios.get<AnalysisData>(`${API_BASE_URL}/list/${queryName}`, {
        params: { task_id: taskId },
        signal: newController.signal,
      });
      setData(res.data);
    } catch (error: any) {
      if (error.name !== "CanceledError") {
        console.error("분석 실패:", error);
        alert("데이터를 불러오지 못했습니다.");
      }
    } finally {
      evtSource.close();
      setLoading(false);
      setAbortController(null);
    }
  };

  // 파일 업로드 
  const uploadFile = async (): Promise<void> => {
    if (!playlistId.trim()) return alert("ID를 입력해주세요!");
    if (!file) return alert("txt 파일을 선택해주세요!");

    if (abortController) abortController.abort();
    const newController = new AbortController();
    setAbortController(newController);

    setLoading(true);
    setProgress(0);
    setLoadingMessage("업로드 준비 중...");

    let uploadSource: EventSource | null = null;
    let analysisSource: EventSource | null = null;

    try {
      const uploadTaskId = `upload_${playlistId}_${Date.now()}`;

      uploadSource = new EventSource(`${API_BASE_URL}/progress/${uploadTaskId}`);
      uploadSource.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.error) return;
        setLoadingMessage(d.message);
        setProgress(d.progress);
        if (d.progress >= 100 && uploadSource) uploadSource.close();
      };

      uploadSource.onerror = () => {
        if (uploadSource) uploadSource.close();
      };

      const formData = new FormData();
      formData.append("playlist_id", playlistId);
      formData.append("task_id", uploadTaskId);
      formData.append("file", file);

      const uploadRes = await axios.post<UploadResponse>(`${API_BASE_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: newController.signal,
      });

      console.log(`업로드 완료: ${uploadRes.data.total_links}개 곡`);

      if (uploadSource) {
        uploadSource.close();
        uploadSource = null;
      }

      const analysisTaskId = `task_upload_${Date.now()}`;
      setLoadingMessage("🎵 오디오 정밀 분석 시작...");
      setProgress(0);

      analysisSource = new EventSource(`${API_BASE_URL}/progress/${analysisTaskId}`);
      analysisSource.onmessage = (e) => {
        const d = JSON.parse(e.data);
        if (d.error) return;
        setLoadingMessage(d.message);
        setProgress(d.progress);
        if (d.progress >= 100 && analysisSource) analysisSource.close();
      };
      analysisSource.onerror = () => {
        if (analysisSource) analysisSource.close();
      };

      const analysisRes = await axios.get<AnalysisData>(`${API_BASE_URL}/list/${playlistId}`, {
        params: { task_id: analysisTaskId },
        signal: newController.signal,
      });

      setData(analysisRes.data);
      setMode("rds");
      fetchPlaylists(); 
    } catch (error: any) {
      if (error.name !== "CanceledError") {
        console.error("업로드/분석 실패:", error);
        alert(error.response?.data?.detail || "작업에 실패했습니다.");
      }
    } finally {
      if (uploadSource) uploadSource.close();
      if (analysisSource) analysisSource.close();
      setLoading(false);
      setAbortController(null);
    }
  };

  const sendFeedback = async (choice: FeedbackChoice): Promise<void> => {
    if (choice === "Q") {
      setData(null);
      setName("");
      return;
    }
    if (!data) return;

    setFeedbackLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/feedback`, {
        name: name,
        song_title: data.recommended_song,
        feedback: choice,
      });
      alert("반영되었습니다! 다음 추천을 불러옵니다.");
      await startAnalysis();
    } catch (error) {
      console.error("피드백 전송 실패:", error);
      alert("피드백 전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setFeedbackLoading(false);
    }
  };


  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.default', fontFamily: '"Circular", sans-serif' }}>
        
        {/* 🟢 Sidebar */}
        <Box sx={{ width: 240, bgcolor: '#000000', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Logo */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', color: '#fff' }} onClick={() => setData(null)}>
            <Typography variant="h5">🎵</Typography>
            <Typography variant="subtitle1" fontWeight="bold">LLM-Music</Typography>
          </Box>

          {/* Navigation */}
          <Stack spacing={2}>
            <Box 
              onClick={() => { setMode("rds"); setData(null); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', color: mode === "rds" ? '#fff' : 'text.secondary', fontWeight: 'bold', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}
            >
              <HomeIcon /> 
              <Typography fontWeight="bold">Home</Typography>
            </Box>
            <Box 
              onClick={() => { setMode("upload"); setData(null); }}
              sx={{ display: 'flex', alignItems: 'center', gap: 2, cursor: 'pointer', color: mode === "upload" ? '#fff' : 'text.secondary', fontWeight: 'bold', transition: 'color 0.2s', '&:hover': { color: '#fff' } }}
            >
              <UploadFileIcon /> 
              <Typography fontWeight="bold">Import Playlist</Typography>
            </Box>
          </Stack>

          <Box sx={{ height: '1px', bgcolor: '#282828', my: 1 }} />
        </Box>

        {/* 🟢 Main Content */}
        <Box sx={{ flex: 1, bgcolor: '#121212', borderRadius: 2, m: '8px 8px 8px 0', overflowY: 'auto', position: 'relative' }}>
          
          <Box sx={{ p: '24px 32px', pb: 3 }}>
            
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
                <CircularProgress size={40} thickness={4} sx={{ color: '#1DB954' }} />
                <Typography variant="h6" sx={{ mt: 3, color: '#fff' }}>{loadingMessage}</Typography>
                <Box sx={{ width: 300 }}><ProgressBar /></Box>
              </Box>
            )}

            {!loading && !data && mode === "rds" && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h5" fontWeight="bold">Discord Playlists</Typography>
                  <Select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as "latest" | "name");
                      setCurrentPage(1);
                    }}
                    size="small"
                    sx={{ bgcolor: '#3e3e3e', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#555' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#1DB954' } }}
                  >
                    <MenuItem value="name">이름순</MenuItem>
                    <MenuItem value="latest">최신순</MenuItem>
                  </Select>
                </Box>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 3 }}>
                  {(() => {
                    let displayPlaylists = [...playlists];
                    if (sortOrder === "latest") {
                      displayPlaylists.sort((a, b) => {
                        const timeA = a && a.created_At ? new Date(a.created_At).getTime() : 0;
                        const timeB = b && b.created_At ? new Date(b.created_At).getTime() : 0;
                        return timeB - timeA;
                      });
                    } else {
                      displayPlaylists.sort((a, b) => {
                        const nameA = a && a.name ? a.name : String(a);
                        const nameB = b && b.name ? b.name : String(b);
                        return nameA.localeCompare(nameB);
                      });
                    }
                    
                    return displayPlaylists.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
                  })().map((pl) => {
                    const safeName = pl && pl.name ? pl.name : String(pl);
                    return (
                    <Box
                      component={motion.div}
                      whileHover={{ backgroundColor: "#282828" }}
                      key={safeName}
                      onClick={() => startAnalysis(safeName)}
                      sx={{ bgcolor: '#181818', p: 2, borderRadius: 2, cursor: 'pointer', transition: 'background-color 0.3s' }}
                    >
                      <Box sx={{ width: '100%', aspectRatio: '1/1', bgcolor: '#333', borderRadius: 1, mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                        <MusicNoteIcon sx={{ fontSize: 40, color: '#b3b3b3' }} />
                      </Box>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ color: '#fff', mb: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {safeName}
                      </Typography>
                    </Box>
                  )})}
                </Box>
                
                {playlists.length > itemsPerPage && (
                  <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" sx={{ mt: 4 }}>
                    <Button 
                      variant="contained" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1}
                      sx={{ minWidth: 40, bgcolor: currentPage === 1 ? '#333' : '#3e3e3e', color: currentPage === 1 ? '#777' : '#fff', '&:hover': { bgcolor: '#1DB954' } }}
                    >&lt;</Button>
                    {Array.from({ length: Math.ceil(playlists.length / itemsPerPage) }, (_, i) => i + 1).map((pageNum) => (
                      <Button
                        key={pageNum}
                        variant="contained"
                        onClick={() => setCurrentPage(pageNum)}
                        sx={{ minWidth: 40, bgcolor: currentPage === pageNum ? '#1DB954' : '#3e3e3e', color: currentPage === pageNum ? '#000' : '#fff', '&:hover': { bgcolor: '#1DB954', color: '#000' } }}
                      >{pageNum}</Button>
                    ))}
                    <Button 
                      variant="contained" 
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(playlists.length / itemsPerPage), p + 1))} 
                      disabled={currentPage === Math.ceil(playlists.length / itemsPerPage)}
                      sx={{ minWidth: 40, bgcolor: currentPage === Math.ceil(playlists.length / itemsPerPage) ? '#333' : '#3e3e3e', color: currentPage === Math.ceil(playlists.length / itemsPerPage) ? '#777' : '#fff', '&:hover': { bgcolor: '#1DB954' } }}
                    >&gt;</Button>
                  </Stack>
                )}
              </Box>
            )}

            {!loading && !data && mode === "upload" && !uploadResult && (
              <Box sx={{ maxWidth: 600, mx: 'auto', mt: 5 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>Import Playlist</Typography>
                <Paper sx={{ p: 4, borderRadius: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Playlist ID</Typography>
                    <TextField 
                      fullWidth 
                      value={playlistId} 
                      onChange={(e) => setPlaylistId(e.target.value)} 
                      placeholder="플레이리스트 ID 입력"
                      variant="outlined" 
                      sx={{ bgcolor: '#3e3e3e', borderRadius: 1, '& fieldset': { border: 'none' } }}
                    />
                  </Box>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>Upload .txt File</Typography>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<UploadFileIcon />}
                      sx={{ width: '100%', py: 1.5, color: file ? '#1DB954' : '#b3b3b3', borderColor: file ? '#1DB954' : '#333', '&:hover': { borderColor: '#1DB954', color: '#1DB954', bgcolor: 'transparent' }, textTransform: 'none', justifyContent: 'flex-start' }}
                    >
                      {file ? file.name : "파일을 선택해주세요.(.txt)"}
                      <input type="file" hidden accept=".txt" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </Button>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>.txt 파일에 링크하나당 한줄씩 작성해주세요!</Typography>
                  </Box>
                  <Button 
                    component={motion.button}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    variant="contained" 
                    fullWidth 
                    onClick={uploadFile} 
                    disabled={loading} 
                    sx={{ py: 1.5, fontSize: '16px', color: '#000' }}
                  >Upload and Analyze</Button>
                </Paper>
              </Box>
            )}

            <AnimatePresence>
              {uploadResult && (
                <Box 
                  component={motion.div}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  sx={{ maxWidth: 600, mx: 'auto', mt: 5, border: '2px solid #1ed760', p: 4, borderRadius: 2, bgcolor: 'background.paper', textAlign: 'center' }}
                >
                  <Typography variant="h5" sx={{ color: '#1ed760', mb: 2 }} fontWeight="bold">✅ Upload Complete!</Typography>
                  <Typography sx={{ mb: 1 }}><strong>ID:</strong> {uploadResult.playlist_id}</Typography>
                  <Typography sx={{ mb: 3 }}><strong>Tracks analyzed:</strong> {uploadResult.total_links}</Typography>
                  <Button 
                    variant="contained" 
                    onClick={() => { setUploadResult(null); setPlaylistId(""); setFile(null); }}
                    sx={{ color: '#fff' }}
                  >Upload Again</Button>
                </Box>
              )}
            </AnimatePresence>

            {data && (
              <Box component={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Box sx={{ display: 'flex', gap: 4, mb: 4 }}>
                  <Paper sx={{ width: 232, height: 232, bgcolor: '#333', boxShadow: '0 4px 60px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                    {data.thumbnail ? (
                      <img src={data.thumbnail} alt={data.recommended_song} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlbumIcon sx={{ fontSize: 80, color: '#b3b3b3' }} />
                      </Box>
                    )}
                  </Paper>
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <Typography variant="overline" fontWeight="bold">Recommended Track</Typography>
                    <Box>
                      <Typography variant="h2" fontWeight="900" sx={{ mb: 2 }}>{data.recommended_song}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#fff' }}>
                        <Typography variant="body2">{data.similarity}% Match</Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 4, mb: 3 }}>
                  <IconButton
                    component="a"
                    href={data.youtube_link}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ width: 56, height: 56, bgcolor: '#1DB954', color: '#000', '&:hover': { bgcolor: '#1ed760' }, boxShadow: '0 8px 8px rgba(0,0,0,0.3)' }}
                  >
                    <PlayArrowIcon fontSize="large" />
                  </IconButton>
                  <IconButton onClick={() => sendFeedback("O")} sx={{ color: 'text.secondary', '&:hover': { color: '#fff' } }}>
                    <FavoriteBorderIcon fontSize="large" />
                  </IconButton>
                  <Stack direction="row" spacing={2}>
                    <IconButton onClick={() => sendFeedback("X")} disabled={feedbackLoading} sx={{ color: 'text.secondary', '&:hover': { color: '#fff' } }}>
                      <ThumbDownIcon fontSize="large" />
                    </IconButton>
                    <IconButton onClick={() => sendFeedback("Q")} disabled={feedbackLoading} sx={{ color: 'text.secondary', '&:hover': { color: '#1DB954' } }}>
                      <RefreshIcon fontSize="large" />
                    </IconButton>
                  </Stack>
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '7fr 5fr' }, gap: 4 }}>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Analysis Report</Typography>
                    <Typography sx={{ color: 'text.secondary', lineHeight: 1.6, whiteSpace: 'pre-wrap', mb: 3 }}>{data.report}</Typography>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#fff' }}>Why this song?</Typography>
                      <Typography sx={{ color: 'text.secondary' }}>{data.reason}</Typography>
                    </Paper>
                  </Box>
                  <Box>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>Your Sound DNA</Typography>
                    <Paper sx={{ p: 2, borderRadius: 2 }}>
                      <SoundRadarChart metrics={data.metrics} />
                    </Paper>
                  </Box>
                </Box>
              </Box>
            )}

          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default MusicDashboard;