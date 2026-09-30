import { describe, expect, it } from "vitest";
import { climbTo, hopTo, levelWorld, run, teleport, walkTo } from "./helpers";

type W = ReturnType<typeof levelWorld>;
const feet = (w: W): number => (w.player.y + w.player.h) / 32;
const until = (w: W, f: () => boolean, max = 12): void => {
  for (let i = 0; i < max * 120 && !f(); i++) run(w, 1 / 120);
};
export const helpers = { climbTo };

describe("6-1 Floating Islands", () => {
  it("falling off an island costs a heart and returns Arin to safe ground", () => {
    const w = levelWorld("6-1");
    run(w, 0.5);
    walkTo(w, 11);
    run(w, 0.6, { right: true });
    run(w, 3);
    expect(w.player.health).toBe(w.player.maxHealth - 1);
    expect(feet(w)).toBeLessThan(19);
  });
  it("the islands, clouds, ferry and crumbling clouds lead to the exit", () => {
    const w = levelWorld("6-1");
    w.invulnerable = true;
    run(w, 0.5);
    walkTo(w, 12);
    hopTo(w, 17);
    walkTo(w, 24);
    hopTo(w, 29);
    walkTo(w, 30);
    hopTo(w, 35);
    walkTo(w, 36);
    hopTo(w, 41);
    walkTo(w, 52);
    const ferry = w.getEntity("sky_ferry")!;
    until(w, () => ferry.x / 32 < 54.2);
    hopTo(w, 55);
    until(w, () => ferry.x / 32 > 63.8);
    hopTo(w, 68);
    walkTo(w, 78);
    hopTo(w, 82);
    walkTo(w, 88);
    hopTo(w, 93);
    walkTo(w, 104);
    hopTo(w, 109);
    walkTo(w, 114);
    expect(w.player.state).toBe("VICTORY");
  });
  it("the drifting service platform carries Arin under the island to its belly cave", () => {
    const w = levelWorld("6-1");
    w.invulnerable = true;
    run(w, 0.5);
    const lift = w.getEntity("belly_lift")!;
    teleport(w, 54, 19);
    until(
      w,
      () =>
        lift.x / 32 > 52.9 &&
        (lift as unknown as { pause: number }).pause > 0.6,
    );
    run(w, 0.05, { down: true, jump: true, jumpPressed: true });
    run(w, 0.6);
    expect(feet(w)).toBeCloseTo(23, 0);
    until(w, () => lift.x / 32 < 45.1);
    walkTo(w, 46, 1);
    hopTo(w, 45, 0.5);
    expect(feet(w)).toBeCloseTo(20, 0);
    expect(w.player.x / 32).toBeLessThan(46.5);
  });
});

describe("6-2 Cloud Passage", () => {
  const solid = (w: W, id: string): boolean =>
    w.getEntity(id)?.solidKind() === "top";
  it("phase clouds are crossed by waiting for the next to form", () => {
    const w = levelWorld("6-2");
    w.invulnerable = true;
    run(w, 0.5);
    walkTo(w, 10);
    until(w, () => !solid(w, "phase_a1"));
    until(w, () => solid(w, "phase_a1"));
    walkTo(w, 18, 1.5);
    hopTo(w, 21);
    until(w, () => !solid(w, "phase_a2"));
    until(w, () => solid(w, "phase_a2"));
    hopTo(w, 25);
    walkTo(w, 33, 1.5);
    expect(feet(w)).toBeCloseTo(17, 0);
    expect(w.player.x / 32).toBeGreaterThan(32);
    expect(w.stats.deaths).toBe(0);
  });
  it("dissolving clouds, the updraft and the chasing phase clouds reach the exit", () => {
    const w = levelWorld("6-2");
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 40, 16);
    hopTo(w, 45);
    walkTo(w, 51, 1.2);
    hopTo(w, 56);
    walkTo(w, 62, 1.5);
    run(w, 3);
    run(w, 1, { right: true });
    expect(feet(w)).toBeCloseTo(11, 0);
    walkTo(w, 74);
    until(w, () => !solid(w, "phase_c1"));
    until(w, () => solid(w, "phase_c1"));
    hopTo(w, 78);
    walkTo(w, 81, 1);
    until(w, () => solid(w, "phase_c2"));
    hopTo(w, 85);
    walkTo(w, 88, 1);
    hopTo(w, 92);
    walkTo(w, 104);
    expect(w.player.state).toBe("VICTORY");
  });
  it("the fleeting stair can be climbed in one window", () => {
    const w = levelWorld("6-2");
    w.invulnerable = true;
    run(w, 0.5);
    teleport(w, 57, 15);
    until(w, () => !solid(w, "stair_1"));
    until(w, () => solid(w, "stair_1"));
    hopTo(w, 56.5);
    hopTo(w, 53.5);
    hopTo(w, 50.5);
    hopTo(w, 47);
    expect(feet(w)).toBeCloseTo(5, 0);
  });
});

