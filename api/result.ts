export type Result<T = unknown, E = string> = Ok<T> | Err<E>;

export type Ok<T = unknown> = {
  ok: true;
  data: T;
};

export type Err<E = unknown> = {
  ok: false;
  error: E;
};

export const Ok = <T>(data: T): Ok<T> => ({
  ok: true,
  data,
});

export const Err = <E>(error: E): Err<E> => ({
  ok: false,
  error,
});