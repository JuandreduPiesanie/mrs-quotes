import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button as MuiButton,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DataGrid, useGridApiRef } from '@mui/x-data-grid';
import { ArrowLeft, Check, Download, MapPin, Search } from 'lucide-react';
import { ROLES, type Role } from '../../app/roles';
import { PageTitle } from '../../shared/components/PageTitle';
import { formatDate } from '../../shared/date/dateUtils';
import { useCurrentTime } from '../../shared/date/useCurrentTime';
import { quoteQuantityLabel } from '../../shared/quote/quoteFormatters';
import { useAppSelector } from '../../app/hooks';
import { getApiErrorMessage, useCompleteQuoteMutation, useGetAssessorsQuery, useGetQuotesQuery, useLazyGetQuoteQuery } from '../../services/baseApi';
import { downloadQuotePhotos, loadProtectedPhoto } from '../../services/mediaService';
import type { QuoteDto, QuotePhotoDto, QuoteStatus } from '../../services/apiDtos';
import { getQuoteSla } from './domain/quoteSla';

interface QuotesViewProps {
  role: Role;
  initialQuoteId: number | null;
  onOpenedInitialQuote?: () => void;
  onOpenQuote?: (id: number) => void;
  onCloseQuote?: () => void;
  onEditQuote: (quote: QuoteDto) => void;
}

