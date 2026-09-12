const states = globalThis as typeof globalThis & { __oauthStates?: Map<string, number> };

function store() {
  if (!states.__oauthStates) states.__oauthStates = new Map();
  return states.__oauthStates;
}

export function saveState(state: string) {
  store().set(state, Date.now() + 10 * 60 * 1000);
}

export function consumeState(state: string) {
  const map = store();
  const exp = map.get(state);
  map.delete(state);
  return Boolean(exp && exp > Date.now());
}
