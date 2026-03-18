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
  Tooltip,
  Legend
} from "chart.js";
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


ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, Tooltip, Legend);


const MetricItem = ({ label, value, desc, color }: {
  label: string,
  value: string | number,
  desc: string,
  color: string
}) => {
  const [hover, setHover] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
      <div
        style={{ position: "relative", textAlign: "center", cursor: "help", width: "fit-content" }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={{ fontSize: "12px", color: "#b3b3b3", marginBottom: "4px" }}>{label}</div>
        <div style={{ fontSize: "18px", fontWeight: "bold", color: color }}>{value}</div>

        <AnimatePresence>
          {hover && (
            <motion.div
              initial={{ opacity: 0, y: 10, x: "-50%", scale: 0.95 }} // x: "-50%" 추가
              animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}    // x: "-50%" 유지
              exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.95 }}   // x: "-50%" 유지
              transition={{ duration: 0.2 }}
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                // transform: "translateX(-50%)", <- style에서 제거 (motion 속성이 관리함)
                width: "220px",
                backgroundColor: "rgba(40, 40, 40, 0.95)",
                padding: "12px",
                borderRadius: "8px",
                fontSize: "12px",
                lineHeight: "1.5",
                color: "#fff",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                border: "1px solid #444",
                zIndex: 100,
                marginBottom: "12px",
                pointerEvents: "none",
                whiteSpace: "pre-wrap",
                textAlign: "left"
              }}
            >
              <div style={{ fontWeight: "bold", marginBottom: "4px", color: "#1DB954" }}>{label}</div>
              {desc.split(/\\n|\n/).map((line, i) => (
                <div key={i}>{line}</div>
              ))}
              {/* 화살표 (CSS Triangle) */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  marginLeft: "-6px",
                  borderWidth: "6px",
                  borderStyle: "solid",
                  borderColor: "rgba(40, 40, 40, 0.95) transparent transparent transparent"
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const SoundRadarChart = ({ metrics }: { metrics: any }) => {
  if (!metrics) return null; // 데이터 없으면 안보이게

  const chartData = {
    labels: ["BPM", "Energy", "Brightness"],
    datasets: [
      {
        label: "Sound DNA",
        data: [
          (metrics.bpm / 200) * 100,      // 200 BPM 기준 정규화
          metrics.energy * 1000,          // ZCR 수치 보정
          (metrics.brightness / 5000) * 100 // 밝기 수치 보정
        ],
        backgroundColor: "rgba(29, 185, 84, 0.4)", // Spotify Green with opacity
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
    <div style={{ marginTop: "10px", marginBottom: "10px" }}>
      <div style={{ width: "100%", height: "200px" }}>
        <Radar
          data={chartData}
          options={{
            maintainAspectRatio: false,
            scales: {
              r: {
                min: 0,
                max: 100,
                ticks: { display: false }, // 축 눈금 숫자 숨김 (혼동 방지)
                grid: { color: "#333" }, // Dark grid lines
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
                    return `${label}: ${Math.round(context.raw as number)}`;
                  }
                }
              }
            }
          }}
        />
      </div>

      {/* Numeric Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          marginTop: "12px",
          padding: "12px",
          backgroundColor: "#181818",
          borderRadius: "12px",
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
      </div>
    </div>
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
    <div
      style={{
        width: "100%",
        backgroundColor: "#3e3e3e",
        borderRadius: "5px",
        marginTop: "10px",
        height: "6px",
        overflow: "hidden"
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5 }}
        style={{
          height: "100%",
          backgroundColor: "#1DB954",
        }}
      />
    </div>
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
    // 인자로 받은 이름이 있으면 그것을 사용, 없으면 state의 name 사용
    const queryName = typeof targetName === "string" ? targetName : name;

    if (!queryName.trim()) return alert("이름을 입력해주세요!");

    if (queryName !== name) setName(queryName);

    if (abortController) abortController.abort();
    const newController = new AbortController();
    setAbortController(newController);

    setLoading(true);
    setProgress(0);
    setLoadingMessage("서버 연결 중...");

    // SSE 연결 (Task ID 생성)
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

  // 파일 업로드 (2단계 SSE 적용: 업로드 -> 분석)
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
      // 1. 업로드 SSE 연결 (고유 Task ID 생성)
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
      formData.append("task_id", uploadTaskId); // Backend Update 대응
      formData.append("file", file);

      // 1. 업로드 요청
      const uploadRes = await axios.post<UploadResponse>(`${API_BASE_URL}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        signal: newController.signal,
      });

      console.log(`업로드 완료: ${uploadRes.data.total_links}개 곡`);

      // 1단계 종료 및 정리
      if (uploadSource) {
        uploadSource.close();
        uploadSource = null;
      }

      // 2. 오디오 분석 SSE 연결 (새로운 Task ID)
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

      // 2단계 요청 (task_id 포함)
      const analysisRes = await axios.get<AnalysisData>(`${API_BASE_URL}/list/${playlistId}`, {
        params: { task_id: analysisTaskId },
        signal: newController.signal,
      });

      setData(analysisRes.data);
      setMode("rds");
      fetchPlaylists(); // 업로드 성공 시 목록 갱신
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

  // 피드백 전송
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
    <div
      style={{
        display: "flex",
        height: "100vh",
        backgroundColor: "#000000",
        color: "#fff",
        fontFamily: "Circular, sans-serif"
      }}
    >
      {/* 🟢 Sidebar */}
      <div
        style={{
          width: "240px",
          backgroundColor: "#000000",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "24px"
        }
        }
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            cursor: "pointer",
            color: "#fff"
          }}
          onClick={() => setData(null)}
        >
          <span style={{ fontSize: "24px" }}>🎵</span>
          <span style={{ fontSize: "16px", fontWeight: "bold" }}>LLM-MUSIC</span>
        </div>

        {/* Navigation */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            onClick={() => {
              setMode("rds");
              setData(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              cursor: "pointer",
              color: mode === "rds" ? "#fff" : "#b3b3b3",
              fontWeight: "bold",
              transition: "color 0.2s"
            }}
          >
            <span>🏠</span> Home
          </div>
          <div
            onClick={() => {
              setMode("upload");
              setData(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              cursor: "pointer",
              color: mode === "upload" ? "#fff" : "#b3b3b3",
              fontWeight: "bold",
              transition: "color 0.2s"
            }}
          >
            <span>📁</span> Import Playlist
          </div>
        </div>

        <div style={{ height: "1px", backgroundColor: "#282828", margin: "8px 0" }}></div>

        {/* Playlist List (Scrollable) */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >

        </div>
      </div>


      {/* 🟢 Main Content */}
      <div
        style={{
          flex: 1,
          backgroundColor: "#121212",
          borderRadius: "8px",
          margin: "8px 8px 8px 0",
          overflowY: "auto",
          position: "relative"
        }}
      >

        {/* Helper Header */}
        <div
          style={{
            padding: "16px 32px",
            position: "sticky",
            top: 0,
            backgroundColor: "rgba(18, 18, 18, 0.9)",
            zIndex: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
        </div>

        <div style={{ padding: "24px 32px", paddingBottom: "24px" }}>

          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "300px"
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                style={{
                  width: "40px",
                  height: "40px",
                  border: "4px solid #333",
                  borderTop: "4px solid #1DB954",
                  borderRadius: "50%"
                }}
              />
              <h3 style={{ marginTop: "24px", color: "#fff" }}>{loadingMessage}</h3>
              <div style={{ width: "300px" }}><ProgressBar /></div>
            </div>
          )}

          {!loading && !data && mode === "rds" && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "24px", fontWeight: "bold", margin: 0 }}>Discord Playlists</h3>
                <select
                  value={sortOrder}
                  onChange={(e) => {
                    setSortOrder(e.target.value as "latest" | "name");
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: "4px",
                    backgroundColor: "#3e3e3e",
                    color: "#fff",
                    border: "1px solid #555",
                    fontSize: "14px",
                    cursor: "pointer",
                    outline: "none"
                  }}
                >
                  <option value="name">이름순</option>
                  <option value="latest">최신순</option>
                </select>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  gap: "24px"
                }}
              >
                {(() => {
                  let displayPlaylists = [...playlists];
                  // 실제 데이터의 생성일(created_At)을 기준으로 최신순 정렬합니다.
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
                  <motion.div
                    key={safeName}
                    whileHover={{ backgroundColor: "#282828" }}
                    onClick={() => startAnalysis(safeName)}
                    style={{
                      backgroundColor: "#181818",
                      padding: "16px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "background-color 0.3s ease"
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        aspectRatio: "1/1",
                        backgroundColor: "#333",
                        borderRadius: "4px",
                        marginBottom: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "40px",
                        boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                      }}
                    >
                      🎵
                    </div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        color: "#fff",
                        marginBottom: "8px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}
                    >{safeName}</div>
                  </motion.div>
                )})}
              </div>
              
              {/* Pagination Controls */}
              {playlists.length > itemsPerPage && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "32px", alignItems: "center" }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: currentPage === 1 ? "#333" : "#3e3e3e",
                      color: currentPage === 1 ? "#777" : "#fff",
                      border: "none",
                      borderRadius: "5px",
                      cursor: currentPage === 1 ? "not-allowed" : "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    &lt;
                  </button>

                  {Array.from({ length: Math.ceil(playlists.length / itemsPerPage) }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      style={{
                        padding: "8px 14px",
                        backgroundColor: currentPage === pageNum ? "#1DB954" : "#3e3e3e",
                        color: currentPage === pageNum ? "#000" : "#fff",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontWeight: "bold"
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(Math.ceil(playlists.length / itemsPerPage), p + 1))}
                    disabled={currentPage === Math.ceil(playlists.length / itemsPerPage)}
                    style={{
                      padding: "8px 12px",
                      backgroundColor: currentPage === Math.ceil(playlists.length / itemsPerPage) ? "#333" : "#3e3e3e",
                      color: currentPage === Math.ceil(playlists.length / itemsPerPage) ? "#777" : "#fff",
                      border: "none",
                      borderRadius: "5px",
                      cursor: currentPage === Math.ceil(playlists.length / itemsPerPage) ? "not-allowed" : "pointer",
                      fontWeight: "bold"
                    }}
                  >
                    &gt;
                  </button>
                </div>
              )}
            </>
          )}


          {!loading && !data && mode === "upload" && !uploadResult && (
            <div style={{ maxWidth: "600px", margin: "0 auto", marginTop: "40px" }}>
              <h2 style={{ fontSize: "32px", fontWeight: "bold", marginBottom: "32px" }}>Import
                Playlist</h2>
              <div style={{ backgroundColor: "#181818", padding: "32px", borderRadius: "8px" }}>
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      fontSize: "14px"
                    }}
                  >Playlist ID</label>
                  <input
                    value={playlistId}
                    onChange={(e) => setPlaylistId(e.target.value)}
                    placeholder="My Awesome Playlist"
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "4px",
                      border: "1px solid #333",
                      backgroundColor: "#3e3e3e",
                      color: "#fff",
                      fontSize: "16px"
                    }}
                  />
                </div>
                <div style={{ marginBottom: "24px" }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: "8px",
                      fontWeight: "bold",
                      fontSize: "14px"
                    }}
                  >Upload .txt File</label>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    style={{ color: "#b3b3b3" }}
                  />
                  <p style={{ fontSize: "12px", color: "#b3b3b3", marginTop: "8px" }}>Accepted format:
                    .txt file with one YouTube link per line.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={uploadFile}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "500px",
                    border: "none",
                    backgroundColor: "#1DB954",
                    color: "#000",
                    fontWeight: "bold",
                    fontSize: "16px",
                    cursor: "pointer"
                  }}
                >
                  Upload and Analyze
                </motion.button>
              </div>
            </div>
          )}

          {/* Upload Result Modal */}
          <AnimatePresence>
            {uploadResult && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                style={{
                  maxWidth: "600px", margin: "40px auto",
                  border: "2px solid #1ed760",
                  padding: "30px",
                  borderRadius: "10px",
                  backgroundColor: "#181818",
                  textAlign: "center"
                }}
              >
                <h2 style={{ color: "#1ed760", marginTop: 0 }}>✅ Upload Complete!</h2>
                <p><strong>ID:</strong> {uploadResult.playlist_id}</p>
                <p><strong>Tracks analyzed:</strong> {uploadResult.total_links}</p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setUploadResult(null);
                    setPlaylistId("");
                    setFile(null);
                  }}
                  style={{
                    marginTop: "15px",
                    padding: "10px 20px",
                    backgroundColor: "#1ed760",
                    color: "white",
                    border: "none",
                    borderRadius: "5px",
                    cursor: "pointer",
                    fontWeight: "bold"
                  }}
                >
                  Upload Again
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {data && (

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "32px",
                  marginBottom: "32px"
                }}
              >
                <div
                  style={{
                    width: "232px",
                    height: "232px",
                    backgroundColor: "#333",
                    boxShadow: "0 4px 60px rgba(0,0,0,0.5)",
                    overflow: "hidden"
                  }}
                >
                  {data.thumbnail ? (
                    <img
                      src={data.thumbnail}
                      alt={data.recommended_song}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "64px"
                      }}
                    >💿</div>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "100%"
                  }}
                >
                  <div
                    style={{
                      fontSize: "14px",
                      fontWeight: "bold",
                      textTransform: "uppercase"
                    }}
                  >Recommended Track
                  </div>
                  <div>
                    <h1
                      style={{
                        fontSize: "48px",
                        fontWeight: "900",
                        lineHeight: "1",
                        marginBottom: "16px",
                        marginTop: "auto"
                      }}
                    >{data.recommended_song}</h1>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: "14px",
                        color: "#fff"
                      }}
                    >
                      <span style={{ fontWeight: "bold" }}>Muse</span>
                      <span>•</span>
                      <span>{data.similarity}% Match</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "32px",
                  marginBottom: "24px"
                }}
              >
                <a
                  href={data.youtube_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "#1DB954",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#000",
                    fontSize: "24px",
                    cursor: "pointer",
                    boxShadow: "0 8px 8px rgba(0,0,0,0.3)",
                    textDecoration: "none"
                  }}
                >
                  ▶
                </a>
                <div
                  style={{ fontSize: "32px", color: "#b3b3b3", cursor: "pointer" }}
                  onClick={() => sendFeedback("O")}
                >♡
                </div>
                <div style={{ fontSize: "32px", display: "flex", gap: "16px" }}>
                  <button
                    onClick={() => sendFeedback("X")}
                    disabled={feedbackLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#b3b3b3",
                      fontSize: "32px",
                      cursor: "pointer"
                    }}
                  >👎
                  </button>
                  <button
                    onClick={() => sendFeedback("Q")}
                    disabled={feedbackLoading}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#b3b3b3",
                      fontSize: "32px",
                      cursor: "pointer"
                    }}
                  >🔁
                  </button>
                </div>
              </div>

              {/* Analysis Content Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "24px" }}>
                <div>
                  <h3 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Analysis
                    Report</h3>
                  <div
                    style={{
                      color: "#b3b3b3",
                      lineHeight: "1.6",
                      whiteSpace: "pre-wrap",
                      marginBottom: "20px"
                    }}
                  >
                    {data.report}
                  </div>
                  <div
                    style={{
                      backgroundColor: "#282828",
                      padding: "16px",
                      borderRadius: "8px",
                      marginBottom: "16px"
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "16px",
                        fontWeight: "bold",
                        marginBottom: "8px",
                        color: "#fff"
                      }}
                    >Why this song?</h4>
                    <p style={{ color: "#b3b3b3", margin: 0 }}>{data.reason}</p>
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "16px" }}>Your
                    Sound
                    DNA</h3>
                  <div style={{ backgroundColor: "#181818", padding: "16px", borderRadius: "8px" }}>
                    <SoundRadarChart metrics={data.metrics} />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </div>
      </div>
    </div>
  );
};

export default MusicDashboard;