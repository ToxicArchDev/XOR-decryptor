"use client";

import { useRef, useState } from "react";

const DEFAULT_CIPHER = "01 73 14 5B 47 12 40 5A 51 12 56 57 47 46 15 13 15";
const DEFAULT_KEY = "42";

const HEX = "0123456789ABCDEF";
const randByte = () =>
  HEX[(Math.random() * 16) | 0] + HEX[(Math.random() * 16) | 0];
const toHex = (n: number) => n.toString(16).toUpperCase().padStart(2, "0");
const printable = (b: number) => (b >= 32 && b < 127 ? String.fromCharCode(b) : "·");

function parseHex(s: string): number[] {
  // Убираем всё, кроме 16-ричных символов (пробелы, запятые и т.д.)
  const clean = s.replace(/[^0-9A-Fa-f]/g, "");
  
  // Если длина нечётная — значит, где-то ошибка в вводе
  if (clean.length % 2 !== 0) return [];
  
  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    bytes.push(parseInt(clean.slice(i, i + 2), 16));
  }
  return bytes;
}

function parseKey(s: string): number[] {
  // ключ вводится как текст → берём его байты (UTF-8)
  return Array.from(new TextEncoder().encode(s));
}

type Phase = "idle" | "scramble" | "reveal" | "done";

