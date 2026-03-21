import React, { useState } from 'react'
import Avatar from '../../components/ui/Avatar'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { Send, Paperclip } from 'lucide-react'

export default function ChatPage() {
  const [msg, setMsg] = useState('')

  const channels = [
    { id: 1, name: 'General', type: 'channel', unread: 2 },
    { id: 2, name: 'Job #1 - Acme Corp', type: 'job', unread: 0 },
    { id: 3, name: 'John Doe', type: 'dm', unread: 1 }
  ]

  const messages = [
    { id: 1, sender: 'Alice', content: 'Did we get the permits for Acme?', time: '10:00 AM' },
    { id: 2, sender: 'John Doe', content: 'Yes, picking them up now.', time: '10:05 AM' },
  ]

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Sidebar */}
      <div className="w-64 bg-surface-card border border-surface-border rounded-xl p-4 overflow-y-auto">
        <h2 className="font-semibold text-text-primary mb-3">Channels</h2>
        <div className="space-y-1">
          {channels.filter(c => c.type === 'channel').map(c => (
            <button key={c.id} className="w-full text-left px-3 py-2 rounded font-medium text-sm hover:bg-surface text-text-secondary">
              # {c.name} {c.unread > 0 && <span className="ml-2 bg-primary text-white text-xs px-1.5 py-0.5 rounded-full">{c.unread}</span>}
            </button>
          ))}
        </div>

        <h2 className="font-semibold text-text-primary mt-6 mb-3">JobsChats</h2>
        <div className="space-y-1">
          {channels.filter(c => c.type === 'job').map(c => (
             <button key={c.id} className="w-full text-left px-3 py-2 rounded font-medium text-sm hover:bg-surface text-text-secondary">
             # {c.name}
           </button>
          ))}
        </div>

        <h2 className="font-semibold text-text-primary mt-6 mb-3">Direct Messages</h2>
        <div className="space-y-1">
          {channels.filter(c => c.type === 'dm').map(c => (
            <button key={c.id} className="w-full flex items-center gap-2 px-3 py-2 rounded font-medium text-sm hover:bg-surface text-text-secondary">
              <Avatar name={c.name} size="sm" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 bg-surface-card border border-surface-border rounded-xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-border">
          <h2 className="font-bold text-lg text-text-primary"># General</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map(m => (
            <div key={m.id} className="flex gap-3">
              <Avatar name={m.sender} />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-text-primary text-sm">{m.sender}</span>
                  <span className="text-xs text-text-muted">{m.time}</span>
                </div>
                <p className="text-text-secondary text-sm mt-1">{m.content}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-surface-border bg-surface-card">
          <div className="flex gap-2">
            <button className="p-2 text-text-muted hover:text-text-primary rounded-lg transition-colors">
              <Paperclip size={20} />
            </button>
            <Input 
              placeholder="Type a message..." 
              value={msg} 
              onChange={e => setMsg(e.target.value)} 
              className="flex-1"
            />
            <Button className="px-4"><Send size={18} /></Button>
          </div>
        </div>
      </div>
    </div>
  )
}
