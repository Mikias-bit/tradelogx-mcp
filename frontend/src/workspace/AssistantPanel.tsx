import { type FormEvent, useEffect, useRef, useState } from 'react'
import type { ThreadMessage } from './messages'

interface AssistantPanelProps {
  open: boolean
  messages: Array<ThreadMessage>
  showSuggestions: boolean
  onSend: (text: string) => void
  onSuggestion: (text: string) => void
  onPromptAction: (action: 'sample' | 'required' | 'checks') => void
  onClose: () => void
}

const SUGGESTIONS = ['Explain the high issue', 'What should I do next?']

export default function AssistantPanel({
  open,
  messages,
  showSuggestions,
  onSend,
  onSuggestion,
  onPromptAction,
  onClose,
}: AssistantPanelProps) {
  const [draft, setDraft] = useState('')
  const thread = useRef<HTMLDivElement>(null)

  // Keep the newest message in view as the thread grows.
  useEffect(() => {
    const el = thread.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  return (
    <aside className={`assistant-panel${open ? ' open' : ''}`} aria-label="Tradelogx assistant">
      <div className="assistant-header">
        <div className="ai-avatar">
          <span>✦</span>
        </div>
        <div>
          <strong>Trade Assistant</strong>
          <span>
            <i></i> Ready to help
          </span>
        </div>
        <button aria-label="Close assistant" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="assistant-thread" ref={thread}>
        {messages.map((message) =>
          message.role === 'user' ? (
            <div className="user-message" key={message.id}>
              <div>{message.text}</div>
            </div>
          ) : (
            <div className="ai-message" key={message.id}>
              <div className="mini-avatar">✦</div>
              <div>
                {message.body}
                {message.prompts?.length ? (
                  <div className="prompt-grid">
                    {message.prompts.map((prompt, i) => {
                      const action = message.promptActions?.[i]
                      return (
                        <button
                          key={prompt}
                          onClick={action ? () => onPromptAction(action) : undefined}
                        >
                          {prompt}
                        </button>
                      )
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ),
        )}
      </div>

      <div className="assistant-input">
        <div className={`suggested-prompts${showSuggestions ? '' : ' hidden'}`}>
          {SUGGESTIONS.map((suggestion) => (
            <button key={suggestion} onClick={() => onSuggestion(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
        <form onSubmit={submit}>
          <textarea
            rows={1}
            placeholder="Ask about this trade file…"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" aria-label="Send">
            ↑
          </button>
        </form>
        <small>AI guidance should be reviewed by a trade professional.</small>
      </div>
    </aside>
  )
}
