import { emptyInput, type InputState } from '../core/types';
import type { GameAction } from '../core/save/schema';

export interface TouchState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  jump: boolean;
  attack: boolean;
  interact: boolean;
}

type MenuAction = 'up' | 'down' | 'left' | 'right' | 'confirm' | 'back' | 'pause';

const ACTIONS: GameAction[] = ['left', 'right', 'up', 'down', 'jump', 'attack', 'interact', 'pause', 'walk'];

/**
 * Unifies keyboard, gamepad and touch into one InputState per simulation step.
 * "Pressed" edges are latched until consumed so no press is lost between steps.
 */
export class InputManager {
  private bindings: Record<GameAction, string[]>;
  private codeToAction = new Map<string, GameAction[]>();
  private keysDown = new Set<string>();
  private held: Record<GameAction, boolean> = this.blank();
  private latched: Record<GameAction, boolean> = this.blank();
  private menuLatched = new Set<MenuAction>();
  private touch: TouchState = { left: false, right: false, up: false, down: false, jump: false, attack: false, interact: false };
  private prevTouch: TouchState = { ...this.touch };
  private padPrev: boolean[] = [];
  private padAxisPrev = { x: 0, y: 0 };
  private axisX = 0;
  private axisY = 0;

  get stickY(): number {
    return this.axisY;
  }
  /** Last device used — the UI shows matching prompts. */
  lastDevice: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';
  /** When set, the next key press is reported here instead of mapped (remapping UI). */
  captureNext: ((code: string) => void) | null = null;
  private readonly onKeyDown = (e: KeyboardEvent): void => this.keyDown(e);
  private readonly onKeyUp = (e: KeyboardEvent): void => this.keyUp(e);
  private readonly onBlur = (): void => this.releaseAll();

  constructor(bindings: Record<GameAction, string[]>) {
    this.bindings = bindings;
    this.rebuild();
  }

  private blank(): Record<GameAction, boolean> {
    return { left: false, right: false, up: false, down: false, jump: false, attack: false, interact: false, pause: false, walk: false };
  }

  setBindings(b: Record<GameAction, string[]>): void {
    this.bindings = b;
    this.rebuild();
  }

  private rebuild(): void {
    this.codeToAction.clear();
    for (const a of ACTIONS) {
      for (const code of this.bindings[a] ?? []) {
        const list = this.codeToAction.get(code) ?? [];
        list.push(a);
        this.codeToAction.set(code, list);
      }
    }
  }

  attach(target: Window = window): void {
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
    target.addEventListener('blur', this.onBlur);
  }

  detach(target: Window = window): void {
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
    target.removeEventListener('blur', this.onBlur);
  }

  private keyDown(e: KeyboardEvent): void {
    if (e.code.startsWith('F') && /^F\d+$/.test(e.code)) {
      e.preventDefault();
      return; // debug keys are handled by the debug layer
    }
    if (this.captureNext) {
      e.preventDefault();
      const cb = this.captureNext;
      this.captureNext = null;
      cb(e.code);
      return;
    }
    this.lastDevice = 'keyboard';
    const actions = this.codeToAction.get(e.code);
    if (actions) e.preventDefault();
    if (this.keysDown.has(e.code)) return; // auto-repeat
    this.keysDown.add(e.code);
    for (const a of actions ?? []) {
      this.latched[a] = true;
    }
    const menu = this.menuFor(e.code, actions ?? []);
    for (const m of menu) this.menuLatched.add(m);
  }

  private menuFor(code: string, actions: GameAction[]): MenuAction[] {
    const out: MenuAction[] = [];
    if (actions.includes('up')) out.push('up');
    if (actions.includes('down')) out.push('down');
    if (actions.includes('left')) out.push('left');
    if (actions.includes('right')) out.push('right');
    if (code === 'Enter' || code === 'NumpadEnter' || actions.includes('jump') || actions.includes('interact')) out.push('confirm');
    if (code === 'Escape' || code === 'Backspace') out.push('back');
    if (actions.includes('pause')) out.push('pause');
    return out;
  }

  private keyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  releaseAll(): void {
    this.keysDown.clear();
    this.touch = { left: false, right: false, up: false, down: false, jump: false, attack: false, interact: false };
  }

  setTouch(t: TouchState): void {
    for (const k of Object.keys(t) as (keyof TouchState)[]) {
      if (t[k] && !this.prevTouch[k]) {
        this.lastDevice = 'touch';
        if (k === 'jump') this.latched.jump = true;
        if (k === 'attack') this.latched.attack = true;
        if (k === 'interact') this.latched.interact = true;
        if (k === 'up') this.latched.up = true;
      }
    }
    this.prevTouch = { ...t };
    this.touch = { ...t };
  }

