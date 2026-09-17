import { useCallback, useEffect, useRef, useState } from 'react'
import AssistantPanel from './AssistantPanel'
import AuditPanel from './AuditPanel'
import DocumentsPanel from './DocumentsPanel'
import EmptyDrop from './EmptyDrop'
import EvidenceModal from './EvidenceModal'
import FindingsPanel from './FindingsPanel'
import OverviewPanel from './OverviewPanel'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import TransactionCard from './TransactionCard'
import UploadModal from './UploadModal'
import { documentRole, uploadAndSubmit, waitForCase } from './api'
import {
  FINDINGS,
  SAMPLE_DOCUMENTS,
  type TabId,
  type TradeDocument,
  dedupeDocuments,
  formatSize,
  inferType,
} from './data'
import * as copy from './messages'
import type { ThreadMessage } from './messages'

const BUILD_TITLE = 'Build a verified trade file'
const BUILD_SUBTITLE =
  'Add your shipment documents. Tradelogx will organize the file, reconcile key facts, and explain every discrepancy.'
const ACTIVE_CASE_STORAGE_KEY = 'tradelogx.active-case.v1'

interface SavedCaseView {
  documents: Array<TradeDocument>
  transactionLabel: string
  pageTitle: string
  pageSubtitle: string
  confidence: number
  criticalTotal: number
  preliminary: boolean
}

function readSavedCase(): SavedCaseView | null {
  try {
    const value = window.localStorage.getItem(ACTIVE_CASE_STORAGE_KEY)
    if (!value) return null
    const parsed = JSON.parse(value) as SavedCaseView
    parsed.documents = dedupeDocuments(parsed.documents).map((document) =>
      document.confidence === 0 && document.status === 'issue'
        ? { ...document, status: 'processing' as const }
        : document,
    )
    return parsed
  } catch {
    return null
  }
}

function persistCase(view: SavedCaseView) {
  window.localStorage.setItem(ACTIVE_CASE_STORAGE_KEY, JSON.stringify(view))
}

const TABS: ReadonlyArray<[TabId, string]> = [
  ['overview', 'Overview'],
  ['documents', 'Documents'],
  ['findings', 'Findings'],
  ['audit', 'Audit trail'],
]

