import { ENV } from '../config.js';
import { auditAction, auditEscalation } from '../audit/heimdall.js';
import { APPROVAL_TIMEOUT_MINUTES } from '../types.js';
import type { EscalationRequest, ApprovalResult, ApprovalDecision } from '../types.js';

const API_BASE = `https://api.telegram.org/bot${ENV.telegramBotToken}`;
const CHAT_ID = ENV.telegramChatId;
const POLL_TIMEOUT_S = 30;

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface CallbackQuery {
  id: string;
  data?: string;
  message?: { message_id: number; chat: { id: number } };
}

interface Update {
  update_id: number;
  callback_query?: CallbackQuery;
}

async function telegramPost<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`${API_BASE}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await resp.json()) as TelegramResponse<T>;
  if (!json.ok) {
    throw new Error(`Telegram API error (${method}): ${json.description ?? 'unknown'}`);
  }
  return json.result;
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

function formatEscalationMessage(req: EscalationRequest): string {
  const agent = escapeMarkdownV2(req.agent);
  const action = escapeMarkdownV2(req.action);
  const category = escapeMarkdownV2(req.category);
  const detail = escapeMarkdownV2(req.detail);
  const ts = escapeMarkdownV2(req.timestamp);

  return [
    '🚨 *AGENT ESCALATION — APPROVAL REQUIRED*',
    '',
    `*Agent:* ${agent}`,
    `*Action:* ${action}`,
    `*Category:* \`${category}\``,
    '',
    `*Detail:*`,
    detail,
    '',
    `_Timestamp: ${ts}_`,
    '',
    'The agent loop is *paused* until you respond\\.',
  ].join('\n');
}

async function sendApprovalRequest(req: EscalationRequest): Promise<number> {
  const result = await telegramPost<{ message_id: number }>('sendMessage', {
    chat_id: CHAT_ID,
    text: formatEscalationMessage(req),
    parse_mode: 'MarkdownV2',
    reply_markup: {
      inline_keyboard: [[
        { text: '✅ Approve', callback_data: `approve:${req.timestamp}` },
        { text: '❌ Reject', callback_data: `reject:${req.timestamp}` },
      ]],
    },
  });
  return result.message_id;
}

async function drainOldUpdates(): Promise<number> {
  const updates = await telegramPost<Update[]>('getUpdates', {
    timeout: 0,
    allowed_updates: ['callback_query'],
  });
  if (updates.length === 0) return 0;
  const maxId = Math.max(...updates.map((u) => u.update_id));
  await telegramPost<Update[]>('getUpdates', {
    offset: maxId + 1,
    timeout: 0,
    allowed_updates: ['callback_query'],
  });
  return maxId + 1;
}

interface WaitOutcome {
  decision: ApprovalDecision;
  autoRejected: boolean;
}

/**
 * Wait for a human Approve/Reject tap, OR auto-reject after timeoutMs.
 *
 * The watchdog NEVER auto-approves. A missed gate request times out to
 * REJECT — the safe direction — and the human is notified it auto-rejected.
 */
async function waitForApproval(
  messageId: number,
  offset: number,
  timeoutMs: number,
): Promise<WaitOutcome> {
  let currentOffset = offset;
  const deadline = Date.now() + timeoutMs;

  while (true) {
    // --- Watchdog: deadline passed with no response -> AUTO-REJECT ---
    if (Date.now() >= deadline) {
      await telegramPost('editMessageText', {
        chat_id: CHAT_ID,
        message_id: messageId,
        text: '⏰ *AUTO\\-REJECTED* — no response within the timeout\\. Action blocked\\.',
        parse_mode: 'MarkdownV2',
      });
      auditAction('jarvis', 'AUTO_REJECT', `No response within ${Math.round(timeoutMs / 60000)}min — auto-rejected (never auto-approves)`);
      return { decision: 'reject', autoRejected: true };
    }

    // Clamp the long-poll so we re-check the deadline promptly near timeout.
    const remainingS = Math.max(1, Math.ceil((deadline - Date.now()) / 1000));
    const pollS = Math.min(POLL_TIMEOUT_S, remainingS);

    const updates = await telegramPost<Update[]>('getUpdates', {
      offset: currentOffset,
      timeout: pollS,
      allowed_updates: ['callback_query'],
    });

    for (const update of updates) {
      currentOffset = update.update_id + 1;

      const cb = update.callback_query;
      if (!cb?.data || cb.message?.message_id !== messageId) continue;

      const decision = cb.data.startsWith('approve:') ? 'approve' : 'reject';

      await telegramPost('answerCallbackQuery', {
        callback_query_id: cb.id,
        text: decision === 'approve' ? 'Approved — loop resuming.' : 'Rejected — action blocked.',
      });

      const outcomeText = decision === 'approve'
        ? '✅ *APPROVED* — loop resuming\\.'
        : '❌ *REJECTED* — action blocked\\.';

      await telegramPost('editMessageText', {
        chat_id: CHAT_ID,
        message_id: messageId,
        text: outcomeText,
        parse_mode: 'MarkdownV2',
      });

      return { decision, autoRejected: false };
    }
  }
}

export async function requestApproval(
  req: EscalationRequest,
  timeoutMs: number = APPROVAL_TIMEOUT_MINUTES * 60_000,
): Promise<ApprovalResult> {
  auditEscalation(req.agent, req.category, `Requesting approval: ${req.action}`);

  const offset = await drainOldUpdates();
  const messageId = await sendApprovalRequest(req);

  auditAction('jarvis', 'TELEGRAM_SENT', `Approval message sent (msg_id=${messageId}, timeout=${Math.round(timeoutMs / 60000)}min)`);

  const outcome = await waitForApproval(messageId, offset, timeoutMs);

  auditEscalation(
    req.agent,
    req.category,
    `${req.action} — ${outcome.decision}${outcome.autoRejected ? ' (AUTO-REJECT/watchdog)' : ''}`,
    outcome.decision,
  );

  if (outcome.autoRejected) {
    await sendPlainNotification(
      `[PropScout Agents] AUTO-REJECTED (no response in ${Math.round(timeoutMs / 60000)}min): ` +
      `"${req.action.slice(0, 80)}". The action was blocked. Re-queue it if you still want it.`,
    );
  }

  return {
    decision: outcome.decision,
    respondedAt: new Date().toISOString(),
    requestedAt: req.timestamp,
    autoRejected: outcome.autoRejected,
  };
}

export async function sendNotification(text: string): Promise<void> {
  await telegramPost('sendMessage', {
    chat_id: CHAT_ID,
    text,
    parse_mode: 'MarkdownV2',
  });
  auditAction('jarvis', 'NOTIFICATION_SENT', text.slice(0, 120));
}

export async function sendPlainNotification(text: string): Promise<void> {
  await telegramPost('sendMessage', {
    chat_id: CHAT_ID,
    text,
  });
  auditAction('jarvis', 'NOTIFICATION_SENT', text.slice(0, 120));
}
