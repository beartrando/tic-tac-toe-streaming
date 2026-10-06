export const battleTimeoutConfig = {
    idleTimeoutSeconds: Number(process.env.BATTLE_IDLE_TIMEOUT_SECONDS ?? 180),
    pollIntervalSeconds: Number(process.env.BATTLE_POLL_INTERVAL_SECONDS ?? 10),
};

export default battleTimeoutConfig;
