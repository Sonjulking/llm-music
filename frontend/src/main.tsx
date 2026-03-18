import {createRoot} from "react-dom/client";
import "./index.css";
import MusicDashboard from "./dashboard.tsx";

createRoot(document.getElementById("root")!).render(
  <MusicDashboard/>
);
