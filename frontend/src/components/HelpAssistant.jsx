import React, { useEffect, useId, useReducer, useRef, useState } from 'react'
import {
  Bot,
  CheckCheck,
  RotateCcw,
  X,
} from 'lucide-react'

import {
  CHAT_CATEGORY_BY_ID,
  CHAT_QUESTION_BY_ID,
} from './helpTopics.js'
import {
  createInitialChatState,
  helpAssistantReducer,
} from './helpAssistantState.js'

const MAX_VISIBLE_QUESTIONS = 2

function currentTimestamp() {
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date())
}

export function HelpAssistant() {
  const [state, dispatch] = useReducer(
    helpAssistantReducer,
    undefined,
    () => createInitialChatState(currentTimestamp()),
  )
  const [questionPage, setQuestionPage] = useState(0)
  const triggerRef = useRef(null)
  const panelRef = useRef(null)
  const messagesEndRef = useRef(null)
  const messageSequenceRef = useRef(0)
  const activeCategoryQuestionIdsRef = useRef([])
  const seenQuestionIdsRef = useRef(new Set())
  const panelTitleId = useId()
  const conversationId = useId()

  const nextSequence = () => {
    messageSequenceRef.current += 1
    return messageSequenceRef.current
  }

  useEffect(() => {
    if (!state.isOpen) return undefined

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector('[data-chat-initial-focus]')?.focus()
    }, 0)

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      dispatch({ type: 'MINIMIZE' })
      window.requestAnimationFrame(() => triggerRef.current?.focus())
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [state.isOpen])

  useEffect(() => {
    if (!state.isOpen) return
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const scrollTimer = window.setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'end',
      })
    }, 30)
    return () => window.clearTimeout(scrollTimer)
  }, [state.isOpen, state.messages.length, state.suggestions])

  const minimizeAssistant = () => {
    dispatch({ type: 'MINIMIZE' })
    window.requestAnimationFrame(() => triggerRef.current?.focus())
  }

  const selectCategory = (categoryId) => {
    const category = CHAT_CATEGORY_BY_ID[categoryId]
    if (!category) return
    activeCategoryQuestionIdsRef.current = category.questionIds
    seenQuestionIdsRef.current = new Set()
    setQuestionPage(0)
    dispatch({
      type: 'SELECT_CATEGORY',
      sequence: nextSequence(),
      timestamp: currentTimestamp(),
      label: category.label,
      prompt: category.prompt,
      questionIds: category.questionIds,
    })
  }

  const selectQuestion = (questionId) => {
    const question = CHAT_QUESTION_BY_ID[questionId]
    if (!question) return
    seenQuestionIdsRef.current.add(questionId)
    setQuestionPage(0)

    const unseenCategoryQuestions = activeCategoryQuestionIdsRef.current.filter(
      (candidateId) => (
        candidateId !== questionId && !seenQuestionIdsRef.current.has(candidateId)
      ),
    )
    const reusableCategoryQuestions = activeCategoryQuestionIdsRef.current.filter(
      (candidateId) => candidateId !== questionId,
    )
    const nextQuestionIds = [...new Set([
      ...question.followUps.filter(
        (candidateId) => (
          candidateId !== questionId && !seenQuestionIdsRef.current.has(candidateId)
        ),
      ),
      ...unseenCategoryQuestions,
      ...question.followUps.filter((candidateId) => candidateId !== questionId),
      ...reusableCategoryQuestions,
    ])]

    dispatch({
      type: 'SELECT_QUESTION',
      sequence: nextSequence(),
      timestamp: currentTimestamp(),
      question: question.question,
      answer: question.answer,
      followUpIds: nextQuestionIds,
    })
  }

  const backToMainMenu = () => {
    activeCategoryQuestionIdsRef.current = []
    seenQuestionIdsRef.current = new Set()
    setQuestionPage(0)
    dispatch({
      type: 'MAIN_MENU',
      sequence: nextSequence(),
      timestamp: currentTimestamp(),
    })
  }

  const restartConversation = () => {
    messageSequenceRef.current = 0
    activeCategoryQuestionIdsRef.current = []
    seenQuestionIdsRef.current = new Set()
    setQuestionPage(0)
    dispatch({ type: 'RESTART', timestamp: currentTimestamp() })
  }

  const isQuestionList = state.suggestions.type === 'questions'
  const questionPageCount = isQuestionList
    ? Math.ceil(state.suggestions.ids.length / MAX_VISIBLE_QUESTIONS)
    : 1
  const visibleSuggestionIds = isQuestionList
    ? state.suggestions.ids.slice(
        questionPage * MAX_VISIBLE_QUESTIONS,
        (questionPage + 1) * MAX_VISIBLE_QUESTIONS,
      )
    : state.suggestions.ids

  const showMoreQuestions = () => {
    setQuestionPage((currentPage) => (currentPage + 1) % questionPageCount)
  }

  return (
    <div className="pw-chat-assistant">
      {state.isOpen && (
        <section
          ref={panelRef}
          id="pathwise-chat-panel"
          className="pw-chat-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby={panelTitleId}
        >
          <header className="pw-chat-header">
            <div className="pw-chat-header-identity">
              <span className="pw-chat-avatar" aria-hidden="true">
                <Bot size={20} strokeWidth={2.2} />
              </span>
              <div>
                <h2 id={panelTitleId}>Pathwise Assistant</h2>
                <p>Here to guide you · No login required</p>
              </div>
            </div>
            <div className="pw-chat-header-actions">
              <button
                type="button"
                onClick={restartConversation}
                aria-label="Restart conversation"
                title="Restart conversation"
              >
                <RotateCcw size={17} />
              </button>
              <button
                type="button"
                onClick={minimizeAssistant}
                aria-label="Minimize Pathwise Assistant"
                title="Minimize"
              >
                <X size={18} />
              </button>
            </div>
          </header>

          <div
            id={conversationId}
            className="pw-chat-conversation"
            aria-live="polite"
            aria-label="Pathwise help conversation"
          >
            {state.messages.map((chatMessage) => (
              <div
                key={chatMessage.id}
                className={`pw-chat-message-row is-${chatMessage.role}`}
              >
                {chatMessage.role === 'assistant' && (
                  <span className="pw-chat-message-avatar" aria-hidden="true">
                    <Bot size={14} />
                  </span>
                )}
                <div className={`pw-chat-bubble is-${chatMessage.role}`}>
                  <p>{chatMessage.text}</p>
                  <span className="pw-chat-timestamp">
                    {chatMessage.timestamp}
                    {chatMessage.role === 'user' && <CheckCheck size={13} aria-hidden="true" />}
                  </span>
                </div>
              </div>
            ))}

            <div className="pw-chat-suggestions" aria-label="Suggested questions">
              <span className="pw-chat-suggestions-label">
                {state.suggestions.type === 'categories'
                  ? 'Choose a topic'
                  : 'Suggested questions'}
              </span>
              <div className="pw-chat-suggestion-list">
                {visibleSuggestionIds.map((suggestionId, index) => {
                  const isCategory = state.suggestions.type === 'categories'
                  const item = isCategory
                    ? CHAT_CATEGORY_BY_ID[suggestionId]
                    : CHAT_QUESTION_BY_ID[suggestionId]
                  if (!item) return null
                  return (
                    <button
                      key={suggestionId}
                      type="button"
                      onClick={() => (
                        isCategory
                          ? selectCategory(suggestionId)
                          : selectQuestion(suggestionId)
                      )}
                      data-chat-initial-focus={index === 0 ? '' : undefined}
                    >
                      {isCategory ? item.label : item.question}
                    </button>
                  )
                })}
                {isQuestionList && questionPageCount > 1 && (
                  <div className="pw-chat-more-questions-row">
                    <button
                      type="button"
                      onClick={showMoreQuestions}
                      aria-label="Show more questions"
                    >
                      More questions
                    </button>
                  </div>
                )}
                {state.suggestions.type !== 'categories' && (
                  <div className="pw-chat-main-menu-row">
                    <button
                      type="button"
                      className="pw-chat-main-menu-button"
                      onClick={backToMainMenu}
                    >
                      Back to main menu
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div ref={messagesEndRef} className="pw-chat-scroll-anchor" aria-hidden="true" />
          </div>

        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        className={`pw-chat-trigger ${state.isOpen ? 'is-open' : ''}`}
        onClick={() => dispatch({ type: state.isOpen ? 'MINIMIZE' : 'OPEN' })}
        aria-expanded={state.isOpen}
        aria-controls="pathwise-chat-panel"
        aria-label={state.isOpen ? 'Minimize Pathwise Assistant' : 'Open Pathwise Assistant'}
      >
        {state.isOpen ? <X size={21} /> : <Bot size={22} strokeWidth={2.2} />}
        <span>{state.isOpen ? 'Close' : 'Ask'}</span>
      </button>
    </div>
  )
}
