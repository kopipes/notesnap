import BottomNav from '@/components/ui/BottomNav'

export default function TabsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Page content — padded above bottom nav */}
      <div className="flex-1 pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
        {children}
      </div>
      <BottomNav />
    </div>
  )
}
