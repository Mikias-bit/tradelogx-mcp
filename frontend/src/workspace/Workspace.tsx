import HybridReviewPanel from './HybridReviewPanel'
import CaseHistoryPanel from './CaseHistoryPanel'
import ChecksPanel from './ChecksPanel'
import { useCallback, useEffect, useRef, useState } from 'react'
import AssistantPanel from './AssistantPanel'
import AuditPanel from './AuditPanel'
import DocumentsPanel from './DocumentsPanel'
import EmptyDrop from './EmptyDrop'
import EvidenceModal from './EvidenceModal'
import FindingsPanel from './FindingsPanel'
import OverviewPanel from './OverviewPanel'
import Sidebar from './Sidebar'
import ReferencePanel from './ReferencePanel'
import Topbar from './Topbar'
import TransactionCard from './TransactionCard'
import UploadModal from './UploadModal'
import { documentRole, uploadAndSubmit, waitForCase, retryCase, explainCase, type ConversationTurn, type CaseState, type ValidationAggregate } from './api'
import {
  FINDINGS,
  SAMPLE_DOCUMENTS,
  type TabId,
  type Finding,
  type TradeDocument,
  formatSize,
  inferType,
} from './data'
import * as copy from './messages'
import type { ThreadMessage } from './messages'
import { useUserId } from '../auth/AuthGate'

const BUILD_TITLE = 'Build a verified trade file'
const BUILD_SUBTITLE =
  'Add your shipment documents. Tradelogx will organize the file, reconcile key facts, and explain every discrepancy.'
const ACTIVE_CASE_STORAGE_KEY = 'tradelogx.active-case.v1'

interface SavedCaseView {
  documents: Array<TradeDocument>
  transactionLabel: string
  pageTitle: string
  pageSubtitle: string
  confidence: number | null
  criticalTotal: number
  preliminary: boolean
  validationResult?: ValidationAggregate
}

interface StagedFile {
  file: File
  documentType: string
}

const TABS: ReadonlyArray<[TabId, string]> = [
  ['overview', 'Overview'],
  ['checks', 'Checks and coverage'],
  ['hybrid', 'AI review'],
  ['documents', 'Documents'],
  ['findings', 'Findings'],
  ['audit', 'Audit trail'],
  ['benchmarks', 'Benchmarks'],
  ['rules', 'Rules library'],
]

