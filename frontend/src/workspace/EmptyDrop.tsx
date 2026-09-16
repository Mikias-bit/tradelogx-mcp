import { type DragEvent, useState } from 'react'
import { DOC_CHIPS } from './data'

interface EmptyDropProps {
  onChooseFiles: () => void
  onDropFiles: (files: FileList) => void
}

export default function EmptyDrop({ onChooseFiles, onDropFiles }: EmptyDropProps) {
  const [dragover, setDragover] = useState(false)

  const over = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragover(true)
  }
  const leave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragover(false)
  }
  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragover(false)
    if (event.dataTransfer?.files.length) onDropFiles(event.dataTransfer.files)
  }

  return (
    <div
      className={`empty-drop${dragover ? ' dragover' : ''}`}
      onDragEnter={over}
      onDragOver={over}
      onDragLeave={leave}
      onDrop={drop}
    >
      <div className="drop-visual">
        <div className="paper paper-one"></div>
        <div className="paper paper-two"></div>
        <div className="upload-orb">↑</div>
      </div>
      <h2>Start with any trade document</h2>
      <p>PDF, JPG, PNG, CSV or XLSX · up to 25 MB each</p>
      <button className="primary" onClick={onChooseFiles}>
        Choose files
      </button>
      <span>or drag and drop them here</span>
      <div className="doc-chips">
        {DOC_CHIPS.map((chip) => (
          <span key={chip}>{chip}</span>
        ))}
      </div>
    </div>
  )
}
