import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CHAT_CATEGORIES,
  CHAT_CATEGORY_BY_ID,
  CHAT_QUESTIONS,
  CHAT_QUESTION_BY_ID,
  CHAT_WELCOME_MESSAGE,
} from './helpTopics.js'
import {
  createInitialChatState,
  helpAssistantReducer,
} from './helpAssistantState.js'

const timestamp = '9:41 AM'

test('starts with the requested welcome message and main-menu suggestions', () => {
  const state = createInitialChatState(timestamp)
  assert.equal(state.isOpen, false)
  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].text, CHAT_WELCOME_MESSAGE)
  assert.equal(state.messages[0].timestamp, timestamp)
  assert.deepEqual(
    state.suggestions.ids,
    CHAT_CATEGORIES.map((category) => category.id),
  )
})

test('minimizing and reopening preserves the conversation', () => {
  const withHistory = {
    ...createInitialChatState(timestamp),
    isOpen: true,
    messages: [
      ...createInitialChatState(timestamp).messages,
      { id: 'saved', role: 'user', text: 'Saved question', timestamp },
    ],
  }
  const minimized = helpAssistantReducer(withHistory, { type: 'MINIMIZE' })
  const reopened = helpAssistantReducer(minimized, { type: 'OPEN' })
  assert.equal(reopened.isOpen, true)
  assert.equal(reopened.messages.at(-1).text, 'Saved question')
})

test('category selection adds conversational messages and category questions', () => {
  const category = CHAT_CATEGORY_BY_ID['getting-started']
  const state = helpAssistantReducer(createInitialChatState(timestamp), {
    type: 'SELECT_CATEGORY',
    sequence: 1,
    timestamp,
    label: category.label,
    prompt: category.prompt,
    questionIds: category.questionIds,
  })
  assert.equal(state.messages.at(-2).role, 'user')
  assert.equal(state.messages.at(-2).text, 'Getting started')
  assert.equal(state.messages.at(-1).role, 'assistant')
  assert.deepEqual(state.suggestions.ids, category.questionIds)
})

test('question selection adds the user question, answer, and follow-ups', () => {
  const question = CHAT_QUESTION_BY_ID['improve-score']
  const state = helpAssistantReducer(createInitialChatState(timestamp), {
    type: 'SELECT_QUESTION',
    sequence: 2,
    timestamp,
    question: question.question,
    answer: question.answer,
    followUpIds: question.followUps,
  })
  assert.equal(state.messages.at(-2).text, question.question)
  assert.equal(state.messages.at(-1).text, question.answer)
  assert.deepEqual(state.suggestions.ids, question.followUps)
})

test('back to main menu adds the requested response and category options', () => {
  const state = helpAssistantReducer(createInitialChatState(timestamp), {
    type: 'MAIN_MENU',
    sequence: 3,
    timestamp,
  })
  assert.equal(state.messages.at(-2).text, 'Back to main menu')
  assert.match(state.messages.at(-1).text, /Of course! 😊/u)
  assert.equal(state.suggestions.type, 'categories')
  assert.equal(state.suggestions.ids.length, CHAT_CATEGORIES.length)
})

test('restart clears history and restores the welcome menu while remaining open', () => {
  const state = helpAssistantReducer(
    {
      ...createInitialChatState(timestamp),
      isOpen: true,
      messages: [{ id: 'old', role: 'user', text: 'Old message', timestamp }],
    },
    { type: 'RESTART', timestamp: '10:05 AM' },
  )
  assert.equal(state.isOpen, true)
  assert.equal(state.messages.length, 1)
  assert.equal(state.messages[0].text, CHAT_WELCOME_MESSAGE)
  assert.equal(state.messages[0].timestamp, '10:05 AM')
})

test('every category and follow-up points to a valid configured question', () => {
  assert.equal(new Set(CHAT_CATEGORIES.map((item) => item.id)).size, CHAT_CATEGORIES.length)
  assert.equal(new Set(CHAT_QUESTIONS.map((item) => item.id)).size, CHAT_QUESTIONS.length)

  for (const category of CHAT_CATEGORIES) {
    assert.equal(CHAT_CATEGORY_BY_ID[category.id], category)
    for (const questionId of category.questionIds) {
      assert.ok(CHAT_QUESTION_BY_ID[questionId], `Unknown category question: ${questionId}`)
    }
  }

  for (const question of CHAT_QUESTIONS) {
    assert.ok(question.question)
    assert.ok(question.answer)
    for (const followUpId of question.followUps) {
      assert.ok(CHAT_QUESTION_BY_ID[followUpId], `Unknown follow-up: ${followUpId}`)
    }
  }
})
