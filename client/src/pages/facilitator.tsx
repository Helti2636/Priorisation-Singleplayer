import { type ReactNode } from "react";
import { useRoute } from "wouter";
import { useRoom } from "@/lib/useRoom";
import { RoomBar, OverviewBoard } from "@/components/game-parts";
import { FRAMING, GROUPS, GROUP_LABEL, CARD_BY_ID, type Group } from "@shared/content";
import { printHtml, esc } from "@/lib/print";

const COLORS: Record<Group, [string, string]> = {
  yes: ["#dfe8d2", "#57703e"],
  maybe: ["#f1e6c6", "#927016"],
  no: ["#f4ddd0", "#a6552f"],
};

export default function Facilitator() {
  const [, params] = useRoute("/facilitator/:roomCode");
  const roomCode = params?.roomCode ?? "";
  const room = useRoom(roomCode, "facilitator");
  const { gameState } = room;

  if (!gameState) {
    return (
      <div className="tg-loading">
        <div style={{ textAlign: "center" }}>
          <div className="tg-spin" />
          {room.error ? room.error : "Opening your session…"}
        </div>
      </div>
    );
  }

  const participant = gameState.participant;
  const ready = !!participant?.isConnected;
  const nameOf = (cardId: string) => CARD_BY_ID[cardId]?.name ?? cardId;
  const cardsIn = (g: Group) => gameState.assignments.filter((a) => a.group === g);

  const overviewDoc = () => {
    const col = (g: Group) => {
      const [bg, ink] = COLORS[g];
      const items = cardsIn(g)
        .map((a) => `<div style="background:#fffdf8;border:1px solid #e0d3bd;border-radius:8px;padding:7px 10px;margin-bottom:6px;font:500 13px/1.3 Georgia,serif;color:#241d12;">${esc(nameOf(a.cardId))}</div>`)
        .join("") || `<div style="color:#8a7a63;font-size:13px;">—</div>`;
      return `<div style="background:${bg};border-radius:12px;padding:12px;break-inside:avoid;">
        <div style="font:600 12px/1.2 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:${ink};margin-bottom:8px;">${GROUP_LABEL[g]}</div>${items}</div>`;
    };
    return `<p class="k">Prioritization</p><h1>Yes · Maybe · No</h1>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:12px;">${GROUPS.map(col).join("")}</div>
      <p class="foot">Saved ${esc(new Date().toLocaleString())}</p>`;
  };

  const shell = (children: ReactNode) => (
    <div className="tg-app"><div className="tg-wrap">
      <RoomBar roleLabel={`Facilitator · ${room.name}`} roomCode={roomCode} onLeave={room.leave} onCopy={room.copyCode} />
      {children}
    </div></div>
  );

  // ---- Lobby ----
  if (gameState.phase === "waiting") {
    return shell(
      <>
        <div className="tg-framing">
          <span className="tg-eyebrow">Before we begin</span>
          <p className="intro tg-serif">{FRAMING.intro}</p>
          <p className="note">Share the room code <strong>{roomCode}</strong> — your participant joins from the home page.</p>
        </div>
        <div className="tg-section-label"><span className="tg-eyebrow">Participant</span></div>
        {participant ? (
          <div className="tg-roster">
            <span className={`tg-pchip ${!participant.isConnected ? "off" : ""}`}>
              <span className="av v0">{participant.name.charAt(0).toUpperCase()}</span>{participant.name}
            </span>
          </div>
        ) : (
          <p className="tg-empty">Waiting for your participant to join…</p>
        )}
        <div className="tg-controls"><div className="buttons">
          <button className="tg-btn" onClick={room.start} disabled={!ready}>
            {ready ? "Start the session →" : "Waiting for a participant"}
          </button>
        </div></div>
      </>
    );
  }

  // ---- Sorting (facilitator follows along) ----
  if (gameState.phase === "sorting") {
    return shell(
      <>
        <div className="tg-round-line"><span className="tg-eyebrow">Live · sorting ({gameState.assignments.length} of {gameState.totalCards})</span></div>
        <h1 className="tg-topic" style={{ marginBottom: "1.2rem" }}>Following along</h1>
        <OverviewBoard assignments={gameState.assignments} onMove={() => {}} readOnly />
      </>
    );
  }

  // ---- Overview + exports ----
  return shell(
    <>
      <div className="tg-round-line"><span className="tg-eyebrow">Complete · the priorities</span></div>
      <h1 className="tg-topic" style={{ marginBottom: "1.2rem" }}>Yes · Maybe · No</h1>
      <OverviewBoard assignments={gameState.assignments} onMove={() => {}} readOnly />
      <div className="tg-controls" style={{ marginTop: "1.6rem" }}><div className="buttons">
        <button className="tg-btn" onClick={() => printHtml("Prioritization", overviewDoc())}>Save as PDF</button>
        <button className="tg-btn ghost" onClick={room.restart}>Run it again</button>
        <button className="tg-btn ghost" onClick={room.leave}>End session</button>
      </div></div>
    </>
  );
}