export default function HackerDecoder() {
  const [cipherInput, setCipherInput] = useState(DEFAULT_CIPHER);
  const [keyInput, setKeyInput] = useState(DEFAULT_KEY);
  const [scramble, setScramble] = useState<string[]>([]);
  const [locked, setLocked] = useState(0);
  const [decoded, setDecoded] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<string[]>([]);
  const runRef = useRef(0);

  const busy = phase === "scramble" || phase === "reveal";

  const addLog = (text: string) => setLines((l) => [...l, text]);

  const run = () => {
    const runId = ++runRef.current; // отменяет предыдущий запуск
    const cipher = parseHex(cipherInput);
    const key = parseKey(keyInput);

    setLines([]);
    setDecoded("");
    setLocked(0);
    setScramble(cipher.map(toHex));

    if (!cipher.length || !key.length) {
      setPhase("idle");
      addLog("> error: invalid cipher or key");
      return;
    }

    const result = cipher.map((b, i) => b ^ key[i % key.length]);

    setPhase("scramble");
    addLog("> initializing xor_cipher...");
    setTimeout(() => runRef.current === runId && addLog(`> loading payload [${cipher.map(toHex).join(" ")}]`), 350);
    setTimeout(() => runRef.current === runId && addLog(`> key accepted: "${keyInput}" (${key.map(toHex).join(" ")})`), 750);
    setTimeout(() => runRef.current === runId && addLog("> brute-forcing bytes..."), 1150);

    let lockedCount = 0;
    let tick = 0;
    let revealed = false;

    const scrambleInterval = setInterval(() => {
      if (runRef.current !== runId) {
        clearInterval(scrambleInterval);
        return;
      }
      tick++;

      if (tick % 5 === 0 && lockedCount < cipher.length) {
        lockedCount++;
        setLocked(lockedCount);
      }

      setScramble((prev) =>
        prev.map((_, i) => (i < lockedCount ? toHex(cipher[i]) : randByte()))
      );

      if (lockedCount === cipher.length && !revealed) {
        revealed = true;
        clearInterval(scrambleInterval);

        setTimeout(() => {
          if (runRef.current !== runId) return;
          setPhase("reveal");
          let idx = 0;
          const revealInterval = setInterval(() => {
            if (runRef.current !== runId) {
              clearInterval(revealInterval);
              return;
            }
            idx++;
            setDecoded(result.slice(0, idx).map(printable).join(""));
            if (idx >= result.length) {
              clearInterval(revealInterval);
              setPhase("done");
              addLog(`> decryption complete: ${result.map(printable).join("")}`);
            }
          }, 180);
        }, 400);
      }
    }, 45);
  };

  return (
    <main className="min-h-screen bg-black text-[#00ff41] font-mono flex items-center justify-center p-4 relative overflow-hidden flicker">
      <div className="pointer-events-none fixed inset-0 scanlines opacity-60" />
      <div className="pointer-events-none fixed inset-0 bg-glow" />

      <div className="w-full max-w-2xl relative z-10">
        <div className="border border-[#00ff41]/50 bg-black/80 backdrop-blur-sm rounded-sm card-glow">
          {/* Заголовок */}
          <div className="flex justify-between items-center text-xs text-[#00ff41]/60 px-5 py-2 border-b border-[#00ff41]/30">
            <span>┌─[ decryptor.sh ]</span>
            <span className="animate-pulse">
              {phase === "done"
                ? "● READY"
                : busy
                ? "● PROCESSING"
                : "● IDLE"}
            </span>
          </div>

          <div className="p-5 space-y-4">
            {/* Cipher input */}
            <div>
              <label className="text-[#00ff41]/50 text-xs block mb-1">
                cipher_hex <span className="text-[#00ff41]/30">(space-separated bytes)</span>
              </label>
              <input
                type="text"
                value={cipherInput}
                onChange={(e) => setCipherInput(e.target.value)}
                disabled={busy}
                spellCheck={false}
                className="w-full bg-black border border-[#00ff41]/40 focus:border-[#00ff41] outline-none px-3 py-2 text-[#00ff41] tracking-widest placeholder-[#00ff41]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="03 00 15 07 0A 78"
              />
            </div>

            {/* Key input */}
            <div>
              <label className="text-[#00ff41]/50 text-xs block mb-1">
                key <span className="text-[#00ff41]/30">(ascii text)</span>
              </label>
              <input
                type="text"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                disabled={busy}
                spellCheck={false}
                className="w-full bg-black border border-[#00ff41]/40 focus:border-[#00ff41] outline-none px-3 py-2 text-[#00ff41] tracking-widest placeholder-[#00ff41]/30 disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="KEY"
              />
            </div>

            {/* Кнопка */}
            <button
              onClick={run}
              disabled={busy}
              className="w-full border border-[#00ff41] text-[#00ff41] py-2 tracking-[0.3em] text-sm hover:bg-[#00ff41] hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#00ff41]"
            >
              {busy ? "> PROCESSING..." : "> DECRYPT"}
            </button>

            {/* Вывод байтов */}
            <div>
              <div className="text-[#00ff41]/50 text-xs mb-1">cipher_bytes</div>
              <div className="text-2xl tracking-widest min-h-[2rem]">
                {scramble.length === 0 ? (
                  <span className="text-[#00ff41]/30">-- -- -- -- -- --</span>
                ) : (
                  scramble.map((b, i) => (
                    <span
                      key={i}
                      className={i < locked ? "text-[#00ff41] glow" : "text-[#00ff41]/40"}
                    >
                      {b}{" "}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-dashed border-[#00ff41]/30" />

            {/* Output */}
            <div>
              <div className="text-[#00ff41]/50 text-xs mb-1">output</div>
              <div className="text-4xl font-bold tracking-widest glow min-h-[3rem]">
                {decoded || <span className="text-[#00ff41]/30">......</span>}
                {phase !== "idle" && (
                  <span className="inline-block w-3 h-8 bg-[#00ff41] ml-1 align-middle animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Лог */}
        <div className="mt-4 text-xs text-[#00ff41]/60 space-y-1 min-h-[4rem]">
          {lines.length === 0 && phase === "idle" && (
            <div className="text-[#00ff41]/40">
              $ TEST COMPLETE!!! █
            </div>
          )}
          {lines.map((line, i) => (
            <div key={i} className="truncate">
              {line}
            </div>
          ))}
          {busy && (
            <span className="inline-block w-2 h-3 bg-[#00ff41]/70 animate-pulse" />
          )}
        </div>
      </div>
    </main>
  );
}