import { ReactNode, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Users,
  Package,
  UserCog,
  UsersRound,
  DollarSign,
  FileText,
  User,
  Menu,
  X,
  Search,
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { useAuthCtx } from "../auth";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const menuItems = [
  { id: 'dashboard', label: 'Início', icon: Home },
  
  { id: 'funcionarios', label: 'Funcionários', icon: UserCog },
  { id: 'equipes', label: 'Obras', icon: UsersRound },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'pdf', label: 'Automação PDF', icon: FileText },
  { id: 'conta', label: 'Minha Conta', icon: User },
];

export function Layout({ children, currentPage, onNavigate, onLogout }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { profile } = useAuthCtx();
  const displayName =
    (profile?.name?.trim?.() || profile?.email?.split("@")[0] || "Usuário");

  return (
    <div className="min-h-screen bg-[#F8F7F4]">
      {/* Topbar */}
      <div className="h-16 bg-white border-b border-[rgba(79,97,57,0.1)] fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          {/* Removido: ícone e nome Peperaio no topo esquerdo */}
        </div>

        <div className="flex-1 max-w-md mx-4 hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#626262]" />
            <Input
              placeholder="Buscar..."
              className="pl-10 rounded-xl bg-[#F8F7F4]"
            />
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3 pr-3 user-avatar">
          {/* nome cadastrado */}
          <span className="text-sm font-bold text-[#2C2C2C] max-w-[180px] truncate">
            {displayName}
          </span>

          {/* avatar fixo 36px, redondo - clicável para Minha Conta */}
          <div
            onClick={() => onNavigate('conta')}
            title="Ir para Minha Conta"
            className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-black/5 flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-[#4F6139]/60 transition-all"
          >
            <img
              src={profile?.avatar_url || "https://placehold.co/80x80?text=P"}
              alt={displayName}
              className="w-full h-full object-cover rounded-full"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </div>

      {/* Sidebar Desktop */}
      <aside className="hidden md:block fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-[rgba(79,97,57,0.1)] overflow-y-auto">
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <motion.button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-[#4F6139] text-white'
                    : 'text-[#2C2C2C] hover:bg-[#F8F7F4]'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </motion.button>
            );
          })}
        </nav>
      </aside>

      {/* Sidebar Mobile */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-[rgba(79,97,57,0.1)] z-50 overflow-y-auto md:hidden"
            >
              <nav className="p-4 space-y-2">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onNavigate(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? 'bg-[#4F6139] text-white'
                          : 'text-[#2C2C2C] hover:bg-[#F8F7F4]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="pt-16 md:pl-64">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="p-4 md:p-6 lg:p-8"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