export default function Workspace() {
  const [documents, setDocuments] = useState<Array<TradeDocument>>([])
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [selectedType, setSelectedType] = useState('Auto-detect')
  const [findingFilter, setFindingFilter] = useState('all')
  const [activeChip, setActiveChip] = useState('all')
  const acknowledged = false
  const [confidence, setConfidence] = useState<number | null>(null)
  const [criticalTotal, setCriticalTotal] = useState(0)
  const [preliminary, setPreliminary] = useState(false)
  const [transactionLabel, setTransactionLabel] = useState('New verification')
  const [pageTitle, setPageTitle] = useState(BUILD_TITLE)
  const [pageSubtitle, setPageSubtitle] = useState(BUILD_SUBTITLE)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [assistantOpen, setAssistantOpen] = useState(false)
  const [fabHidden, setFabHidden] = useState(true)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(null)
  const [toastText, setToastText] = useState('')
  const [toastShown, setToastShown] = useState(false)
  const [savedCase, setSavedCase] = useState<SavedCaseView | null>(null)
  const [showingSample, setShowingSample] = useState(false)
  const [stagedFiles, setStagedFiles] = useState<Array<StagedFile>>([])
  const [validationResult, setValidationResult] = useState<ValidationAggregate | undefined>(savedCase?.validationResult)

  const userId = useUserId()
  const storageKey = `tradelogx.case-id.v2.${userId}`
  const [caseId, setCaseId] = useState(() => window.sessionStorage.getItem(storageKey) || '')
  const [caseState, setCaseState] = useState<CaseState | 'IDLE'>('IDLE')
  const [processingError, setProcessingError] = useState('')
  const [working, setWorking] = useState(false)
  const requestVersion = useRef(0)
  const polling = useRef<AbortController | null>(null)
  const conversation = useRef<ConversationTurn[]>([])
  const chatBusy = useRef(false)
  const [assistantBusy, setAssistantBusy] = useState(false)
  useEffect(() => {
    // Remove the old cross-account cache. Persist only an opaque per-user ID.
    window.localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY)
    return () => { requestVersion.current++; polling.current?.abort() }
  }, [])
  useEffect(() => {
    conversation.current = []
    setMessages([{ id: ++messageId.current, ...copy.OPENING }])
  }, [caseId, showingSample])

  const messageId = useRef(0)
  const nextId = () => ++messageId.current
  const [messages, setMessages] = useState<Array<ThreadMessage>>(() => [
    { id: nextId(), ...copy.OPENING },
  ])

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
    const locked = uploadOpen || selectedFinding !== null
    document.body.style.overflow = locked ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [uploadOpen, selectedFinding])

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
    setValidationResult(savedCase.validationResult)
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
    setValidationResult(savedCase.validationResult)
  // This restores persisted case state only on initial mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadSample = useCallback(() => {
    requestVersion.current++
    polling.current?.abort()
    setWorking(false)
    setProcessingError('')
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
    setValidationResult(undefined)
    say(copy.SAMPLE_VERIFIED)
    toast('Sample shipment loaded · 46 checks complete')
  }, [say, toast])

  const applyResult = (id: string, aggregate: ValidationAggregate, sourceDocuments: TradeDocument[]) => {
    const occurrences = new Map<string, number>()
    const rows: TradeDocument[] = sourceDocuments.length ? sourceDocuments : Object.keys(aggregate.documents || {}).map(key => ({
      name: key.replaceAll('_', ' '), type: key, pages: 0, confidence: null, status: 'unverified', size: '',
    }))
    const completedDocuments = rows.map(document => {
      let role: string
      try { role = documentRole(document.type) } catch { role = document.type }
      const occurrence = (occurrences.get(role) || 0) + 1
      occurrences.set(role, occurrence)
      const uploadRole = occurrence === 1 ? role : `${role}_${occurrence}`
      const result = aggregate.documents?.[aggregate.document_roles?.[uploadRole] || uploadRole]
      return { ...document, confidence: null,
        status: Number(result?.violation_count || 0) > 0 ? 'issue' as const : 'unverified' as const }
    })
    const score = typeof aggregate.shipment_score === 'number' && ['CHECKS_PASSED', 'REVIEW_REQUIRED'].includes(aggregate.verification_status || '') ? aggregate.shipment_score : null
    const subtitle = `${Number(aggregate.violation_count || 0)} reported findings. ${Number(aggregate.unverified_rule_count || 0)} checks unverified or skipped. Review evidence before making a decision.`
    const view: SavedCaseView = { documents: completedDocuments, transactionLabel: `Case ${id.slice(0, 8)}`,
      pageTitle: 'Review processing results', pageSubtitle: subtitle, confidence: score,
      criticalTotal: Number(aggregate.severity_counts?.critical || 0), preliminary: false, validationResult: aggregate }
    setSavedCase(view)
    setDocuments(completedDocuments)
    setValidationResult(aggregate)
    setConfidence(score)
    setCriticalTotal(view.criticalTotal)
    setPreliminary(false)
    setPageTitle(view.pageTitle)
    setPageSubtitle(subtitle)
    setShowSuggestions(true)
  }

  const monitor = async (id: string, rows: TradeDocument[], version: number) => {
    polling.current?.abort()
    const controller = new AbortController()
    polling.current = controller
    const completed = await waitForCase(id, state => {
      if (requestVersion.current !== version) return
      setCaseState(state)
      setPageSubtitle(`Processing status: ${state.replaceAll('_', ' ').toLowerCase()}.`)
    }, { signal: controller.signal })
    if (requestVersion.current === version) applyResult(id, completed.result.results!, rows)
  }

  const openSavedCase = async (id: string) => {
    const version = ++requestVersion.current
    polling.current?.abort()
    setWorking(true); setProcessingError(''); setShowingSample(false)
    setSelectedFinding(null); setSavedCase(null); setDocuments([]); setStagedFiles([])
    setValidationResult(undefined); setConfidence(null); setPreliminary(true)
    setCaseId(id); setCaseState('SUBMITTED'); setActiveTab('overview')
    setTransactionLabel(`Case ${id.slice(0, 8)}`); setPageTitle('Saved verification')
    window.sessionStorage.setItem(storageKey, id)
    try { await monitor(id, [], version) }
    catch (error) { if (requestVersion.current === version) setProcessingError(error instanceof Error ? error.message : 'Unable to open case') }
    finally { if (requestVersion.current === version) setWorking(false) }
  }

  const refreshCase = async (retry = false) => {
    if (!caseId || working || showingSample) return
    const version = ++requestVersion.current
    setWorking(true)
    setProcessingError('')
    try {
      let id = caseId
      if (retry) {
        const response = await retryCase(id)
        id = response.result.case_id
        setCaseId(id)
        window.sessionStorage.setItem(storageKey, id)
        setValidationResult(undefined)
        setConfidence(null)
        setPreliminary(true)
      }
      setTransactionLabel(`Case ${id.slice(0, 8)}`)
      await monitor(id, documents, version)
    } catch (error) {
      if (requestVersion.current === version) setProcessingError(error instanceof Error ? error.message : 'Status unavailable. Try refreshing status.')
    } finally {
      if (requestVersion.current === version) setWorking(false)
    }
  }

  useEffect(() => {
    if (caseId) void refreshCase()
    // Restore only the current user's case ID; fetch all contents after authorization.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const processFiles = useCallback(async (files: ReadonlyArray<File>, stagedTypes?: ReadonlyArray<string>) => {
    if (!files.length || working) return
    const version = ++requestVersion.current
    polling.current?.abort()
    setWorking(true)
    setUploadOpen(false)
    setProcessingError('')
    setCaseId('')
    window.sessionStorage.removeItem(storageKey)
    setCaseState('IDLE')
    setValidationResult(undefined)
    setSavedCase(null)
    setConfidence(null)
    setCriticalTotal(0)
    setPreliminary(true)
    setShowingSample(false)
    const selectedFiles = Array.from(files)
    const documentTypes = stagedTypes ? Array.from(stagedTypes) : selectedFiles.map(file => selectedType === 'Auto-detect' ? inferType(file.name) : selectedType)
    const added: TradeDocument[] = selectedFiles.map((file, index) => ({ name: file.name, type: documentTypes[index], pages: 0, confidence: null, status: 'processing', size: formatSize(file.size) }))
    setDocuments(added)
    setPageTitle('Processing trade file')
    setPageSubtitle('Uploading documents securely.')
    setActiveTab('overview')
    try {
      const submission = await uploadAndSubmit(selectedFiles, documentTypes)
      if (requestVersion.current !== version) return
      const id = submission.result.case_id
      setCaseId(id)
      window.sessionStorage.setItem(storageKey, id)
      setStagedFiles([])
      setTransactionLabel(`Case ${id.slice(0, 8)}`)
      await monitor(id, added, version)
    } catch (error) {
      if (requestVersion.current !== version) return
      setProcessingError(error instanceof Error ? error.message : 'Processing failed. Try again.')
      setDocuments(prev => prev.map(doc => ({ ...doc, status: 'unverified', confidence: null })))
    } finally {
      if (requestVersion.current === version) setWorking(false)
    }
  }, [selectedType, working, storageKey])

  const stageFiles = useCallback((files: FileList) => {
    const selected = Array.from(files).map((file) => ({
      file,
      documentType: selectedType === 'Auto-detect' ? inferType(file.name) : selectedType,
    }))
    {
      const combined = [...stagedFiles]
      for (const candidate of selected) {
        const duplicate = combined.some(({ file }) =>
          file.name.toLowerCase() === candidate.file.name.toLowerCase()
          && file.size === candidate.file.size
          && file.lastModified === candidate.file.lastModified,
        )
        if (!duplicate) combined.push(candidate)
      }
      requestVersion.current++
      polling.current?.abort()
      setWorking(false)
      setCaseId('')
      setSavedCase(null)
      setCaseState('IDLE')
      setProcessingError('')
      setConfidence(null)
      setPreliminary(true)
      window.sessionStorage.removeItem(storageKey)
      setDocuments(combined.map(({ file, documentType }) => ({
        name: file.name,
        type: documentType,
        pages: 0,
        confidence: null,
        status: 'processing' as const,
        size: formatSize(file.size),
      })))
      setTransactionLabel('Draft verification')
      setPageTitle('Build this verification case')
      setPageSubtitle('Add every related document, then start verification to process them as one case.')
      setShowingSample(false)
      setValidationResult(undefined)
      setActiveTab('documents')
      toast(`${combined.length} document${combined.length === 1 ? '' : 's'} ready for this case`)
      setStagedFiles(combined)
    }
    setUploadOpen(false)
  }, [selectedType, toast, storageKey, stagedFiles])

  const submitStagedFiles = useCallback(() => {
    if (!stagedFiles.length) return
    void processFiles(
      stagedFiles.map(({ file }) => file),
      stagedFiles.map(({ documentType }) => documentType),
    )
  }, [processFiles, stagedFiles])

  const openUpload = useCallback(() => {
    setSelectedType('Auto-detect')
    setUploadOpen(true)
  }, [])

  const newCheck = useCallback(() => {
    requestVersion.current++
    polling.current?.abort()
    setWorking(false)
    setCaseId('')
    setCaseState('IDLE')
    setProcessingError('')
    setConfidence(null)
    window.sessionStorage.removeItem(storageKey)
    if (documents.length) {
      setDocuments([])
      setStagedFiles([])
      setSavedCase(null)
      setValidationResult(undefined)
      window.localStorage.removeItem(ACTIVE_CASE_STORAGE_KEY)
      setPageTitle(BUILD_TITLE)
      setPageSubtitle(BUILD_SUBTITLE)
      toast('New verification ready')
    } else {
      openUpload()
    }
  }, [documents.length, openUpload, toast, storageKey])

  const openEvidence = useCallback((finding: Finding) => {
    setSelectedFinding(finding)
  }, [])

  const onPromptAction = useCallback(
    (action: 'sample' | 'required' | 'checks') => {
      if (action === 'sample') loadSample()
      else if (action === 'required') say(copy.REQUIRED_DOCS)
      else say(copy.WHAT_I_CHECK)
    },
    [loadSample, say],
  )

  const onSend = async (text: string) => {
    if (chatBusy.current) return
    ask(text)
    if (showingSample || !caseId) {
      say({ role: 'assistant', body: <p>Select a real case to ask the conversational assistant about its evidence. Sample results are demonstrations.</p> })
      return
    }
    const version = requestVersion.current
    chatBusy.current = true
    setAssistantBusy(true)
    try {
      const { result } = await explainCase(caseId, text, conversation.current)
      if (version !== requestVersion.current) return
      say({ role: 'assistant', body: <><p style={{ whiteSpace: 'pre-wrap' }}>{result.answer}</p>
        {result.citations.map(cite => <p key={cite.id}>[{cite.id}] {cite.rule_id}: {cite.status.replaceAll('_', ' ')}</p>)}
        <small>Explanation only. Findings remain unchanged.</small></> })
      if (result.available) conversation.current = [...conversation.current, { role: 'user', content: text }, { role: 'assistant', content: result.answer }].slice(-6) as ConversationTurn[]
    } catch (error) {
      if (version === requestVersion.current) say({ role: 'assistant', body: <p>{error instanceof Error ? error.message : 'Assistant unavailable. Please try again.'}</p> })
    } finally {
      chatBusy.current = false
      setAssistantBusy(false)
    }
  }
  const onSuggestion = onSend

  const loaded = documents.length > 0

  return (
    <>
      <div className="app-shell">
        <Sidebar
          open={sidebarOpen}
          activeItem={['hybrid', 'cases', 'checks', 'documents', 'benchmarks', 'rules', 'audit'].includes(activeTab) ? activeTab : 'workspace'}
          onNavigate={(item) => {
            setActiveTab(item.id === 'workspace' ? 'overview' : item.id as TabId)
            setSidebarOpen(false)
          }}
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
                  <button className="primary" disabled={working} onClick={openUpload}>
                    ＋ Add documents
                  </button>
                  {stagedFiles.length ? (
                    <button className="primary" disabled={working} onClick={submitStagedFiles}>
                      Start verification ({stagedFiles.length})
                    </button>
                  ) : null}
                </div>
              </div>

              {caseId && !showingSample ? <div className="case-status" role="status">
                <p>Case {caseId} ? {caseState.replaceAll('_', ' ')}</p>
                {processingError ? <p role="alert">{processingError}</p> : null}
                <button className="secondary" disabled={working} onClick={() => void refreshCase()}>Refresh status</button>
                {['FAILED', 'TIMED_OUT'].includes(caseState) ? <button className="primary" disabled={working} onClick={() => void refreshCase(true)}>Retry as new case</button> : null}
              </div> : processingError ? <p role="alert">{processingError} Select the files and start verification again.</p> : null}

              {activeTab === 'hybrid' ? <HybridReviewPanel result={validationResult} isSample={showingSample} />
              : activeTab === 'cases' ? <CaseHistoryPanel onOpen={id => void openSavedCase(id)} />
              : activeTab === 'checks' ? <ChecksPanel result={validationResult} isSample={showingSample} />
              : !loaded && (activeTab === 'rules' || activeTab === 'benchmarks') ? (
                <ReferencePanel mode={activeTab} result={validationResult} isSample={showingSample} onOpenEvidence={openEvidence} />
              ) : !loaded && activeTab === 'documents' ? (
                <DocumentsPanel documents={documents} onAdd={openUpload} />
              ) : !loaded && activeTab === 'audit' ? (
                <p>No active case yet. Upload documents to start an audit trail.</p>
              ) : !loaded ? (
                <EmptyDrop onChooseFiles={openUpload} onDropFiles={stageFiles} />
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
                    evidenceCoverage={showingSample ? undefined : validationResult?.evidence_summary?.coverage_percent}
                    acknowledged={acknowledged}
                    isSample={showingSample}
                    statusLabel={showingSample ? 'Sample ? review needed' : ['FAILED', 'TIMED_OUT'].includes(caseState) ? 'Processing failed' : preliminary ? 'Not yet verified' : 'Review evidence'}
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
                          <span className="alert-count">
                            {showingSample ? FINDINGS.length : Number(validationResult?.violation_count || 0)}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'rules' || activeTab === 'benchmarks' ? (
                    <ReferencePanel mode={activeTab} result={validationResult} isSample={showingSample} onOpenEvidence={openEvidence} />
                  ) : null}

                  {activeTab === 'overview' ? (
                    <OverviewPanel
                      documents={documents}
                      preliminary={preliminary}
                      criticalTotal={criticalTotal}
                      isSample={showingSample}
                      result={validationResult}
                      onOpenFindings={() => setActiveTab('findings')}
                      onFilterChecks={(filter) => {
                        setFindingFilter(filter)
                        setActiveTab('findings')
                      }}
                      onRunAgain={() => { if (!showingSample) void refreshCase() }}
                      onAddMore={openUpload}
                    />
                  ) : null}

                  {activeTab === 'documents' ? (
                    <DocumentsPanel documents={documents} onAdd={openUpload} />
                  ) : null}

                  {activeTab === 'findings' ? (
                    <FindingsPanel
                      isSample={showingSample}
                      violations={(validationResult?.outcomes || validationResult?.violations || []).filter(row => row.evaluation_status !== 'PASSED' && row.evaluation_status !== 'NOT_APPLICABLE')}
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
                    <AuditPanel
                      isSample={showingSample}
                      result={validationResult}
                      documentCount={documents.length}
                      onExport={() => {
                        if (!validationResult || showingSample) { toast('No live result to export'); return }
                        const url = URL.createObjectURL(new Blob([JSON.stringify({ case_id: caseId, results: validationResult }, null, 2)], { type: 'application/json' }))
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `tradelogx-${caseId}.json`
                        link.click()
                        URL.revokeObjectURL(url)
                      }}
                    />
                  ) : null}
                </div>
              )}
            </section>

            <AssistantPanel
              busy={assistantBusy}
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
        accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff,.webp"
        hidden
        onChange={(event) => {
          if (event.target.files) stageFiles(event.target.files)
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

      {selectedFinding ? (
        <EvidenceModal finding={selectedFinding} onClose={() => setSelectedFinding(null)} />
      ) : null}

      <div className={`toast${toastShown ? ' show' : ''}`} role="status">
        {toastText}
      </div>
    </>
  )
}
