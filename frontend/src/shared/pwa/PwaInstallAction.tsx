import { Download, Share2, X } from 'lucide-react';
import { usePwaInstall } from './usePwaInstall';

export function PwaInstallAction() {
  const {
    canInstall,
    isInstalled,
    guidance,
    requestInstall,
    dismissGuidance
  } = usePwaInstall();

  if (isInstalled) return null;

  return (
    <aside className={guidance ? 'pwa-install-card is-expanded' : 'pwa-install-card'} aria-live="polite">
      {guidance && (
        <div className="pwa-install-guidance">
          <div>
            <strong>{guidance === 'ios' ? 'Install using Safari' : 'Install MRS Quotes'}</strong>
            <button type="button" onClick={dismissGuidance} aria-label="Close installation help">
              <X size={18} />
            </button>
          </div>
          {guidance === 'ios' ? (
            <p><Share2 size={17} /> Open this page in Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</p>
          ) : (
            <p>Keep this page open for at least 30 seconds and tap it once. Then try this button again or use the Chrome menu and choose <strong>Install app</strong>.</p>
          )}
        </div>
      )}
      <button type="button" className="pwa-install-trigger" onClick={() => void requestInstall()}>
        <Download size={18} />
        <span>{canInstall ? 'Install MRS Quotes' : 'Install app'}</span>
      </button>
    </aside>
  );
}
