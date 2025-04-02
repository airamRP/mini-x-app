import { useState, useEffect, useRef, memo } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from "react-router-dom";
import io from "socket.io-client";

function NewTuitsButton({ displayedNewCount, loadNewTuits }) {
  return (
    displayedNewCount > 0 && (
      <button onClick={loadNewTuits} style={{ margin: "10px 0" }}>
        Hay {displayedNewCount} tuits nuevos
      </button>
    )
  );
}

const TuitItem = memo(function TuitItem({ tuit }) {
  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const tuitDate = new Date(timestamp);
    const diffMs = now - tuitDate;
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return tuitDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else {
      return tuitDate.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
    }
  };

  return (
    <p key={tuit._id}>
      <strong>{tuit.user.nickname}</strong>: {tuit.text} - {formatTimestamp(tuit.timestamp)}
    </p>
  );
});

const Timeline = memo(function Timeline({ tuits, onLogout }) {
  return (
    <div style={{ padding: "20px" }}>
      <h1>Mini-X</h1>
      <Link to="/post">Publicar tuit</Link>
      <button onClick={onLogout} style={{ marginLeft: "10px" }}>
        Logout
      </button>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "400px",
          overflowY: "scroll",
        }}
      >
        {tuits.map((tuit) => (
          <TuitItem key={tuit._id} tuit={tuit} />
        ))}
      </div>
    </div>
  );
});

function PostTuit({ socket, nickname }) {
  const [text, setText] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      const tuit = { text, timestamp: new Date() };
      socket.emit("newTuit", tuit);
      setText("");
      navigate("/");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Publicar un tuit ({nickname})</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe tu tuit"
          style={{ width: "70%", marginRight: "10px" }}
        />
        <button type="submit">Publicar</button>
      </form>
      <button onClick={() => navigate("/")} style={{ marginTop: "10px" }}>
        Volver
      </button>
    </div>
  );
}

function App() {
  const [nickname, setNickname] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);
  const [tuits, setTuits] = useState([]);
  const [displayedNewCount, setDisplayedNewCount] = useState(0);
  const newTuitsCountRef = useRef(0);
  const lastInitialTimestampRef = useRef(null);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on("initialTuits", (initialTuits) => {
        setTuits(initialTuits);
        lastInitialTimestampRef.current = initialTuits[0]?.timestamp || new Date(0);
      });

      socket.on("tuit", (newTuit) => {
        setTuits((prev) => [newTuit, ...prev]);
      });

      socket.on("newTuitAvailable", () => {
        newTuitsCountRef.current += 1;
        if (newTuitsCountRef.current % 3 === 0) {
          setDisplayedNewCount(newTuitsCountRef.current);
        }
      });

      socket.on("newTuits", (newTuits) => {
        setTuits((prev) => {
          const existingIds = new Set(prev.map(t => t._id));
          const filteredNewTuits = newTuits.filter(t => !existingIds.has(t._id));
          return [...filteredNewTuits, ...prev];
        });
        setDisplayedNewCount(0);
        newTuitsCountRef.current = 0;
        lastInitialTimestampRef.current = newTuits[0]?.timestamp || lastInitialTimestampRef.current;
      });

      return () => {
        socket.off("initialTuits");
        socket.off("tuit");
        socket.off("newTuitAvailable");
        socket.off("newTuits");
      };
    }
  }, [isConnected, socket]);

  const handleNicknameSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      const newSocket = io("https://mini-x-api.onrender.com"); // Reemplaza con tu URL de Render
      // const newSocket = io("http://localhost:5000"); // Cambia a Render después
      newSocket.emit("login", nickname.trim(), (response) => {
        if (response.success) {
          setSocket(newSocket);
          setIsConnected(true);
          setNickname(response.nickname);
          setLoginError("");
        } else {
          setLoginError(response.message);
          newSocket.disconnect();
        }
      });
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect(); // Desconecta el WebSocket
    }
    setIsConnected(false);
    setSocket(null);
    setNickname("");
    setTuits([]);
    setDisplayedNewCount(0);
    newTuitsCountRef.current = 0;
    lastInitialTimestampRef.current = null;
  };

  const loadNewTuits = () => {
    socket.emit("loadNewTuits", { lastTimestamp: lastInitialTimestampRef.current });
  };

  if (!isConnected) {
    return (
      <div style={{ padding: "20px" }}>
        <h1>Bienvenido a Mini-X</h1>
        <form onSubmit={handleNicknameSubmit}>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Elige tu nickname"
            style={{ width: "70%", marginRight: "10px" }}
          />
          <button type="submit">Entrar</button>
        </form>
        {loginError && <p style={{ color: "red" }}>{loginError}</p>}
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <>
              <NewTuitsButton displayedNewCount={displayedNewCount} loadNewTuits={loadNewTuits} />
              <Timeline tuits={tuits} onLogout={handleLogout} />
            </>
          }
        />
        <Route
          path="/post"
          element={<PostTuit socket={socket} nickname={nickname} />}
        />
      </Routes>
    </Router>
  );
}

export default App;