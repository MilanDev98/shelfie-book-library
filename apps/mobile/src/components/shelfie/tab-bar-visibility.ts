type Listener = (visible: boolean) => void;

const listeners = new Set<Listener>();
let tabBarVisible = true;

export function getShelfieTabBarVisible() {
  return tabBarVisible;
}

export function setShelfieTabBarVisible(visible: boolean) {
  tabBarVisible = visible;
  listeners.forEach((listener) => listener(visible));
}

export function subscribeToShelfieTabBar(listener: Listener) {
  listeners.add(listener);
  listener(tabBarVisible);
  return () => {
    listeners.delete(listener);
  };
}
