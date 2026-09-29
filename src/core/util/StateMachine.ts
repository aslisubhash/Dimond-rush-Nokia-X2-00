export interface StateHandlers<C> {
  enter?(ctx: C, from: string): void;
  update(ctx: C, dt: number): void;
  exit?(ctx: C, to: string): void;
}

/** Minimal deterministic finite state machine. */
export class StateMachine<S extends string, C> {
  state: S;
  /** Seconds spent in the current state. */
  time = 0;
  private readonly handlers: Record<S, StateHandlers<C>>;
  private readonly ctx: C;

  constructor(ctx: C, initial: S, handlers: Record<S, StateHandlers<C>>) {
    this.ctx = ctx;
    this.state = initial;
    this.handlers = handlers;
  }

  change(next: S): void {
    if (next === this.state) return;
    const prev = this.state;
    this.handlers[prev].exit?.(this.ctx, next);
    this.state = next;
    this.time = 0;
    this.handlers[next].enter?.(this.ctx, prev);
  }

  /** Force re-entry even if already in the state. */
  restart(next: S): void {
    const prev = this.state;
    this.handlers[prev].exit?.(this.ctx, next);
    this.state = next;
    this.time = 0;
    this.handlers[next].enter?.(this.ctx, prev);
  }

  update(dt: number): void {
    this.time += dt;
    this.handlers[this.state].update(this.ctx, dt);
  }
}
