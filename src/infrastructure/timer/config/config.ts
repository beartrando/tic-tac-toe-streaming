export const timerConfig = {
    iddleWebsocketTimeLimit: Number(process.env.IDDLE_WEBSOCKET_TIME_LIMIT ?? 30),

    battleIdleTimeoutSeconds: Number(process.env.BATTLE_IDLE_TIMEOUT_SECONDS ?? 180),
    battlePollIntervalSeconds: Number(process.env.BATTLE_POLL_INTERVAL_SECONDS ?? 10),

};

export default timerConfig;
