import React, { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { Task, PRIORITY_CONFIG } from '../../types'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isToday, isSameDay } from 'date-fns'

export default function CalendarView({ profileId }: { profileId: number }) {
  const { tasks, setEditingTaskId } = useAppStore()
  const [current, setCurrent] = useState(new Date())

  const profileTasks = tasks.filter(t => t.profile_id === profileId && t.deadline)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

  const days: Date[] = []
  let d = calStart
  while (d <= calEnd) { days.push(d); d = addDays(d, 1) }

  const tasksForDay = (day: Date): Task[] =>
    profileTasks.filter(t => t.deadline && isSameDay(new Date(t.deadline * 1000), day))

  const WEEKDAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '16px' }}>
      {/* Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth()-1))}>←</button>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{format(current, 'MMMM yyyy')}</span>
        <button className="btn btn-secondary btn-sm" onClick={() => setCurrent(new Date(current.getFullYear(), current.getMonth()+1))}>→</button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {WEEKDAYS.map(w => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{w}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, flex: 1 }}>
        {days.map((day, i) => {
          const dayTasks = tasksForDay(day)
          const isCurrentMonth = isSameMonth(day, current)
          const todayDay = isToday(day)

          return (
            <div key={i} style={{
              background: todayDay ? 'var(--accent-subtle)' : 'var(--bg-secondary)',
              border: `1px solid ${todayDay ? 'var(--accent)' : 'var(--border-subtle)'}`,
              borderRadius: 'var(--radius)',
              padding: '6px',
              opacity: isCurrentMonth ? 1 : 0.35,
              overflow: 'hidden',
              minHeight: 70
            }}>
              <div style={{
                fontSize: 12, fontWeight: todayDay ? 700 : 500,
                color: todayDay ? 'var(--accent)' : 'var(--text-secondary)',
                marginBottom: 4, textAlign: 'right'
              }}>{format(day, 'd')}</div>

              {dayTasks.slice(0, 3).map(t => {
                const pcfg = PRIORITY_CONFIG[t.priority]
                return (
                  <div key={t.id}
                    onClick={() => setEditingTaskId(t.id)}
                    title={t.title}
                    style={{
                      fontSize: 10, padding: '2px 5px', borderRadius: 3, marginBottom: 2,
                      background: `${pcfg.color}22`, color: pcfg.color,
                      border: `1px solid ${pcfg.color}44`,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      cursor: 'pointer', fontWeight: 500
                    }}
                  >{t.title}</div>
                )
              })}
              {dayTasks.length > 3 && (
                <div style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>+{dayTasks.length - 3} more</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
