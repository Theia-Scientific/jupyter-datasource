// exported only so it can be mocked for testing
export function openWindow(url: string | null) {
  if (url !== null) {
    window.open(url);
  }
}

export function getWindowLocation(): string {
  return window.location.href;
}
