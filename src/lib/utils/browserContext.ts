/**
 * Utility for capturing browser context for feedback submissions.
 * Captures browser, OS, screen size, and current URL.
 */

export interface BrowserContext {
  browser: string;
  os: string;
  screenSize: string;
  currentUrl: string;
  timestamp: string;
}

/**
 * Detect browser name and version from user agent.
 */
function detectBrowser(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Firefox/')) {
    const match = ua.match(/Firefox\/(\d+)/);
    return `Firefox ${match?.[1] || ''}`.trim();
  }

  if (ua.includes('Edg/')) {
    const match = ua.match(/Edg\/(\d+)/);
    return `Edge ${match?.[1] || ''}`.trim();
  }

  if (ua.includes('Chrome/')) {
    const match = ua.match(/Chrome\/(\d+)/);
    return `Chrome ${match?.[1] || ''}`.trim();
  }

  if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    const match = ua.match(/Version\/(\d+)/);
    return `Safari ${match?.[1] || ''}`.trim();
  }

  return 'Unknown Browser';
}

/**
 * Detect operating system from user agent.
 */
function detectOS(): string {
  const ua = navigator.userAgent;

  if (ua.includes('Mac OS X')) {
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    if (match) {
      return `macOS ${match[1].replace('_', '.')}`;
    }
    return 'macOS';
  }

  if (ua.includes('Windows NT')) {
    const match = ua.match(/Windows NT (\d+\.\d+)/);
    const versionMap: Record<string, string> = {
      '10.0': 'Windows 10/11',
      '6.3': 'Windows 8.1',
      '6.2': 'Windows 8',
      '6.1': 'Windows 7',
    };
    const version = match?.[1] || '';
    return versionMap[version] || `Windows ${version}`;
  }

  if (ua.includes('Linux')) {
    return 'Linux';
  }

  if (ua.includes('Android')) {
    return 'Android';
  }

  if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) {
    return 'iOS';
  }

  return 'Unknown OS';
}

/**
 * Get screen dimensions.
 */
function getScreenSize(): string {
  return `${window.screen.width}x${window.screen.height}`;
}

/**
 * Capture complete browser context for feedback submission.
 */
export function captureBrowserContext(): BrowserContext {
  return {
    browser: detectBrowser(),
    os: detectOS(),
    screenSize: getScreenSize(),
    currentUrl: window.location.href,
    timestamp: new Date().toISOString(),
  };
}
