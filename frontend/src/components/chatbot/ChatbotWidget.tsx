
// frontend/src/components/chatbot/ChatbotWidget.tsx - RESPONSIVE VERSION
import React, { useState, useEffect, useRef } from 'react'
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  CalendarIcon,
  PhoneIcon,
  UserIcon,
  ChevronDownIcon,
  MinusIcon
} from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'

interface Message {
  id: string
  type: 'user' | 'bot'
  content: string
  timestamp: Date
  actions?: {
    type: 'schedule' | 'contact'
    data?: any
  }[]
}

interface AvailableSlot {
  datetime: string
  display: string
  duration: string
}

interface ChatbotWidgetProps {
  companyId: string
  isOpen?: boolean
  onToggle?: () => void
  position?: 'bottom-right' | 'bottom-left'
  theme?: 'light' | 'dark'
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  companyId,
  isOpen = false,
  onToggle,
  position = 'bottom-right',
  theme = 'light'
}) => {
  const actualCompanyId = companyId === 'your-company-id' ? '68af46dab1355f0072ad6fa1' : companyId
  const [isWidgetOpen, setIsWidgetOpen] = useState(isOpen)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected')
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [showScheduling, setShowScheduling] = useState(false)
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    email: ''
  })
  const [showCustomerForm, setShowCustomerForm] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()

  // Detect if we're on mobile
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // WebSocket connection with multiple endpoint testing
  const connectWebSocket = () => {
    try {
      setConnectionStatus('connecting')
      
      // Get the API URL and convert to WebSocket URL
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const wsUrl = apiUrl.replace('http', 'ws')
      
      // TEST MULTIPLE ENDPOINTS - Try them in order
      const testEndpoints = [
        `${wsUrl}/test-chatbot/${actualCompanyId}`,              
        `${wsUrl}/test-ws`,                                
        `${wsUrl}/api/v1/ws/chatbot/${actualCompanyId}`,        
      ]
      
      let currentEndpointIndex = 0
      
      const tryConnection = (endpointUrl: string) => {
        console.log(`🔌 Trying WebSocket connection to: ${endpointUrl}`)
        
        const websocket = new WebSocket(endpointUrl)

        websocket.onopen = () => {
          console.log('✅ WebSocket connected to:', endpointUrl)
          setWs(websocket)
          setConnectionStatus('connected')
          
          // Clear any pending reconnection attempts
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current)
          }
        }

        websocket.onmessage = (event) => {
          console.log('📨 WebSocket message received:', event.data)
          try {
            const data = JSON.parse(event.data)
            handleWebSocketMessage(data)
          } catch {
            // Handle plain text messages
            addBotMessage(event.data)
          }
        }

        websocket.onclose = (event) => {
          console.log(`🔌 WebSocket disconnected from ${endpointUrl}:`, event.code, event.reason)
          setWs(null)
          setConnectionStatus('disconnected')
          
          // Try next endpoint or reconnect
          if (currentEndpointIndex < testEndpoints.length - 1) {
            currentEndpointIndex++
            console.log(`⏭️  Trying next endpoint: ${testEndpoints[currentEndpointIndex]}`)
            setTimeout(() => tryConnection(testEndpoints[currentEndpointIndex]), 1000)
          } else if (isWidgetOpen && !event.wasClean) {
            // All endpoints failed, try again from the beginning
            currentEndpointIndex = 0
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('🔄 Retrying all endpoints...')
              tryConnection(testEndpoints[currentEndpointIndex])
            }, 3000)
          }
        }

        websocket.onerror = (error) => {
          console.error(`❌ WebSocket error on ${endpointUrl}:`, error)
          
          // Try next endpoint immediately on error
          if (currentEndpointIndex < testEndpoints.length - 1) {
            currentEndpointIndex++
            console.log(`⏭️  Error occurred, trying next endpoint: ${testEndpoints[currentEndpointIndex]}`)
            setTimeout(() => tryConnection(testEndpoints[currentEndpointIndex]), 500)
          } else {
            setConnectionStatus('disconnected')
            if (isLoading) {
              setIsLoading(false)
              addBotMessage("I'm having trouble connecting in real-time, but I can still help you via our backup system.")
            }
          }
        }
      }
      
      // Start with first endpoint
      tryConnection(testEndpoints[currentEndpointIndex])

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error)
      setConnectionStatus('disconnected')
    }
  }

  // WebSocket connection
  useEffect(() => {
    if (isWidgetOpen && connectionStatus === 'disconnected') {
      connectWebSocket()
    }
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (ws) {
        ws.close()
      }
    }
  }, [isWidgetOpen])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Welcome message
  useEffect(() => {
    if (isWidgetOpen && messages.length === 0 && connectionStatus === 'connected') {
      setTimeout(() => {
        addBotMessage(
          "Hi! I'm your AI assistant. I can help you with service requests, scheduling appointments, and answering questions. How can I help you today?"
        )
      }, 500)
    }
  }, [isWidgetOpen, connectionStatus])

  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('Chatbot connected:', data.company_id || data.message)
        // Send welcome message for successful connection
        addBotMessage(data.message || "AI assistant connected successfully!")
        break
        
      case 'chat_response':
        setIsLoading(false)
        setSessionId(data.session_id)
        addBotMessage(data.message)
        
        // Handle actions
        if (data.actions?.actions_taken) {
          handleBotActions(data.actions.actions_taken)
        }
        
        // Handle human escalation
        if (data.requires_human) {
          addBotMessage("Let me connect you with one of our team members who can better assist you. Please hold on...")
        }
        break
        
      case 'schedule_response':
        handleScheduleResponse(data.result)
        break
        
      case 'error':
        setIsLoading(false)
        addBotMessage("I apologize, but I'm having trouble processing your request. Please try again or contact us directly.")
        break
        
      case 'pong':
        // Keep-alive response
        break
    }
  }

  const handleBotActions = (actions: any[]) => {
    actions.forEach(action => {
      if (action.type === 'calendar_check' && action.success) {
        setAvailableSlots(action.available_slots || [])
        if (action.available_slots?.length > 0) {
          setShowScheduling(true)
        }
      }
    })
  }

  const handleScheduleResponse = (result: any) => {
    if (result.success) {
      addBotMessage(result.message)
      setShowScheduling(false)
      setAvailableSlots([])
    } else {
      addBotMessage("I'm sorry, there was an issue scheduling your appointment. Please try again or contact us directly.")
    }
  }

  const toggleWidget = () => {
    const newState = !isWidgetOpen
    setIsWidgetOpen(newState)
    onToggle?.()
    
    if (newState && inputRef.current && !isMobile) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    
    if (!newState && ws) {
      ws.close()
      setWs(null)
      setConnectionStatus('disconnected')
    }
  }

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized)
  }

  const addBotMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'bot',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, message])
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const message = inputMessage.trim()
    setInputMessage('')
    setIsLoading(true)
    
    addUserMessage(message)

    // Try WebSocket first
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify({
          type: 'chat',
          message,
          session_id: sessionId
        }))
        return
      } catch (error) {
        console.error('WebSocket send error:', error)
      }
    }

    // Fallback to REST API
    try {
      const apiUrl = import.meta.env.VITE_API_URL || ''
      const response = await fetch(`${apiUrl}/api/v1/ai-chatbot/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
          company_id: companyId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.session_id)
        addBotMessage(data.message)
        
        if (data.actions?.actions_taken) {
          handleBotActions(data.actions.actions_taken)
        }
        
        if (data.requires_human) {
          addBotMessage("Let me connect you with one of our team members who can better assist you.")
        }
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Error sending message:', error)
      addBotMessage("I'm sorry, I'm having trouble connecting right now. Please try refreshing the page or contact us directly.")
    }
    
    setIsLoading(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scheduleAppointment = (slot: AvailableSlot) => {
    if (!customerInfo.name || !customerInfo.phone) {
      setShowCustomerForm(true)
      return
    }

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'schedule',
        slot_datetime: slot.datetime,
        customer_info: customerInfo,
        session_id: sessionId
      }))
    }
    
    addUserMessage(`I'd like to schedule for ${slot.display}`)
    setShowScheduling(false)
  }

  const submitCustomerInfo = () => {
    if (!customerInfo.name || !customerInfo.phone) return
    
    setShowCustomerForm(false)
    addBotMessage("Thank you! Now you can select a time slot.")
  }

  // Send periodic ping to keep connection alive
  useEffect(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }))
        }
      }, 30000) // Every 30 seconds

      return () => clearInterval(pingInterval)
    }
  }, [ws])

  const positionClasses = {
    'bottom-right': 'bottom-2 sm:bottom-4 right-2 sm:right-4',
    'bottom-left': 'bottom-2 sm:bottom-4 left-2 sm:left-4'
  }

  const themeClasses = {
    light: {
      widget: 'bg-white border-gray-200',
      header: 'bg-blue-600 text-white',
      input: 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
      userMessage: 'bg-blue-600 text-white',
      botMessage: 'bg-gray-100 text-gray-900'
    },
    dark: {
      widget: 'bg-gray-800 border-gray-600',
      header: 'bg-gray-900 text-white',
      input: 'border-gray-600 bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500',
      userMessage: 'bg-blue-600 text-white',
      botMessage: 'bg-gray-700 text-gray-100'
    }
  }

  // Responsive sizing
  const getWidgetSize = () => {
    if (isMobile) {
      return 'w-[calc(100vw-1rem)] h-[calc(100vh-5rem)] max-w-sm'
    }
    return 'w-80 sm:w-96 h-[400px] sm:h-[500px]'
  }

  return (
    <div className={`fixed z-50 ${positionClasses[position]}`}>
      {/* Chat Widget */}
      {isWidgetOpen && (
        <div className={`${getWidgetSize()} rounded-lg shadow-2xl border ${themeClasses[theme].widget} flex flex-col mb-2 sm:mb-4 ${isMinimized ? 'h-auto' : ''}`}>
          {/* Header */}
          <div className={`${themeClasses[theme].header} px-3 sm:px-4 py-2 sm:py-3 rounded-t-lg flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center space-x-2 min-w-0">
              <ChatBubbleLeftRightIcon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="font-semibold text-sm sm:text-base truncate">AI Assistant</span>
              {/* Connection Status Indicator */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                connectionStatus === 'connected' ? 'bg-green-400' : 
                connectionStatus === 'connecting' ? 'bg-yellow-400' : 
                'bg-red-400'
              }`} title={`Connection: ${connectionStatus}`} />
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              {/* Minimize button (desktop only) */}
              {!isMobile && (
                <button
                  onClick={toggleMinimize}
                  className="text-white hover:text-gray-200 transition-colors p-1"
                >
                  <MinusIcon className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={toggleWidget}
                className="text-white hover:text-gray-200 transition-colors p-1"
              >
                <XMarkIcon className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Connection Status Message */}
          {!isMinimized && (
            <>
              {connectionStatus === 'connecting' && (
                <div className="px-3 sm:px-4 py-2 bg-yellow-50 border-b text-yellow-800 text-xs flex-shrink-0">
                  Connecting to AI assistant...
                </div>
              )}
              
              {connectionStatus === 'disconnected' && messages.length > 0 && (
                <div className="px-3 sm:px-4 py-2 bg-red-50 border-b text-red-800 text-xs flex-shrink-0">
                  Connection lost. Messages will use backup system.
                </div>
              )}

              {/* Messages */}
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-2 sm:space-y-3 min-h-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[80%] px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm break-words ${
                        message.type === 'user'
                          ? themeClasses[theme].userMessage
                          : themeClasses[theme].botMessage
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{message.content}</div>
                      <div className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className={`${themeClasses[theme].botMessage} px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm`}>
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              {/* Available Slots */}
              {showScheduling && availableSlots.length > 0 && (
                <div className="border-t p-3 sm:p-4 max-h-24 sm:max-h-32 overflow-y-auto flex-shrink-0">
                  <div className="text-xs sm:text-sm font-medium mb-2">Available Times:</div>
                  <div className="space-y-1">
                    {availableSlots.slice(0, 3).map((slot, index) => (
                      <button
                        key={index}
                        onClick={() => scheduleAppointment(slot)}
                        className="w-full text-left text-xs px-2 py-1 bg-blue-50 hover:bg-blue-100 rounded border text-blue-700 flex items-center space-x-1"
                      >
                        <CalendarIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{slot.display}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customer Info Form */}
              {showCustomerForm && (
                <div className="border-t p-3 sm:p-4 flex-shrink-0">
                  <div className="text-xs sm:text-sm font-medium mb-2">Contact Information:</div>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Your Name *"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${themeClasses[theme].input}`}
                    />
                    <input
                      type="tel"
                      placeholder="Phone Number *"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${themeClasses[theme].input}`}
                    />
                    <input
                      type="email"
                      placeholder="Email (optional)"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full px-2 py-1.5 text-xs rounded border ${themeClasses[theme].input}`}
                    />
                    <button
                      onClick={submitCustomerInfo}
                      disabled={!customerInfo.name || !customerInfo.phone}
                      className="w-full px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="border-t p-3 sm:p-4 flex-shrink-0">
                <div className="flex space-x-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className={`flex-1 px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg border ${themeClasses[theme].input} min-w-0`}
                    disabled={isLoading}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                  >
                    <PaperAirplaneIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                  </button>
                </div>
                
                {/* Connection status info */}
                <div className="text-xs text-gray-500 mt-1">
                  {connectionStatus === 'connected' ? '🟢 Real-time chat active' : 
                   connectionStatus === 'connecting' ? '🟡 Connecting...' : 
                   '🔴 Using backup connection'}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={toggleWidget}
        className={`${isMobile ? 'w-12 h-12' : 'w-12 h-12 sm:w-14 sm:h-14'} bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95`}
      >
        {isWidgetOpen ? (
          <XMarkIcon className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6'}`} />
        ) : (
          <>
            <ChatBubbleLeftRightIcon className={`${isMobile ? 'w-5 h-5' : 'w-5 h-5 sm:w-6 sm:h-6'}`} />
            {/* Notification dot when disconnected */}
            {connectionStatus !== 'connected' && (
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-full border-2 border-white"></div>
            )}
          </>
        )}
      </button>
    </div>
  )
}

export default ChatbotWidget