describe("6-3 Wind Platforms", () => {
  it("fan-driven sails carry Arin from island to island", () => {
    const w = levelWorld("6-3");
    w.invulnerable = true;
    run(w, 0.5);
    const e = (id: string) => w.getEntity(id)!;
    walkTo(w, 13, 3);
    until(w, () => e("sail_a").x / 32 > 25.9);
    hopTo(w, 31);
    expect(feet(w)).toBeCloseTo(17, 0);
    walkTo(w, 40);
    until(w, () => e("sail_b").y / 32 < 10.1);
    hopTo(w, 45);
    expect(feet(w)).toBeCloseTo(10, 0);
    walkTo(w, 54);
    hopTo(w, 57);
    until(w, () => e("sail_c").x / 32 > 69.9, 6);
    hopTo(w, 75);
    expect(feet(w)).toBeCloseTo(11, 0);
    walkTo(w, 84);
    hopTo(w, 87);
    until(w, () => e("sail_d").x / 32 > 94.8, 20);
    hopTo(w, 100);
    walkTo(w, 112);
    expect(w.player.state).toBe("VICTORY");
  });
  it("the constellation order carved on the vault opens it", () => {
    const w = levelWorld("6-3");
    run(w, 0.5);
    for (const id of ["star_eye", "star_sun", "star_bird"]) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1);
    }
    run(w, 1);
    expect(w.getEntity("sd_vault")?.solidKind()).toBe("full");
    for (const id of ["star_sun", "star_bird", "star_eye"]) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1);
    }
    run(w, 2);
    expect(w.getEntity("sd_vault")?.solidKind()).toBeNull();
  });
});

describe("6-4 Sky Guardians", () => {
  const kill = (w: W, id: string): void => {
    const e = w.getEntity(id) as unknown as { crush: (x: unknown) => void };
    e.crush(w);
    run(w, 0.8);
  };
  it("a ward gate opens only once every guardian it binds has fallen", () => {
    const w = levelWorld("6-4");
    run(w, 1);
    expect(w.getEntity("ward_1")?.solidKind()).toBe("full");
    kill(w, "guard_a");
    run(w, 1);
    expect(w.getEntity("ward_1")?.solidKind()).toBe("full");
    kill(w, "guard_b");
    run(w, 2);
    expect(w.getEntity("ward_1")?.solidKind()).toBeNull();
  });
  it("the second ward needs the whole mixed squad defeated", () => {
    const w = levelWorld("6-4");
    run(w, 1);
    kill(w, "guard_c");
    kill(w, "guard_d");
    run(w, 1);
    expect(w.getEntity("ward_2")?.solidKind()).toBe("full");
    kill(w, "guard_e");
    run(w, 2);
    expect(w.getEntity("ward_2")?.solidKind()).toBeNull();
  });
  it("knights take several sword hits", () => {
    const w = levelWorld("6-4");
    w.invulnerable = true;
    run(w, 0.5);
    const knight = w.getEntity("guard_a") as unknown as {
      alive: boolean;
      x: number;
    };
    let swings = 0;
    for (; swings < 12 && knight.alive; swings++) {
      w.player.x = knight.x - w.player.w - 6;
      w.player.facing = 1;
      run(w, 1 / 120, { attackPressed: true });
      run(w, 0.5);
    }
    expect(knight.alive).toBe(false);
    expect(swings).toBeGreaterThanOrEqual(3);
  });
});

describe("6-5 Light Beams", () => {
  const rot = (w: W, id: string): void => {
    (w.getEntity(id) as unknown as { rotate: (x: unknown) => void }).rotate(w);
    run(w, 0.3);
  };
  it("nothing is solved at the start", () => {
    const w = levelWorld("6-5");
    run(w, 1);
    for (const id of ["rx_a", "rx_b", "relay", "rx_hidden"])
      expect(w.getEntity(id)?.active, id).toBe(false);
  });
  it("turning the first mirror sends the sunbeam into the receiver and forms the bridge", () => {
    const w = levelWorld("6-5");
    run(w, 0.5);
    rot(w, "mirror_a");
    run(w, 1);
    expect(w.getEntity("rx_a")?.active).toBe(true);
    expect(w.getEntity("bridge_a")?.solidKind()).toBe("top");
  });
  it("the lever flips the floating mirror down onto the second receiver", () => {
    const w = levelWorld("6-5");
    run(w, 0.5);
    w.getEntity("lv_mirror")!.interact(w);
    run(w, 1);
    expect(w.getEntity("rx_b")?.active).toBe(true);
    expect(w.getEntity("bridge_b")?.solidKind()).toBe("top");
  });
  it("the sun on the relay crystal raises the lift and its beam reaches the hidden island", () => {
    const w = levelWorld("6-5");
    run(w, 0.5);
    rot(w, "mirror_c");
    run(w, 4);
    expect(w.getEntity("relay")?.active).toBe(true);
    expect(w.getEntity("sun_lift")!.y / 32).toBeLessThan(10.5);
    expect(w.getEntity("rx_hidden")?.active).toBe(true);
    expect(w.getEntity("bridge_hidden")?.solidKind()).toBe("top");
  });
});

