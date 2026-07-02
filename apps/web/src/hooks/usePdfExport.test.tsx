/**
 * usePdfExport functionality tests — Pro gating, session handling, and the
 * UPGRADE_REQUIRED server fallback for the §14 PDF download.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { PaywallContext } from '../components/paywall/PaywallContext'
import { usePdfExport } from './usePdfExport'
import { getSession } from '../lib/services/authService'
import { downloadReportPdf, ReportPdfError } from '../lib/services/reportService'

vi.mock('../lib/services/authService', () => ({ getSession: vi.fn() }))
vi.mock('../lib/services/reportService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/services/reportService')>()
  return { ...actual, downloadReportPdf: vi.fn() }
})

const mockGetSession = vi.mocked(getSession)
const mockDownload = vi.mocked(downloadReportPdf)

function wrapperFor(tier: string, openUpgradeModal: (f: string) => void) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <PaywallContext.Provider value={{ tier, openUpgradeModal, openHardGate: () => undefined }}>
        {children}
      </PaywallContext.Provider>
    )
  }
}

describe('usePdfExport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('free tier: opens the pdf UpgradeModal and never calls the API', () => {
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('free', openModal),
    })

    expect(result.current.isLocked).toBe(true)
    act(() => result.current.exportPdf())
    expect(openModal).toHaveBeenCalledWith('pdf')
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it('pro tier without a token (demo route): no-op', () => {
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport(null), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    expect(openModal).not.toHaveBeenCalled()
    expect(mockDownload).not.toHaveBeenCalled()
  })

  it('pro tier with a session: downloads with the access token', async () => {
    mockGetSession.mockResolvedValue({ access_token: 'jwt-1' } as never)
    mockDownload.mockResolvedValue(undefined)
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', vi.fn()),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => {
      expect(mockDownload).toHaveBeenCalledWith('tok-1', 'jwt-1')
    })
    expect(result.current.exporting).toBe(false)
  })

  it('server UPGRADE_REQUIRED (stale local tier) opens the modal', async () => {
    mockGetSession.mockResolvedValue({ access_token: 'jwt-1' } as never)
    mockDownload.mockRejectedValue(new ReportPdfError('UPGRADE_REQUIRED', 'Pro feature'))
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => {
      expect(openModal).toHaveBeenCalledWith('pdf')
    })
  })

  it('signed out (no session): routes to the upgrade/sign-in flow, no request', async () => {
    mockGetSession.mockResolvedValue(null)
    const openModal = vi.fn()
    const { result } = renderHook(() => usePdfExport('tok-1'), {
      wrapper: wrapperFor('pro', openModal),
    })

    act(() => result.current.exportPdf())
    await waitFor(() => {
      expect(openModal).toHaveBeenCalledWith('pdf')
    })
    expect(mockDownload).not.toHaveBeenCalled()
  })
})
