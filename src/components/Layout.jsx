import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { PlusIcon, UserIcon, LogOutIcon, XIcon } from './Icons'
import ReviewModal from './ReviewModal'
import styles from './Layout.module.css'

const HamburgerIcon = ({ open }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    {open
      ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
      : <><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></>
    }
  </svg>
)

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showModal, setShowModal] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setMobileOpen(false)
    navigate('/auth')
  }

  const navTo = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>

          {/* Logo — sempre à esquerda */}
          <Link to="/" className={styles.logo}>O CONSELHO BLAZE</Link>

          {/* Nav desktop — centro */}
          <nav className={styles.nav}>
            <Link to="/" className={`${styles.navLink} ${location.pathname === '/' ? styles.navActive : ''}`}>Avaliações</Link>
            <Link to="/convocacoes" className={`${styles.navLink} ${location.pathname === '/convocacoes' ? styles.navActive : ''}`}>Convocações</Link>
          </nav>

          {/* Ações desktop */}
          <div className={styles.headerRight}>
            <NotificationBell />
            <div className={styles.avatarWrap} onClick={() => setShowUserMenu(v => !v)}>
              <div className={styles.avatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : <span>{(profile?.username || '?')[0].toUpperCase()}</span>
                }
              </div>
              {showUserMenu && (
                <div className={styles.menu} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { navigate(`/profile/${profile?.id}`); setShowUserMenu(false) }} className={styles.menuItem}>
                    <UserIcon size={16} /> Meu Perfil
                  </button>
                  <button onClick={handleSignOut} className={styles.menuItem}>
                    <LogOutIcon size={16} /> Sair
                  </button>
                </div>
              )}
            </div>
            <button className={styles.addBtn} onClick={() => setShowModal(true)} title="Nova avaliação">
              <PlusIcon size={20} />
            </button>
          </div>

          {/* Mobile: avatar + hamburger */}
          <div className={styles.mobileRight}>
            <NotificationBell />
            <div className={styles.avatarWrapMobile} onClick={() => navigate(`/profile/${profile?.id}`)}>
              <div className={styles.avatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : <span>{(profile?.username || '?')[0].toUpperCase()}</span>
                }
              </div>
            </div>
            <button className={styles.hamburger} onClick={() => setMobileOpen(v => !v)}>
              <HamburgerIcon open={mobileOpen} />
            </button>
          </div>

        </div>
        <div className={styles.headerLine} />
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className={styles.mobileBackdrop} onClick={() => setMobileOpen(false)} />
          <div className={styles.mobileDrawer}>
            <div className={styles.drawerUser}>
              <div className={styles.drawerAvatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : <span>{(profile?.username || '?')[0].toUpperCase()}</span>
                }
              </div>
              <div>
                <p className={styles.drawerName}>{profile?.full_name || profile?.username}</p>
                <p className={styles.drawerUsername}>@{profile?.username}</p>
              </div>
            </div>

            <nav className={styles.drawerNav}>
              <button onClick={() => navTo('/')} className={`${styles.drawerLink} ${location.pathname === '/' ? styles.drawerActive : ''}`}>
                Avaliações
              </button>
              <button onClick={() => navTo('/convocacoes')} className={`${styles.drawerLink} ${location.pathname === '/convocacoes' ? styles.drawerActive : ''}`}>
                Convocações
              </button>
              <button onClick={() => navTo(`/profile/${profile?.id}`)} className={styles.drawerLink}>
                Meu Perfil
              </button>
            </nav>

            <div className={styles.drawerBottom}>
              <button className={styles.drawerNewBtn} onClick={() => { setMobileOpen(false); setShowModal(true) }}>
                <PlusIcon size={16} /> Nova avaliação
              </button>
              <button className={styles.drawerSignOut} onClick={handleSignOut}>
                <LogOutIcon size={16} /> Sair
              </button>
            </div>
          </div>
        </>
      )}

      <main className={styles.main}>
        <Outlet />
      </main>

      {showModal && <ReviewModal onClose={() => setShowModal(false)} />}
      {showUserMenu && <div className={styles.backdrop} onClick={() => setShowUserMenu(false)} />}
    </div>
  )
}