import type { ReactElement } from 'react'
export function createSource(): any
export function Shell(props: any): ReactElement
export function SourceEditor(props: any): ReactElement
export function WebhookSourcePanel(props: any): ReactElement
export function WebhookSources(props: any): ReactElement
export function WebhookPolicies(props: {
  value: unknown
  onChange: (value: string) => void
  endpoints?: any[]
  endpointId?: string
  hideTabs?: boolean
}): ReactElement

export function WebhookToolbarProvider(props: any): ReactElement
export function WebhookToolbar(): ReactElement | null
export function WebhookSenders(props: any): ReactElement
