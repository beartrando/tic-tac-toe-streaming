import BattleActivityTracker from "../../src/infrastructure/battle-timeout/battle-activity.tracker";

const baseTime = new Date("2026-10-06T12:00:00Z").getTime();

describe("BattleActivityTracker", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(baseTime);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("свежая активность не считается простоем", () => {
        const tracker = new BattleActivityTracker();

        tracker.touch("battle-1");

        expect(tracker.stale(180_000)).toEqual([]);
    });

    test("активность старше порога попадает в stale", () => {
        const tracker = new BattleActivityTracker();

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        expect(tracker.stale(180_000)).toEqual(["battle-1"]);
    });

    test("ровно на пороге — уже простой", () => {
        const tracker = new BattleActivityTracker();

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 180_000);

        expect(tracker.stale(180_000)).toEqual(["battle-1"]);
    });

    test("touch обновляет активность — баттл уходит из stale", () => {
        const tracker = new BattleActivityTracker();

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);
        expect(tracker.stale(180_000)).toEqual(["battle-1"]);

        tracker.touch("battle-1");
        expect(tracker.stale(180_000)).toEqual([]);
    });

    test("forget убирает баттл из опроса", () => {
        const tracker = new BattleActivityTracker();

        tracker.touch("battle-1");
        jest.setSystemTime(baseTime + 181_000);

        tracker.forget("battle-1");

        expect(tracker.stale(180_000)).toEqual([]);
    });

    test("touchAll отмечает все баттлы сокета", () => {
        const tracker = new BattleActivityTracker();

        const battleIds = ["battle-1", "battle-2"].map((id) => ({value: id, equals: () => false}));

        tracker.touchAll(battleIds as never);
        jest.setSystemTime(baseTime + 181_000);

        expect(tracker.stale(180_000).sort()).toEqual(["battle-1", "battle-2"]);
    });
});