describe("6-6 Rotating Rings", () => {
  const press = (w: W): void => {
    run(w, 0.05, { interact: true, interactPressed: true });
  };
  it("ring switches lay the rings flat, stand them upright, and the timed ring must be crossed quickly", () => {
    const w = levelWorld("6-6");
    w.invulnerable = true;
    run(w, 0.5);
    walkTo(w, 9);
    press(w);
    run(w, 1.5);
    walkTo(w, 13);
    hopTo(w, 16.5);
    hopTo(w, 21.5);
    hopTo(w, 27);
    expect(feet(w)).toBeCloseTo(15, 0);
    walkTo(w, 29);
    press(w);
    run(w, 1.5);
    walkTo(w, 31);
    hopTo(w, 34);
    hopTo(w, 34);
    hopTo(w, 39);
    expect(feet(w)).toBeCloseTo(7, 0);
    walkTo(w, 42);
    press(w);
    run(w, 1.2);
    walkTo(w, 46);
    hopTo(w, 49.5);
    hopTo(w, 54.5);
    hopTo(w, 59);
    walkTo(w, 74);
    expect(w.player.state).toBe("VICTORY");
    expect(w.stats.deaths).toBe(0);
  });
  it("the timed ring turns upright again when its switch springs back", () => {
    const w = levelWorld("6-6");
    run(w, 0.5);
    const ys = (): number[] =>
      w.entities
        .filter((e) => e.id.startsWith("ring_3"))
        .map((e) => Math.round(e.y / 32));
    expect(new Set(ys()).size).toBe(2);
    w.getEntity("ring_sw_3")!.interact(w);
    run(w, 1.5);
    expect(new Set(ys()).size).toBe(1);
    run(w, 6);
    expect(new Set(ys()).size).toBe(2);
  });
});

describe("6-7 Celestial Path", () => {
  it("every temple lesson in turn leads to the exit", () => {
    const w = levelWorld("6-7");
    w.invulnerable = true;
    run(w, 0.5);
    const st = w.entities.find((e) => e.type === "stone_block")!;
    walkTo(w, 6);
    for (let i = 0; i < 600 && st.x < 13 * 32 - 1; i++)
      run(w, 1 / 120, { right: true });
    run(w, 1.5);
    expect(w.getEntity("gate_jungle")?.solidKind()).toBeNull();
    hopTo(w, 17);
    walkTo(w, 18);
    (
      w.getEntity("mirror_sun") as unknown as { rotate: (x: unknown) => void }
    ).rotate(w);
    run(w, 1);
    expect(w.getEntity("bridge_sun")?.solidKind()).toBe("top");
    walkTo(w, 36);
    run(w, 0.05, { interact: true, interactPressed: true });
    walkTo(w, 37);
    (
      w.getEntity("node_bridge") as unknown as { strike: (x: unknown) => void }
    ).strike(w);
    walkTo(w, 52, 3);
    walkTo(w, 62, 4);
    walkTo(w, 64, 1);
    run(w, 3);
    run(w, 1, { right: true });
    walkTo(w, 79);
    hopTo(w, 81);
    walkTo(w, 86);
    until(
      w,
      () => (w.getEntity("gust") as unknown as { gust: number }).gust >= 1,
    );
    until(
      w,
      () => (w.getEntity("gust") as unknown as { gust: number }).gust === 0,
    );
    hopTo(w, 91);
    walkTo(w, 92, 0.5);
    hopTo(w, 96);
    walkTo(w, 97, 0.5);
    hopTo(w, 101);
    walkTo(w, 116);
    expect(w.player.state).toBe("VICTORY");
  });
  it("the echo stone melody opens the pilgrims hut", () => {
    const w = levelWorld("6-7");
    run(w, 0.5);
    for (const id of ["chime_c", "chime_a", "chime_b"]) {
      w.getEntity(id)!.interact(w);
      run(w, 0.1);
    }
    run(w, 2);
    expect(w.getEntity("sd_hut")?.solidKind()).toBeNull();
  });
});
