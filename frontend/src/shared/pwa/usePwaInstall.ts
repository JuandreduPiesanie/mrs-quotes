import { useCallback, useEffect, useState } from 'react';

type InstallOutcome = 'accepted' | 'dismissed';
export type InstallGuidance = 'ios' | 'browser' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function isRunningStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as NavigatorWithStandalone).standalone);
}

function isAppleMobileDevice() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function usePwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isRunningStandalone);
  const [guidance, setGuidance] = useState<InstallGuidance>(null);

  useEffect(() => {
    const displayMode = window.matchMedia('(display-mode: standalone)');

    function handleInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setGuidance(null);
    }

    function handleInstalled() {
      setInstallPrompt(null);
      setGuidance(null);
      setIsInstalled(true);
    }

    function handleDisplayModeChange() {
      setIsInstalled(isRunningStandalone());
    }

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const requestInstall = useCallback(async () => {
    if (!installPrompt) {
      setGuidance(isAppleMobileDevice() ? 'ios' : 'browser');
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);
    if (choice.outcome === 'accepted') setIsInstalled(true);
  }, [installPrompt]);

  return {
    canInstall: Boolean(installPrompt),
    isInstalled,
    guidance,
    requestInstall,
    dismissGuidance: () => setGuidance(null)
  };
}
