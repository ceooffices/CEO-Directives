/**
 * lib/notion-client.js
 * Notion API wrapper cho CEO Directive Automation
 * Shared giữa tất cả WF scripts
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Database IDs from .env
const DB = {
  CLARIFICATION: process.env.NOTION_DB_CLARIFICATION,
  WF_LOGS:       process.env.NOTION_DB_WF_LOGS,
  MESSAGES:      process.env.NOTION_DB_MESSAGES,
  HR:            process.env.NOTION_DB_HR,
  EMPLOYEE_COMMITMENTS: process.env.NOTION_DB_EMPLOYEE_COMMITMENTS,
  HM50:                 process.env.NOTION_DB_HM50,
  BOD_MEETINGS:         process.env.NOTION_DB_BOD_MEETINGS,
};

// ===== HELPERS =====

const emailCache = {};
async function getUserEmail(pageId) {
  if (emailCache[pageId]) return emailCache[pageId];
  try {
    const page = await notion.pages.retrieve({ page_id: pageId });
    const emailProp = page.properties['Email'] || page.properties['email'];
    if (emailProp && emailProp.type === 'email' && emailProp.email) {
      emailCache[pageId] = emailProp.email;
      return emailProp.email;
    }
  } catch (e) {
    // silently fail and fallback to empty
  }
  return '';
}

async function resolveEmailFromRelation(relationProp) {
  if (!relationProp || relationProp.type !== 'relation') return '';
  if (!Array.isArray(relationProp.relation) || relationProp.relation.length === 0) return '';
  for (const rel of relationProp.relation) {
    const email = await getUserEmail(rel.id);
    if (email) return email;
  }
  return '';
}

function safeText(richTextArray) {
  if (!Array.isArray(richTextArray) || richTextArray.length === 0) return '';
  return richTextArray.map(t => t.plain_text || '').join('');
}

function safeSelect(select) {
  return select?.name || '';
}

function safeDate(date) {
  return date?.start || '';
}

function safeRelation(relation) {
  if (!Array.isArray(relation) || relation.length === 0) return null;
  return relation[0];
}

function safeRollupEmail(rollup) {
  if (!rollup || rollup.type !== 'array' || !Array.isArray(rollup.array)) return '';
  if (rollup.array.length === 0) return '';
  const first = rollup.array[0];
  if (first.type === 'email') return first.email || '';
  if (first.type === 'rich_text') return safeText(first.rich_text);
  return '';
}

function safeRollupTitle(rollup) {
  if (!rollup || rollup.type !== 'array' || !Array.isArray(rollup.array)) return '';
  if (rollup.array.length === 0) return '';
  const first = rollup.array[0];
  if (first.type === 'title') return safeText(first.title);
  return '';
}

// ===== QUERIES =====

/** Query a Notion database with filter and sorts */
async function queryDatabase(databaseId, filter = undefined, sorts = undefined, pageSize = 100) {
  const params = { database_id: databaseId, page_size: pageSize };
  if (filter) params.filter = filter;
  if (sorts) params.sorts = sorts;

  const results = [];
  let cursor;

  do {
    if (cursor) params.start_cursor = cursor;
    const response = await notion.databases.query(params);
    results.push(...response.results);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);

  return results;
}

/** Get a single page by ID */
async function getPage(pageId) {
  return notion.pages.retrieve({ page_id: pageId });
}

/** Update page properties */
async function updatePage(pageId, properties) {
  return notion.pages.update({ page_id: pageId, properties });
}

/** Create a new page */
async function createPage(databaseId, properties) {
  return notion.pages.create({
    parent: { database_id: databaseId },
    properties,
  });
}

// ===== SPECIFIC QUERIES =====

/** WF1: Query clarifications pending approval (STEP1) */
async function queryClarificationsStep1() {
  return queryDatabase(DB.CLARIFICATION, {
    and: [
      { property: 'TINH_TRANG', select: { equals: 'Chờ làm rõ' } },
      {
        or: [
          { property: '✅ Đã duyệt bởi người chỉ đạo', select: { is_empty: true } },
          { property: '✅ Đã duyệt bởi người chỉ đạo', select: { equals: 'Chưa duyệt' } },
        ],
      },
    ],
  });
}

/** WF1: Query clarifications approved (STEP2) */
async function queryClarificationsStep2() {
  return queryDatabase(DB.CLARIFICATION, {
    and: [
      { property: 'TINH_TRANG', select: { does_not_equal: 'Đã tạo task' } },
      { property: '✅ Đã duyệt bởi người chỉ đạo', select: { equals: 'Đã duyệt' } },
      {
        or: [
          { property: 'LENH_GUI_LOI_NHAC', select: { is_empty: true } },
          { property: 'LENH_GUI_LOI_NHAC', select: { equals: 'Gửi lời nhắc' } },
        ],
      },
    ],
  });
}

/** WF2: Query directives confirmed 5T, not yet completed */
async function queryConfirmed5T() {
  return queryDatabase(DB.CLARIFICATION, {
    and: [
      { property: 'TINH_TRANG', select: { equals: 'Đã xác nhận 5T' } },
    ],
  });
}

/** WF3: Query all clarifications for status snapshot */
async function queryClarificationsForSnapshot() {
  return queryDatabase(DB.CLARIFICATION);
}

/** WF4: Query directives not completed + has deadline (for escalation) */
async function queryOverdueClarifications() {
  return queryDatabase(DB.CLARIFICATION, {
    and: [
      { property: 'TINH_TRANG', select: { does_not_equal: 'Hoàn thành' } },
      { property: 'T4 - Thời hạn', date: { is_not_empty: true } },
    ],
  });
}

/** WF6: Query active directives (not completed) for dashboard */
async function queryActiveClarifications() {
  return queryDatabase(DB.CLARIFICATION, {
    and: [
      { property: 'TINH_TRANG', select: { does_not_equal: 'Hoàn thành' } },
    ],
  });
}

/** WF6: Query all clarifications for dashboard sync */
async function queryAllClarifications() {
  return queryDatabase(DB.CLARIFICATION);
}

/** WF6: Query all HR records */
async function queryAllHR() {
  if (!DB.HR) return [];
  return queryDatabase(DB.HR);
}

/** Query all 50 HM strategic directives */
async function queryAllHM50() {
  if (!DB.HM50) return [];
  return queryDatabase(DB.HM50);
}

/** Query message library */
async function queryMessages() {
  if (!DB.MESSAGES) return [];
  return queryDatabase(DB.MESSAGES, {
    property: 'Active',
    checkbox: { equals: true },
  });
}

module.exports = {
  notion,
  DB,
  // Helpers
  safeText, safeSelect, safeDate, safeRelation, safeRollupEmail, safeRollupTitle,
  resolveEmailFromRelation,
  // Generic
  queryDatabase, getPage, updatePage, createPage,
  // Specific
  queryClarificationsStep1, queryClarificationsStep2,
  queryConfirmed5T, queryClarificationsForSnapshot,
  queryOverdueClarifications, queryActiveClarifications,
  queryAllClarifications, queryAllHR, queryAllHM50,
  queryMessages,
};
