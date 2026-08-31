import { useEffect, useState } from "react";

import { getApiHealth } from "../services/healthService";

type HealthStatus = "loading" | "online" | "offline";

export function useApiHealth() {
  const [status, setStatus] = useState<HealthStatus>("loading");

  useEffect(() => {
    let ignore = false;

    getApiHealth()
      .then(() => {
        if (!ignore) {
          setStatus("online");
        }
      })
      .catch(() => {
        if (!ignore) {
          setStatus("offline");
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  return {
    status,
    isLoading: status === "loading"
  };
}

