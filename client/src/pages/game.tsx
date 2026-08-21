import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, SortStage, OverviewBoard } from "@/components/game-parts";
import { CARDS, FRAMING, type Group } from "@shared/content";

export default function Game() {
  const [, params] = useRoute("/game/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "participant");
  const { gameState } = room;

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Joining the session…"}
        </div>
      </div>
    );
  }

  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">
      <RoomBar roleLabel="Participant" roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />
      {children}
    </div></div>
  );

  // ---- Waiting ----
  if (gameState.phase === "waiting") {
    return shell(
      <div className="tg-waiting">
        <span className="tg-eyebrow">You’re in</span>
        <p className="big tg-serif">Hi {room.name} — you’re ready.</p>
        <p className="sub">Your facilitator will begin the session in a moment.</p>
      </div>
    );
  }

  // ---- Sorting ----
  if (gameState.phase === "sorting") {
    const nextCard = CARDS.find((c) => !gameState.assignments.some((a) => a.cardId === c.id)) ?? null;
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Prioritize</span></div>
        <h1 className="tg-topic" style={{ marginBottom: ".5rem" }}>{FRAMING.intro}</h1>
        <p className="tg-standing" style={{ marginBottom: "1rem" }}>{FRAMING.question}</p>
        <SortStage card={nextCard} sorted={gameState.assignments.length} total={gameState.totalCards}
          onAssign={(g: Group) => nextCard && room.assign(nextCard.id, g)} />
      </>
    );
  }

  // ---- Overview ----
  return shell(
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">Your priorities</span></div>
      <h1 className="tg-topic" style={{ marginBottom: ".5rem" }}>Yes · Maybe · No</h1>
      <p className="tg-standing" style={{ marginBottom: "1.2rem" }}>Drag any card between the piles to adjust.</p>
      <OverviewBoard assignments={gameState.assignments} onMove={(cardId, g) => room.assign(cardId, g)} />
    </>
  );
}