export function QuotesView({ role, initialQuoteId, onOpenedInitialQuote, onOpenQuote, onCloseQuote, onEditQuote }: QuotesViewProps) {
  const [active, setActive] = useState<QuoteDto | null>(null);
  const [query, setQuery] = useState('');
  const [assessorId, setAssessorId] = useState('all');
  const [photoIndex, setPhotoIndex] = useState<number | null>(null);
  const [downloadMessage, setDownloadMessage] = useState('');
  const [erpQuoteNumber, setErpQuoteNumber] = useState('');
  const [photoArchiveUrl, setPhotoArchiveUrl] = useState('');
  const [archiveVerified, setArchiveVerified] = useState(false);
  const [quoteStatus, setQuoteStatus] = useState<QuoteStatus>('submitted');
  const quoteGridApiRef = useGridApiRef();
  const currentTime = useCurrentTime();

  const isAdmin = role === ROLES.ADMIN;
  const isAssessor = role === ROLES.ASSESSOR;
  const isQuoteAdministrator = role === ROLES.QUOTE_ADMINISTRATOR || isAdmin;
  const isManagement = role === ROLES.MANAGEMENT || isAdmin;
  const canEditQuote = isAssessor || isAdmin;
  const canReviewQuotes = isQuoteAdministrator || isManagement;
  const token = useAppSelector((state) => state.auth.session?.token);
  const { data: assessors = [] } = useGetAssessorsQuery(undefined, { skip: !canReviewQuotes });
  const { data: quotes = [] } = useGetQuotesQuery({ assessorId, status: quoteStatus });
  const [loadQuote] = useLazyGetQuoteQuery();
  const [completeQuote] = useCompleteQuoteMutation();

  useEffect(() => {
    if (!initialQuoteId) return;
    openQuote(initialQuoteId)
      .then(() => onOpenedInitialQuote?.())
      .catch((error) => setDownloadMessage(getApiErrorMessage(error)));
  }, [initialQuoteId]);

  const filtered = useMemo(
    () => quotes.filter((q) => `${q.quote_number} ${q.customer_name} ${q.site_address} ${q.assessor_name} ${q.quote_administrator_name || ''} ${q.erp_quote_number || ''}`.toLowerCase().includes(query.toLowerCase())),
    [query, quotes]
  );

  const adminRows = useMemo(() => filtered.map((quote) => {
    const sla = getQuoteSla(quote.created_at, currentTime);
    return {
      ...quote,
      quote_label: quote.quote_number || `Quote #${quote.id}`,
      submitted_label: formatDate(quote.created_at),
      sla_state: sla.state,
      sla_label: sla.label,
      subtotal_label: `R ${Number(quote.subtotal || 0).toFixed(2)}`
    };
  }), [currentTime, filtered]);

  const adminColumns = useMemo(() => [
    { field: 'quote_label', headerName: 'Quote' },
    { field: 'customer_name', headerName: 'Client' },
    { field: 'site_address', headerName: 'Site Address' },
    { field: 'assessor_name', headerName: 'Assessor' },
    ...(isManagement ? [{ field: 'quote_administrator_name', headerName: 'Quote Admin' }] : []),
    { field: 'submitted_label', headerName: 'Submitted' },
    { field: 'photo_count', headerName: 'Photos', type: 'number' as const },
    { field: 'status', headerName: 'Status' },
    { field: 'subtotal_label', headerName: 'Reference Value' }
  ], [isManagement, quoteStatus]);

  useEffect(() => {
    if (!canReviewQuotes || adminRows.length === 0) return undefined;

    const frame = window.requestAnimationFrame(() => {
      void quoteGridApiRef.current.autosizeColumns({
        includeHeaders: true,
        includeOutliers: true,
        expand: false
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [adminColumns, adminRows, canReviewQuotes, quoteGridApiRef]);

  async function downloadPhotos() {
    if (!active) return;
    setDownloadMessage('');
    try {
      await downloadQuotePhotos(token, active.id);
    } catch (err) {
      setDownloadMessage(getApiErrorMessage(err));
    }
  }

  async function completeActiveQuote() {
    if (!active) return;
    setDownloadMessage('');
    try {
      await completeQuote({ id: active.id, erpQuoteNumber, photoArchiveUrl, archiveVerified }).unwrap();
      const completed = await loadQuote(active.id, false).unwrap();
      setQuoteStatus('completed');
      setActive(completed);
    } catch (err) {
      setDownloadMessage(getApiErrorMessage(err));
    }
  }

  async function openQuote(id: number) {
    setPhotoIndex(null);
    setDownloadMessage('');
    const quote = await loadQuote(id, false).unwrap();
    setActive(quote);
    setErpQuoteNumber(quote.erp_quote_number || '');
    setPhotoArchiveUrl(quote.photo_archive_url || '');
    setArchiveVerified(false);
  }

  function selectQuote(id: number) {
    if (onOpenQuote) onOpenQuote(id);
    else void openQuote(id);
  }

  function closeQuote() {
    setActive(null);
    setPhotoIndex(null);
    setDownloadMessage('');
    setErpQuoteNumber('');
    setPhotoArchiveUrl('');
    setArchiveVerified(false);
    onCloseQuote?.();
  }

  function renderQuoteDetail({ fullScreen = false }: { fullScreen?: boolean } = {}) {
    const locationGroups = active?.items.filter((item) => !item.system_generated).reduce<{ location: string; items: QuoteDto['items'] }[]>((groups, item) => {
      const location = item.location || 'Unspecified';
      const existing = groups.find((group) => group.location.toLocaleLowerCase() === location.toLocaleLowerCase());
      if (existing) existing.items.push(item);
      else groups.push({ location, items: [item] });
      return groups;
    }, []) || [];
    const automaticFees = active?.items.filter((item) => item.system_generated) || [];

    return (
      <div className={fullScreen ? 'panel detail-panel quote-detail-screen' : 'panel detail-panel'}>
        {!active && <div className="empty">Select a quote to view details.</div>}
        {active && (
          <>
            {fullScreen && <button type="button" className="secondary back-button" onClick={closeQuote}><ArrowLeft size={18} />Back to quotes</button>}
            <div className="detail-heading">
              <div>
                <h2>{active.quote_number || `Quote #${active.id}`}</h2>
                <p className="muted">{active.customer_name}</p>
                <p className="muted">{active.site_address}</p>
                <p className="muted">Assessor: {active.assessor_name}</p>
                {active.quote_administrator_name && <p className="muted">Quote admin: {active.quote_administrator_name}</p>}
                <p className="muted">Status: {active.status === 'completed' ? 'Completed' : 'Outstanding'}</p>
                {active.erp_quote_number && <p className="muted">ERP quote: {active.erp_quote_number}</p>}
              </div>
              <div className="detail-actions">
                {isQuoteAdministrator && active.status === 'submitted' && active.photos.length > 0 && <button className="primary" onClick={downloadPhotos}><Download size={18} />Download photos</button>}
                {canEditQuote && active.status === 'submitted' && <button className="secondary" onClick={() => onEditQuote(active)}>Edit quote</button>}
              </div>
            </div>
            <div className="quote-location-groups">
              {automaticFees.length > 0 && (
                <section className="quote-location-group automatic-fee-group">
                  <h3>Automatic fees</h3>
                  <div className={canReviewQuotes ? 'line-table priced' : 'line-table'}>
                    {automaticFees.map((item) => (
                      <div key={item.id}><span>{item.description}<em className="system-fee-badge">Automatic 2026 fee</em></span><span>{quoteQuantityLabel(item.quantity, item.unit)}</span>{canReviewQuotes && <strong>R {item.line_total.toFixed(2)}</strong>}</div>
                    ))}
                  </div>
                </section>
              )}
              {locationGroups.map((group) => (
                <section className="quote-location-group" key={group.location}>
                  <h3><MapPin size={18} />{group.location}</h3>
                  <div className={canReviewQuotes ? 'line-table priced' : 'line-table'}>
                    {group.items.map((item) => (
                      <div key={item.id}><span>{item.description}<small>{item.trade_name}</small></span><span>{quoteQuantityLabel(item.quantity, item.unit)}</span>{canReviewQuotes && <strong>R {item.line_total.toFixed(2)}</strong>}</div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            {canReviewQuotes && <h3>Reference total: R {active.subtotal.toFixed(2)}</h3>}
            {isQuoteAdministrator && active.status === 'submitted' && (
              <div className="erp-complete-panel">
                <label>ERP Quote Number<input required value={erpQuoteNumber} onChange={(e) => setErpQuoteNumber(e.target.value)} placeholder="Enter ERP quote number" /></label>
                <label>OneDrive Photo Folder URL<input required type="url" value={photoArchiveUrl} onChange={(e) => setPhotoArchiveUrl(e.target.value)} placeholder="Paste the OneDrive or SharePoint folder link" /></label>
                <label className="archive-confirmation">
                  <input type="checkbox" checked={archiveVerified} onChange={(e) => setArchiveVerified(e.target.checked)} />
                  <span>I verified that every quote photo is present in this archive folder.</span>
                </label>
                <button
                  className="primary"
                  type="button"
                  disabled={!erpQuoteNumber.trim() || !photoArchiveUrl.trim() || !archiveVerified}
                  onClick={completeActiveQuote}
                >
                  <Check size={18} />Mark as complete
                </button>
              </div>
            )}
            {active.status === 'completed' && (
              <div className="photo-archive-panel">
                <div>
                  <strong>Archived quote photos</strong>
                  <span>
                    {active.photos_purged_at
                      ? `${active.archived_photo_count || 0} photo(s) were removed from the VPS after completion.`
                      : active.photo_purge_eligible_at
                        ? `Local photos are retained until ${formatDate(active.photo_purge_eligible_at)}, then purged automatically.`
                        : 'The archive link is saved and local photo cleanup is pending.'}
                  </span>
                </div>
                {active.photo_archive_url
                  ? <a className="primary archive-link" href={active.photo_archive_url} target="_blank" rel="noopener noreferrer">Open photos in OneDrive</a>
                  : <span className="error">No OneDrive archive link was recorded.</span>}
              </div>
            )}
            {downloadMessage && <div className="error">{downloadMessage}</div>}
            <div className="photo-grid">
              {active.photos.map((photo, index) => (
                <button type="button" key={photo.id} onClick={() => setPhotoIndex(index)}>
                  <ProtectedPhoto path={photo.url} alt={photo.original_name} thumbnail />
                </button>
              ))}
            </div>
            {photoIndex !== null && active.photos[photoIndex] && (
              <PhotoViewer
                photos={active.photos}
                index={photoIndex}
                onChange={setPhotoIndex}
                onClose={() => setPhotoIndex(null)}
              />
            )}
          </>
        )}
      </div>
    );
  }

  if (canReviewQuotes && active) {
    return (
      <section className="workspace quote-detail-workspace">
        <PageTitle title="Quote Detail" subtitle="Review the assessor quote packet before recapturing it in ERP." />
        {renderQuoteDetail({ fullScreen: true })}
      </section>
    );
  }

  const showingCompleted = quoteStatus === 'completed';
  const title = showingCompleted
    ? 'Completed Quotes'
    : isAssessor ? 'My Quotes' : isManagement ? 'Outstanding Quote Work' : 'My Outstanding Quotes';
  const subtitle = showingCompleted
    ? 'Open a completed quote to view its ERP number and OneDrive photo archive.'
    : isAssessor ? 'Track and edit submitted quotes until the quote administrator completes them.' : 'Open a submitted quote to review the full packet.';

  return (
    <section className="workspace quotes-workspace">
      <PageTitle title={title} subtitle={subtitle} />

      <div className="quote-tools">
        <select className="filter-select" value={quoteStatus} onChange={(e) => { setQuoteStatus(e.target.value as QuoteStatus); setActive(null); }}>
          <option value="submitted">Outstanding quotes</option>
          <option value="completed">Completed quotes</option>
        </select>
        {canReviewQuotes && (
          <select className="filter-select" value={assessorId} onChange={(e) => setAssessorId(e.target.value)}>
            <option value="all">All assessors</option>
            {assessors.map((assessor) => <option key={assessor.id} value={assessor.id}>{assessor.name}</option>)}
          </select>
        )}
        <div className="searchbar"><Search size={18} /><input placeholder="Search quotes" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      </div>

      {canReviewQuotes ? (
        <div className="panel admin-quotes-table">
          <DataGrid
            apiRef={quoteGridApiRef}
            rows={adminRows}
            columns={adminColumns}
            autoHeight
            autosizeOnMount
            autosizeOptions={{ includeHeaders: true, includeOutliers: true, expand: false }}
            disableRowSelectionOnClick
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
            getRowClassName={(params) => quoteStatus === 'submitted' ? `sla-row-${params.row.sla_state}` : ''}
            onRowClick={(params) => selectQuote(Number(params.id))}
            sx={{
              border: 0,
              '& .MuiDataGrid-row': { cursor: 'pointer' },
              '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': { outline: 'none' }
            }}
          />
        </div>
      ) : (
        <div className="quote-browser">
          <div className="quote-list">
            {filtered.map((quote) => {
              const sla = getQuoteSla(quote.created_at, currentTime);
              const quoteCardClassName = quoteStatus === 'submitted' ? `quote-card sla-${sla.state}` : 'quote-card';
              return (
              <button key={quote.id} className={quoteCardClassName} onClick={() => selectQuote(quote.id)}>
                <strong>{quote.quote_number || `Quote #${quote.id}`}</strong>
                <span>{quote.customer_name}</span>
                <span>{quote.site_address}</span>
                <small>{quote.assessor_name} | {formatDate(quote.created_at)} | {quote.photo_count} photos</small>
              </button>
              );
            })}
            {filtered.length === 0 && <div className="empty">No quotes found for this view.</div>}
          </div>
          {renderQuoteDetail()}
        </div>
      )}
    </section>
  );
}
interface ProtectedPhotoProps {
  path: string;
  alt: string;
  thumbnail?: boolean;
  eager?: boolean;
}

function ProtectedPhoto({ path, alt, thumbnail = false, eager = false }: ProtectedPhotoProps) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [shouldLoad, setShouldLoad] = useState(eager);
  const [src, setSrc] = useState('');
  const token = useAppSelector((state) => state.auth.session?.token);

  useEffect(() => {
    if (eager || shouldLoad) return undefined;
    const element = imageRef.current;
    if (!element || !('IntersectionObserver' in window)) {
      setShouldLoad(true);
      return undefined;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setShouldLoad(true);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [eager, shouldLoad]);

  useEffect(() => {
    if (!shouldLoad) return undefined;
    let disposed = false;
    let objectUrl = '';
    const separator = path.includes('?') ? '&' : '?';
    loadProtectedPhoto(token, thumbnail ? `${path}${separator}thumbnail=true` : path)
      .then((url) => {
        objectUrl = url;
        if (disposed) URL.revokeObjectURL(url);
        else setSrc(url);
      })
      .catch(() => {
        if (!disposed) setSrc('');
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path, shouldLoad, thumbnail, token]);

  return <img ref={imageRef} src={src || undefined} alt={src ? alt : `Loading ${alt}`} loading={eager ? 'eager' : 'lazy'} />;
}

interface PhotoViewerProps {
  photos: QuotePhotoDto[];
  index: number;
  onChange: (index: number) => void;
  onClose: () => void;
}

function PhotoViewer({ photos, index, onChange, onClose }: PhotoViewerProps) {
  const photo = photos[index];
  const canGoBack = index > 0;
  const canGoForward = index < photos.length - 1;

  function previous() {
    if (canGoBack) onChange(index - 1);
  }

  function next() {
    if (canGoForward) onChange(index + 1);
  }

  return (
    <Dialog open onClose={onClose} maxWidth="lg" fullWidth className="photo-slider-dialog">
      <DialogTitle className="photo-slider-title">
        <Typography variant="subtitle1" component="span">{photo.original_name}</Typography>
        <IconButton onClick={onClose} aria-label="Close photo viewer"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent>
        <Box className="photo-slider-main">
          <IconButton className="photo-slider-arrow" onClick={previous} disabled={!canGoBack} aria-label="Previous photo">
            <ChevronLeftIcon fontSize="large" />
          </IconButton>
          <Box className="photo-slider-image-wrap">
            <ProtectedPhoto key={photo.id} path={photo.url} alt={photo.original_name} eager />
          </Box>
          <IconButton className="photo-slider-arrow" onClick={next} disabled={!canGoForward} aria-label="Next photo">
            <ChevronRightIcon fontSize="large" />
          </IconButton>
        </Box>
        <Box className="photo-slider-strip">
          {photos.map((item, itemIndex) => (
            <button type="button" className={itemIndex === index ? 'active' : ''} key={item.id} onClick={() => onChange(itemIndex)}>
              <ProtectedPhoto path={item.url} alt={item.original_name} thumbnail />
            </button>
          ))}
        </Box>
        <Box className="photo-slider-footer">
          <Typography variant="body2">{index + 1} of {photos.length}</Typography>
          <MuiButton variant="outlined" onClick={onClose}>Close</MuiButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
