import {
  CHAT_CATEGORIES,
  CHAT_MAIN_MENU_MESSAGE,
  CHAT_WELCOME_MESSAGE,
} from './helpTopics.js'

function message(id, role, text, timestamp) {
  return { id, role, text, timestamp }
}

export function createInitialChatState(timestamp = '') {
  return {
    isOpen: false,
    messages: [message('welcome', 'assistant', CHAT_WELCOME_MESSAGE, timestamp)],
    suggestions: {
      type: 'categories',
      ids: CHAT_CATEGORIES.map((category) => category.id),
    },
  }
}

export function helpAssistantReducer(state, action) {
  switch (action.type) {
    case 'OPEN':
      return { ...state, isOpen: true }
    case 'MINIMIZE':
      return { ...state, isOpen: false }
    case 'SELECT_CATEGORY':
      return {
        ...state,
        messages: [
          ...state.messages,
          message(`${action.sequence}-user`, 'user', action.label, action.timestamp),
          message(`${action.sequence}-assistant`, 'assistant', action.prompt, action.timestamp),
        ],
        suggestions: { type: 'questions', ids: action.questionIds },
      }
    case 'SELECT_QUESTION':
      return {
        ...state,
        messages: [
          ...state.messages,
          message(`${action.sequence}-user`, 'user', action.question, action.timestamp),
          message(`${action.sequence}-assistant`, 'assistant', action.answer, action.timestamp),
        ],
        suggestions: { type: 'questions', ids: action.followUpIds },
      }
    case 'MAIN_MENU':
      return {
        ...state,
        messages: [
          ...state.messages,
          message(`${action.sequence}-user`, 'user', 'Back to main menu', action.timestamp),
          message(
            `${action.sequence}-assistant`,
            'assistant',
            CHAT_MAIN_MENU_MESSAGE,
            action.timestamp,
          ),
        ],
        suggestions: {
          type: 'categories',
          ids: CHAT_CATEGORIES.map((category) => category.id),
        },
      }
    case 'RESTART':
      return { ...createInitialChatState(action.timestamp), isOpen: true }
    default:
      return state
  }
}
