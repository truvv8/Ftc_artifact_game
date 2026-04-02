import { useMemo, useState } from "react";
import QuizApp from "../decode_game.jsx";
import TwoPlayerMode from "./two_player_mode.jsx";
import "./root_app.css";

const modeCards = [
  {
    key: "duel",
    title: "2P Match",
    desc: "Live field, charged shots, fouls, and side reset levers.",
    color: "card--green",
  },
  {
    key: "quiz",
    title: "Rule Quiz",
    desc: "Ref, strategy, scoring scenarios straight from the manual.",
    color: "card--blue",
  },
];

function MenuHero({ onOpen }) {
  return (
    <div className="decode-shell">
      <div className="menu-wrap">
        <div className="badge">FTC 2025-26</div>
        <h1 className="title">Artifact Decode</h1>
        <p className="lead">
          Field scenario simulator. Pick a mode, host a match, or drill referee calls.
        </p>
        <div className="card-stack">
          {modeCards.map((card) => (
            <button
              key={card.key}
              type="button"
              className={`mode-card ${card.color}`}
              onClick={() => onOpen(card.key)}
            >
              <div className="card-body">
                <div className="card-title">{card.title}</div>
                <div className="card-desc">{card.desc}</div>
              </div>
              <div className="card-cta">Open</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" className="back-btn" onClick={onClick}>
      ← Home
    </button>
  );
}

export default function RootApp() {
  const [mode, setMode] = useState("menu");

  const content = useMemo(() => {
    if (mode === "duel") return <TwoPlayerMode />;
    if (mode === "quiz") return <QuizApp />;
    return null;
  }, [mode]);

  return (
    <div className="play-shell">
      {mode === "menu" ? (
        <MenuHero onOpen={setMode} />
      ) : (
        <>
          <BackButton onClick={() => setMode("menu")} />
          {content}
        </>
      )}
    </div>
  );
}
