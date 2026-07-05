import { Outlet } from "react-router-dom";
import TopBar from "./components/TopBar";

export default function App() {
  return (
    <div className="app-shell">
      <TopBar />
      <main style={{ flex: 1, minHeight: 0 }}>
        <Outlet />
      </main>
    </div>
  );
}
