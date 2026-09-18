import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../lib/AuthContext'
import {
  PlusIcon,
  UserIcon,
  LogOutIcon,
  MenuIcon,
  XIcon
} from './Icons'
import ReviewModal from './ReviewModal'
import styles from './Layout.module.css'

export default function Layout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const closeMobileMenu = () => {
    setShowMobileMenu(false)
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>

        <div className={styles.headerInner}>

          {/* LOGO */}
          <Link to="/" className={styles.logo}>
            O CONSELHO BLAZE
          </Link>


          {/* LADO DIREITO */}
          <div className={styles.headerRight}>

            {/* NAVEGAÇÃO DESKTOP */}
          <nav className={styles.nav}>
              <Link to="/" className={styles.navLink}>
                Avaliações
              </Link>

              <Link to="/convocacoes" className={styles.navLink}>
                Convocações
              </Link>
          </nav>

            {/* AVATAR */}
            <div
              className={styles.avatarWrap}
              onClick={() => setShowMenu(v => !v)}
            >
              <div className={styles.avatar}>
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" />
                ) : (
                  <span>
                    {(profile?.username || '?')[0].toUpperCase()}
                  </span>
                )}
              </div>

              {showMenu && (
                <div
                  className={styles.menu}
                  onClick={e => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      navigate(`/profile/${profile?.id}`)
                      setShowMenu(false)
                    }}
                    className={styles.menuItem}
                  >
                    <UserIcon size={16} />
                    Meu Perfil
                  </button>

                  <button
                    onClick={handleSignOut}
                    className={styles.menuItem}
                  >
                    <LogOutIcon size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>

            {/* BOTÃO NOVA AVALIAÇÃO - DESKTOP */}
            <button
              className={styles.addBtn}
              onClick={() => setShowModal(true)}
              title="Nova avaliação"
            >
              <PlusIcon size={20} />
            </button>

            {/* BOTÃO HAMBURGER - MOBILE */}
            <button
              className={styles.mobileMenuBtn}
              onClick={() => setShowMobileMenu(v => !v)}
              aria-label="Abrir menu"
            >
              {showMobileMenu ? (
                <XIcon size={22} />
              ) : (
                <MenuIcon size={22} />
              )}
            </button>

          </div>
        </div>

        {/* MENU MOBILE */}
        {showMobileMenu && (
          <div className={styles.mobileMenu}>

            <Link
              to="/"
              className={styles.mobileMenuItem}
              onClick={closeMobileMenu}
            >
              Avaliações
            </Link>

            <Link
              to="/convocacoes"
              className={styles.mobileMenuItem}
              onClick={closeMobileMenu}
            >
              Convocações
            </Link>

            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                navigate(`/profile/${profile?.id}`)
                closeMobileMenu()
              }}
            >
              <UserIcon size={16} />
              Meu Perfil
            </button>

            <button
              className={styles.mobileMenuItem}
              onClick={handleSignOut}
            >
              <LogOutIcon size={16} />
              Sair
            </button>

          </div>
        )}

        <div className={styles.headerLine} />

      </header>

      <main className={styles.main}>
        <Outlet />
      </main>

      {showModal && (
        <ReviewModal onClose={() => setShowModal(false)} />
      )}

      {showMenu && (
        <div
          className={styles.backdrop}
          onClick={() => setShowMenu(false)}
        />
      )}

    </div>
  )
}