  /** Poll gamepads once per rendered frame. */
  pollGamepad(): void {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = Array.from(pads ?? []).find((p) => p && p.connected);
    this.axisX = 0;
    this.axisY = 0;
    if (!pad) return;
    const b = (i: number): boolean => !!pad.buttons[i]?.pressed;
    const now = [b(0), b(1), b(2), b(3), b(9), b(12), b(13), b(14), b(15), b(8)];
    const edge = (i: number): boolean => !!now[i] && !this.padPrev[i];
    let ax = pad.axes[0] ?? 0;
    let ay = pad.axes[1] ?? 0;
    if (Math.abs(ax) < 0.22) ax = 0;
    if (Math.abs(ay) < 0.35) ay = 0;
    this.axisX = ax;
    this.axisY = ay;
    if (now.some(Boolean) || ax || ay) this.lastDevice = 'gamepad';
    if (edge(0)) {
      this.latched.jump = true;
      this.menuLatched.add('confirm');
    }
    if (edge(2)) this.latched.attack = true;
    if (edge(3)) {
      this.latched.interact = true;
    }
    if (edge(1)) this.menuLatched.add('back');
    if (edge(4)) {
      this.latched.pause = true;
      this.menuLatched.add('pause');
    }
    if (edge(5) || (ay < -0.5 && this.padAxisPrev.y >= -0.5)) {
      this.menuLatched.add('up');
      this.latched.up = true;
    }
    if (edge(6) || (ay > 0.5 && this.padAxisPrev.y <= 0.5)) this.menuLatched.add('down');
    if (edge(7) || (ax < -0.5 && this.padAxisPrev.x >= -0.5)) this.menuLatched.add('left');
    if (edge(8) || (ax > 0.5 && this.padAxisPrev.x <= 0.5)) this.menuLatched.add('right');
    this.padPrev = now;
    this.padAxisPrev = { x: ax, y: ay };
    this.held.jump = b(0);
    this.held.attack = b(2);
    this.held.interact = b(3);
    this.held.left = b(14);
    this.held.right = b(15);
    this.held.up = b(12) || ay < -0.5;
    this.held.down = b(13) || ay > 0.5;
  }

  private isHeld(a: GameAction): boolean {
    const codes = this.bindings[a] ?? [];
    for (const c of codes) if (this.keysDown.has(c)) return true;
    const t = this.touch as unknown as Record<string, boolean>;
    return this.held[a] || !!t[a];
  }

  /** Build the input for one simulation step; consumes latched presses. */
  sample(out: InputState = emptyInput()): InputState {
    out.left = this.isHeld('left') || this.axisX < -0.5;
    out.right = this.isHeld('right') || this.axisX > 0.5;
    out.up = this.isHeld('up');
    out.down = this.isHeld('down');
    out.axisX = this.axisX;
    out.jump = this.isHeld('jump');
    out.interact = this.isHeld('interact');
    out.walk = this.isHeld('walk');
    out.jumpPressed = this.latched.jump;
    out.attackPressed = this.latched.attack;
    out.interactPressed = this.latched.interact;
    this.latched.jump = this.latched.attack = this.latched.interact = false;
    this.latched.up = false;
    return out;
  }

  /** Pause presses are consumed by the scene, independent of simulation steps. */
  consumePause(): boolean {
    const p = this.latched.pause || this.menuLatched.has('pause');
    this.latched.pause = false;
    this.menuLatched.delete('pause');
    return p;
  }

  consumeMenu(a: MenuAction): boolean {
    const had = this.menuLatched.has(a);
    this.menuLatched.delete(a);
    return had;
  }

  clearMenu(): void {
    this.menuLatched.clear();
    this.latched = this.blank();
  }

  describe(action: GameAction): string {
    if (this.lastDevice === 'gamepad') {
      const pad: Partial<Record<GameAction, string>> = { jump: 'Ⓐ', attack: 'Ⓧ', interact: 'Ⓨ', pause: 'START', up: '↑', down: '↓', left: '←', right: '→' };
      return pad[action] ?? action;
    }
    if (this.lastDevice === 'touch') return action.toUpperCase();
    const code = this.bindings[action]?.[0] ?? '?';
    return code.replace(/^Key/, '').replace(/^Arrow/, '').replace(/^Digit/, '').replace('Space', 'SPACE').replace('Escape', 'ESC').replace('ShiftLeft', 'SHIFT');
  }
}