export default function Workspace() {
  const [documents, setDocuments] = useState<Array<TradeDocument>>([])
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedType, setSelectedType] = useState('Auto-detect')
  const [findingFilter, setFindingFilter] = useState('all')
  const [activeChip, setActiveChip] = useState('all')
  const [acknowledged, setAcknowledged] = useState(false)
  const [confidence, setConfidence] = useState(87)
  const [criticalTotal, setCriticalTotal] = useState(1)
  const [preliminary, setPreliminary] = useState(false)
  const [transactionLabel, setTransactionLabel] = useState('New verification')
  const [pageTitle, setPageTitle] = useState(BUILD_TITLE)
  const [pageSubtitle, setPageSubtitle] = useState(BUILD_SUBTITLE)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [fabHidden, setFabHidden] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [evidenceOpen, setEvidenceOpen] = useState(false)
  const [toastText, setToastText] = useState('')
  const [toastShown, setToastShown] = useState(false)
  const [savedCase, setSavedCase] = useState<SavedCaseView | null>(() => readSavedCase())
  const [showingSample, setShowingSample] = useState(false)

  const messageId = useRef(0)
  const nextId = () => ++messageId.current
  const [messages, setMessages] = useState<Array<ThreadMessage>>(() => [
    { id: nextId(), ...copy.OPENING },
  ])

  // Every deferred effect is tracked so nothing fires after unmount.
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([])
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms))
  }, [])
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toast = useCallback((message: string) => {
    setToastText(message)
    setToastShown(true)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastShown(false), 2600)
  }, [])

  const say = useCallback((message: Omit<copy.AssistantMessage, 'id'>) => {
    setMessages((prev) => [...prev, { id: nextId(), ...message }])
  }, [])

  const ask = useCallback((text: string) => {
    setMessages((prev) => [...prev, { id: nextId(), role: 'user' as const, text }])
  }, [])

  // Modals lock the page behind them, matching the original.
  useEffect(() => {
    const locked = uploadOpen || evidenceOpen
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [uploadOpen, evidenceOpen])

  const fileInput = useRef<HTMLInputElement>(null)

  const restoreSavedCase = useCallback(() => {
    if (!savedCase) return
    setDocuments(savedCase.documents.map((document) => ({ ...document })))
    setTransactionLabel(savedCase.transactionLabel)
    setPageTitle(savedCase.pageTitle)
    setPageSubtitle(savedCase.pageSubtitle)
    setConfidence(savedCase.confidence)
    setCriticalTotal(savedCase.criticalTotal)
    setPreliminary(savedCase.preliminary)
    setShowingSample(false)
    setActiveTab('overview')
    toast('Active verification restored')
  }, [savedCase, toast])

  useEffect(() => {
    if (!savedCase) return
    setDocuments(savedCase.documents.map((document) => ({ ...document })))
    setTransactionLabel(savedCase.transactionLabel)
    setPageTitle(savedCase.pageTitle)
    setPageSubtitle(savedCase.pageSubtitle)
    setConfidence(savedCase.confidence)
    setCriticalTotal(savedCase.criticalTotal)
    setPreliminary(savedCase.preliminary)
  // This restores persisted case state only on initial mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSample = useCallback(() => {
    setDocuments(SAMPLE_DOCUMENTS.map((d) => ({ ...d })))
    setTransactionLabel('TX-2026-0914')
    setPageTitle('Review shipment verification')
    setPageSubtitle(
      'The file is verified. One high-severity discrepancy needs a decision before release.',
    )
    setConfidence(87)
    setCriticalTotal(1)
    setPreliminary(false)
    setActiveTab('overview')
    setShowSuggestions(true)
    setShowingSample(true)
    say(copy.SAMPLE_VERIFIED)
    toast('Sample shipment loaded · 46 checks complete')
  }, [say, toast])

  const processFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return
      setUploadOpen(false)

      const selectedFiles = Array.from(files).filter((file, index, all) =>
        all.findIndex((candidate) =>
          candidate.name.toLowerCase() === file.name.toLowerCase()
          && candidate.size === file.size
          && candidate.lastModified === file.lastModified
        ) === index,
      )
      const documentTypes = selectedFiles.map((file) =>
        selectedType === 'Auto-detect' ? inferType(file.name) : selectedType,
      )
      const added: Array<TradeDocument> = selectedFiles.map((file, index) => ({
        name: file.name,
        type: documentTypes[index],
        pages: 1,
        confidence: 0,
        status: 'processing',
        size: formatSize(file.size),
      }))

      // Each upload creates a new backend case, so its document list replaces
      // the previous case instead of being appended to stale UI rows.
      const startIndex = 0
      setDocuments(added)

      setTransactionLabel('Draft verification')
      setPageTitle('Verify uploaded trade file')
      setPageSubtitle(
        'Documents are organized by type. Add related files to unlock cross-document reconciliation.',
      )
      setActiveTab('overview')
      setShowingSample(false)
      say(copy.received(added.length, added.map((d) => d.type)))
      toast(`${added.length} document${added.length > 1 ? 's' : ''} selected - uploading securely`)

      let submittedCaseId = ''
      try {
        const submission = await uploadAndSubmit(selectedFiles, documentTypes)
        const caseId = submission.result.case_id
        submittedCaseId = caseId
        setTransactionLabel(caseId ? `Case ${caseId.slice(0, 8)}` : 'Verification queued')
        setPageSubtitle(
          `Documents were uploaded to the ${submission.data_region.toUpperCase()} region and verification is running.`,
        )
        const processingView: SavedCaseView = {
          documents: added.map((document) => ({ ...document })),
          transactionLabel: caseId ? `Case ${caseId.slice(0, 8)}` : 'Verification queued',
          pageTitle: 'Verify uploaded trade file',
          pageSubtitle: `Documents were uploaded to the ${submission.data_region.toUpperCase()} region and verification is running.`,
          confidence: 0,
          criticalTotal: 0,
          preliminary: true,
        }
        setSavedCase(processingView)
        persistCase(processingView)
        toast('Upload complete - verification queued')
        say({
          role: 'assistant',
          body: (
            <p>
              Your documents were uploaded securely. Verification case {caseId} is now processing
              in the {submission.data_region.toUpperCase()} region.
            </p>
          ),
        })
        const completed = await waitForCase(caseId, (state) => {
          if (state === 'NORMALIZED') setPageSubtitle('Document extraction is complete. Preparing validation checks.')
          if (state === 'PLANNED') setPageSubtitle('Validation checks are planned and ready to run.')
          if (state === 'SUITES_RUNNING') setPageSubtitle('Validation checks are running.')
        })
        const aggregate = completed.result.results
        const violationCount = Number(aggregate?.violation_count || 0)
        const shipmentScore = Math.round(Number(aggregate?.shipment_score ?? 100))
        const criticalCount = Number(aggregate?.severity_counts?.critical || 0)
        const documentResults = aggregate?.documents || {}
        const roleOccurrences = new Map<string, number>()
        const completedDocuments = added.map((document) => {
          const role = documentRole(document.type)
          const occurrence = (roleOccurrences.get(role) || 0) + 1
          roleOccurrences.set(role, occurrence)
          const documentKey = occurrence === 1 ? role : `${role}_${occurrence}`
          const result = documentResults[documentKey]
          const documentScore = Math.round(Number(result?.score ?? 100))
          const documentViolations = Number(result?.violation_count || 0)
          return {
            ...document,
            status: documentViolations > 0 ? 'issue' as const : 'verified' as const,
            confidence: documentScore,
          }
        })
        setDocuments((prev) => prev.map((doc, i) =>
          i >= startIndex ? completedDocuments[i - startIndex] || doc : doc,
        ))
        setConfidence(shipmentScore)
        setCriticalTotal(criticalCount)
        setPreliminary(false)
        setPageTitle(violationCount ? 'Review shipment verification' : 'Shipment verification complete')
        setPageSubtitle(
          violationCount
            ? `${violationCount} discrepancy${violationCount === 1 ? '' : 'ies'} found. Review the results before release.`
            : 'Verification completed with no discrepancies.',
        )
        setShowSuggestions(violationCount > 0)
        const completedView: SavedCaseView = {
          documents: completedDocuments,
          transactionLabel: caseId ? `Case ${caseId.slice(0, 8)}` : 'Verification complete',
          pageTitle: violationCount ? 'Review shipment verification' : 'Shipment verification complete',
          pageSubtitle: violationCount
            ? `${violationCount} discrepancy${violationCount === 1 ? '' : 'ies'} found. Review the results before release.`
            : 'Verification completed with no discrepancies.',
          confidence: shipmentScore,
          criticalTotal: criticalCount,
          preliminary: false,
        }
        setSavedCase(completedView)
        persistCase(completedView)
        toast(`Verification complete - ${violationCount} finding${violationCount === 1 ? '' : 's'}`)
        say({
          role: 'assistant',
          body: <p>Verification is complete with {violationCount} finding{violationCount === 1 ? '' : 's'} and a score of {shipmentScore}%.</p>,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        if (!submittedCaseId) {
          setDocuments((prev) =>
            prev.map((doc, i) =>
              i >= startIndex ? { ...doc, status: 'issue' as const, confidence: 0 } : doc,
            ),
          )
          setConfidence(0)
          setCriticalTotal(1)
          setPreliminary(true)
        }
        toast(message)
        say({
          role: 'assistant',
          body: submittedCaseId
            ? <p>Case {submittedCaseId} was created, but live status stopped: {message}</p>
            : <p>I could not submit these documents: {message}</p>,
        })
      }
    },
    [selectedType, say, toast],
  )

  const openUpload = useCallback(() => {
    setSelectedType('Auto-detect')
    setUploadOpen(true)
  }, [])

  const newCheck = useCallback(() => {
    if (documents.length) {
      setDocuments([])
      setPageTitle(BUILD_TITLE)
      setPageSubtitle(BUILD_SUBTITLE)
      toast('New verification ready')
    } else {
      openUpload()
    }
  }, [documents.length, openUpload, toast])

  const openEvidence = useCallback(
    (title: string) => {
      if (title === 'Commercial value mismatch') setEvidenceOpen(true)
      else toast('Evidence panel opened for this check')
    },
    [toast],
  )

  const onPromptAction = useCallback(
    (action: 'sample' | 'required' | 'checks') => {
      if (action === 'sample') loadSample()
      else if (action === 'required') say(copy.REQUIRED_DOCS)
      else say(copy.WHAT_I_CHECK)
    },
    [loadSample, say],
  )

  const onSend = useCallback(
    (text: string) => {
      ask(text)
      later(() => say(copy.replyTo(text)), 450)
    },
    [ask, later, say],
  )

  const onSuggestion = useCallback(
    (text: string) => {
      ask(text)
      later(
        () => say(text.includes('high') ? copy.HIGH_ISSUE_DETAIL : copy.REVIEW_CHECKLIST),
        350,
      )
    },
    [ask, later, say],
  )

  const loaded = documents.length > 0

  return (
    <>
      <div className="app-shell">
        <Sidebar
          open={sidebarOpen}
          onNavigate={(item) =>
            toast(
              item.id === 'workspace'
                ? 'Workspace is open'
                : `${item.label} is available from the active trade file`,
            )
          }
        />

        <main className="main">
          <Topbar
            transactionLabel={transactionLabel}
            onToggleSidebar={() => setSidebarOpen((v) => !v)}
            onNewCheck={newCheck}
          />

          <div className="workspace-layout">
            <section className="content" aria-live="polite">
              <div className="welcome-row">
                <div>
                  <div className="eyebrow">
                    <span className="live-dot"></span> AI-assisted verification
                  </div>
                  <h1>{pageTitle}</h1>
                  <p>{pageSubtitle}</p>
                </div>
                <div className="actions">
                  <button
                    className="secondary"
                    onClick={showingSample && savedCase ? restoreSavedCase : loadSample}
                  >
                    <svg viewBox="0 0 20 20">
                      <path
                        d="M4 3h9l3 3v11H4V3Zm8 0v4h4M7 10h6M7 13h6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                    </svg>
                    {showingSample && savedCase ? 'Return to active case' : 'Load sample file'}
                  </button>
                  <button className="primary" onClick={openUpload}>
                    ＋ Add documents
                  </button>
                </div>
              </div>

              {!loaded ? (
                <EmptyDrop onChooseFiles={openUpload} onDropFiles={processFiles} />
              ) : (
                <div className="loaded-state">
                  <TransactionCard
                    txId={showingSample ? 'TX-2026-0914' : transactionLabel}
                    title={showingSample
                      ? 'Copper cathodes · Shanghai → Rotterdam'
                      : `${documents.length} uploaded trade document${documents.length === 1 ? '' : 's'}`}
                    meta={showingSample
                      ? 'CIF Rotterdam · 100 MT · USD 927,350 · ETA 28 Sep 2026'
                      : Array.from(new Set(documents.map((document) => document.type))).join(' · ')}
                    confidence={confidence}
                    acknowledged={acknowledged}
                    isSample={showingSample}
                    statusLabel={showingSample
                      ? undefined
                      : preliminary
                        ? 'Processing'
                        : criticalTotal > 0
                          ? 'Review needed'
                          : 'Verified'}
                  />

                  <div className="tabs" role="tablist">
                    {TABS.map(([id, label]) => (
                      <button
                        key={id}
                        className={`tab${activeTab === id ? ' active' : ''}`}
                        onClick={() => setActiveTab(id)}
                      >
                        {label}
                        {id === 'documents' ? <span>{documents.length}</span> : null}
                        {id === 'findings' ? (
                          <span className="alert-count">{FINDINGS.length}</span>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'overview' ? (
                    <OverviewPanel
                      documents={documents}
                      preliminary={preliminary}
                      criticalTotal={criticalTotal}
                      onOpenFindings={() => setActiveTab('findings')}
                      onFilterChecks={(filter) => {
                        setFindingFilter(filter)
                        setActiveTab('findings')
                      }}
                      onRunAgain={() => {
                        toast('Re-running 46 verification checks…')
                        later(() => toast('Verification complete · results are unchanged'), 1200)
                      }}
                      onAddMore={openUpload}
                    />
                  ) : null}

                  {activeTab === 'documents' ? (
                    <DocumentsPanel documents={documents} onAdd={openUpload} />
                  ) : null}

                  {activeTab === 'findings' ? (
                    <FindingsPanel
                      filter={findingFilter}
                      activeChip={activeChip}
                      onChangeSeverity={(severity) => {
                        setActiveChip(severity)
                        setFindingFilter(severity)
                      }}
                      onOpenEvidence={openEvidence}
                    />
                  ) : null}

                  {activeTab === 'audit' ? (
                    <AuditPanel onExport={() => toast('Audit log prepared for export')} />
                  ) : null}
                </div>
              )}
            </section>

            <AssistantPanel
              open={assistantOpen}
              messages={messages}
              showSuggestions={showSuggestions}
              onSend={onSend}
              onSuggestion={onSuggestion}
              onPromptAction={onPromptAction}
              onClose={() => {
                setAssistantOpen(false)
                setFabHidden(false)
              }}
            />
          </div>
        </main>
      </div>

      <button
        className={`assistant-fab${fabHidden ? ' hidden' : ''}`}
        onClick={() => {
          setAssistantOpen(true)
          setFabHidden(true)
        }}
      >
        ✦ <span>Assistant</span>
      </button>

      <input
        type="file"
        ref={fileInput}
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.csv,.xlsx,.xls"
        hidden
        onChange={(event) => {
          if (event.target.files) processFiles(event.target.files)
          event.target.value = ''
        }}
      />

      {uploadOpen ? (
        <UploadModal
          selectedType={selectedType}
          onSelectType={setSelectedType}
          onContinue={() => fileInput.current?.click()}
          onClose={() => setUploadOpen(false)}
        />
      ) : null}

      {evidenceOpen ? (
        <EvidenceModal
          onClose={() => setEvidenceOpen(false)}
          onAcknowledge={() => {
            setAcknowledged(true)
            setEvidenceOpen(false)
            toast('Finding acknowledged and added to the audit trail')
          }}
        />
      ) : null}

      <div className={`toast${toastShown ? ' show' : ''}`} role="status">
        {toastText}
      </div>
    </>
  )
}
