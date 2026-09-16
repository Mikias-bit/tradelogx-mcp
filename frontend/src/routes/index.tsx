import { createFileRoute } from '@tanstack/react-router'
import AuthGate from '../auth/AuthGate'
import Workspace from '../workspace/Workspace'

export const Route = createFileRoute('/')({
  component: () => <AuthGate><Workspace /></AuthGate>,
})
