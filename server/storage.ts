import type { GameState } from "@shared/schema";
import { CARDS, CARD_BY_ID, GROUPS } from "@shared/content";

export function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

type JoinResult =
  | { ok: true; action: "joined" | "reconnected" | "already_member" }
  | { ok: false; reason: "not_found" | "taken" };

export class MemStorage {
  private rooms: Map<string, GameState> = new Map();

  createRoom(facilitatorId: string, facilitatorName: string): string {
    const roomCode = generateRoomCode();
    this.rooms.set(roomCode, {
      roomCode,
      phase: "waiting",
      facilitator: { id: facilitatorId, name: facilitatorName, isConnected: true },
      participant: null,
      assignments: [],
      totalCards: CARDS.length,
    });
    return roomCode;
  }

  getRoom(roomCode: string): GameState | undefined {
    return this.rooms.get(roomCode);
  }

  joinFacilitator(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };
    const isReconnect = !!room.facilitator;
    room.facilitator = { id: socketId, name, isConnected: true };
    return { ok: true, action: isReconnect ? "reconnected" : "joined" };
  }

  /** Single participant seat: same name reclaims it; a different person is blocked. */
  joinParticipant(roomCode: string, socketId: string, name: string): JoinResult {
    const room = this.rooms.get(roomCode);
    if (!room) return { ok: false, reason: "not_found" };
    const p = room.participant;
    if (p) {
      if (p.id === socketId) { p.isConnected = true; return { ok: true, action: "already_member" }; }
      if (p.name === name) { p.id = socketId; p.isConnected = true; return { ok: true, action: "reconnected" }; }
      if (p.isConnected) return { ok: false, reason: "taken" };
      room.participant = { id: socketId, name, isConnected: true };
      return { ok: true, action: "joined" };
    }
    room.participant = { id: socketId, name, isConnected: true };
    return { ok: true, action: "joined" };
  }

  getRoomByAnyId(id: string): GameState | undefined {
    return Array.from(this.rooms.values()).find(
      (room) => room.facilitator?.id === id || room.participant?.id === id
    );
  }

  isFacilitator(room: GameState, id: string): boolean {
    return room.facilitator?.id === id;
  }
  isParticipant(room: GameState, id: string): boolean {
    return room.participant?.id === id;
  }

  setConnected(id: string, isConnected: boolean): GameState | undefined {
    const room = this.getRoomByAnyId(id);
    if (!room) return undefined;
    if (room.facilitator?.id === id) room.facilitator.isConnected = isConnected;
    if (room.participant?.id === id) room.participant.isConnected = isConnected;
    return room;
  }

  start(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isFacilitator(room, byId)) return false;
    if (!room.participant?.isConnected) return false;
    room.phase = "sorting";
    room.assignments = [];
    return true;
  }

  /** Participant places (or moves) a card into a pile. */
  assign(roomCode: string, byId: string, cardId: string, group: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isParticipant(room, byId)) return false;
    if (room.phase !== "sorting" && room.phase !== "overview") return false;
    if (!CARD_BY_ID[cardId] || !(GROUPS as readonly string[]).includes(group)) return false;

    const existing = room.assignments.find((a) => a.cardId === cardId);
    if (existing) existing.group = group;
    else room.assignments.push({ cardId, group });

    // Once every card has been sorted, move on to the overview.
    if (room.phase === "sorting" && room.assignments.length >= room.totalCards) {
      room.phase = "overview";
    }
    return true;
  }

  restart(roomCode: string, byId: string): boolean {
    const room = this.rooms.get(roomCode);
    if (!room || !this.isFacilitator(room, byId)) return false;
    room.phase = "sorting";
    room.assignments = [];
    return true;
  }
}

export const storage = new MemStorage();
