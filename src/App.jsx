import { useState, useEffect } from "react";
import io from "socket.io-client";

// const socket = io("http://localhost:5000"); // Cambiar a Render después

function App() {
  const [tuits, setTuits] = useState([]);
  const [nickname, setNickname] = useState("");
  const [text, setText] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (isConnected && socket) {
      socket.on("initialTuits", (initialTuits) => {
        console.log("Recibidos tuits iniciales:", initialTuits);
        setTuits(initialTuits.reverse()); // Orden inverso (más reciente primero)
      });

      socket.on("tuit", (newTuit) => {
        setTuits((prevTuits) => [newTuit, ...prevTuits]); // Añadir al inicio
      });

      return () => {
        socket.off("initialTuits");
        socket.off("tuit");
      };
    }
  }, [isConnected, socket]);

  const handleNicknameSubmit = (e) => {
    e.preventDefault();
    if (nickname.trim()) {
      // const newSocket = io("http://localhost:5000");
       // Usa tu URL de Render
      const newSocket = io("https://mini-x-api.onrender.com");
      setSocket(newSocket)
      setIsConnected(true);
    }
  };

  const handleTuitSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      socket.emit("newTuit", { nickname, text });
      setText("");
    }
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
      </div>
    );
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Mini-X ({nickname})</h1>
      <form onSubmit={handleTuitSubmit} style={{ marginBottom: "20px" }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un tuit"
          style={{ width: "70%", marginRight: "10px" }}
        />
        <button type="submit">Publicar</button>
      </form>
      <div
        style={{
          border: "1px solid #ccc",
          padding: "10px",
          height: "400px",
          overflowY: "scroll",
        }}
      >
        {tuits.map((tuit) => (
          <p key={tuit._id}>
            <strong>{tuit.nickname}</strong>: {tuit.text} -{" "}
            {new Date(tuit.timestamp).toLocaleTimeString()}
          </p>
        ))}
      </div>
    </div>
  );
}

export default App;