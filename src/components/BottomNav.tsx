import { NavLink } from 'react-router-dom'

const items = [
  { to: '/', label: 'Add', icon: '➕' },
  { to: '/transactions', label: 'History', icon: '🧾' },
  { to: '/analytics', label: 'Stats', icon: '📊' },
  { to: '/people', label: 'People', icon: '👥' },
  { to: '/settings', label: 'More', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-lg justify-around pb-[env(safe-area-inset-bottom)]">
        {items.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-3 py-2 text-[11px] ${
                isActive ? 'text-sky-400' : 'text-slate-400'
              }`
            }
          >
            <span className="text-lg leading-none">{it.icon}</span>
            {it.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
