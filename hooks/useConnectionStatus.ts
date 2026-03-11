"use client";

import { useEffect, useState } from "react";

interface StatusState {
  ssh: boolean | null;
  oracle: boolean | null;
}

export function useConnectionStatus(pollIntervalMs = 8000) {
  const [status, setStatus] = useState<StatusState>({ ssh: null, oracle: null });

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      try {
        // Oracle status
        const oracleRes = await fetch("http://localhost:5001/api/oracle/status");
        const oracleJson = await oracleRes.json();
        const oracleConnected = !!oracleJson.connected;

        // Treat SSH status as "log analysis endpoint reachable"
        const sshRes = await fetch("http://localhost:5001/api/logs/analysis/log_server");
        const sshJson = await sshRes.json();
        const sshOk = !!sshJson.success;

        if (!cancelled) {
          setStatus({ ssh: sshOk, oracle: oracleConnected });
        }
      } catch {
        if (!cancelled) {
          setStatus({ ssh: false, oracle: false });
        }
      }
    };

    check();
    const id = setInterval(check, pollIntervalMs);

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollIntervalMs]);

  return status;
}

