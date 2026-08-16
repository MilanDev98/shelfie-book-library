type Listener = (visible: boolean) => void;

const listeners = new Set<Listener>();

export function setShelfieTabBarVisible(visible: boolean) {
  listeners.forEach((listener) => listener(visible));
}

export function subscribeToShelfieTabBar(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
