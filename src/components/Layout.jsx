import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import { PlusIcon, UserIcon, LogOutIcon } from './Icons'
import ReviewModal from './ReviewModal'
import styles from './Layout.module.css'
import { useTheme } from '../lib/ThemeContext'
import { MoonIcon, SunIcon } from './Icons'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const { dark, toggle } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>O CONSELHO BLAZE</Link>
          <div className={styles.headerRight}>
            <button className={styles.themeBtn} onClick={toggle} title="Alternar tema">
              {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>
            <div className={styles.avatarWrap} onClick={() => setShowMenu(v => !v)}>
              <div className={styles.avatar}>
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="" />
                  : <span>{(profile?.username || '?')[0].toUpperCase()}</span>
                }
              </div>
              {showMenu && (
                <div className={styles.menu} onClick={e => e.stopPropagation()}>
                  <button onClick={() => { navigate(`/profile/${profile?.id}`); setShowMenu(false) }} className={styles.menuItem}>
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
        </div>
        <div className={styles.headerLine} />
      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {showModal && <ReviewModal onClose={() => setShowModal(false)} />}

      {showMenu && <div className={styles.backdrop} onClick={() => setShowMenu(false)} />}
    </div>
  )
}
