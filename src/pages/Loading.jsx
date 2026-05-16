import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Loading() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/graph", { state: { demo: true } });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{
      background: "#070b16",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      color: "#00c8ff",
      fontFamily: "monospace"
    }}>
      <div style={{ fontSize: 24, marginBottom: 20 }}>REPOSENSE</div>
      <div style={{ fontSize: 14, opacity: 0.6 }}>IBM Bob is analyzing...</div>
    </div>
  );
}

// Made with Bob
