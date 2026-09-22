import { Outlet, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import {
  PlusIcon,
  UserIcon,
  LogOutIcon,
  MenuIcon,
  XIcon,
  BellIcon
} from './Icons'
import ReviewModal from './ReviewModal'
import styles from './Layout.module.css'

export default function Layout() {
  const { profile, user, signOut } = useAuth()
  const navigate = useNavigate()

  const [showModal, setShowModal] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  const [notifications, setNotifications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)

  const notificationRef = useRef(null)

  const unreadCount = notifications.filter(
    notification => !notification.read
  ).length

  /*
   * =========================================
   * NOTIFICAÇÕES EM TEMPO REAL
   * =========================================
   */

  useEffect(() => {
    if (!user?.id) return

    let mounted = true

    const channel = supabase
      .channel(`notifications-${user.id}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        payload => {
          if (!mounted) return

          // Só adiciona notificações destinadas
          // ao usuário atualmente logado
          if (payload.new.user_id !== user.id) {
            return
          }

          console.log(
            'Nova notificação recebida em tempo real:',
            payload.new
          )

          setNotifications(current => {
            const exists = current.some(
              notification =>
                notification.id === payload.new.id
            )

            if (exists) {
              return current
            }

            return [
              payload.new,
              ...current
            ]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications'
        },
        payload => {
          if (!mounted) return

          if (payload.new.user_id !== user.id) {
            return
          }

          setNotifications(current =>
            current.map(notification =>
              notification.id === payload.new.id
                ? payload.new
                : notification
            )
          )
        }
      )
      .subscribe(status => {
        console.log(
          'Realtime notificações:',
          status
        )
      })

    /*
     * Busca as notificações existentes
     * depois de iniciar o Realtime.
     */
    const loadNotifications = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', {
          ascending: false
        })
        .limit(30)

      if (error) {
        console.error(
          'Erro ao carregar notificações:',
          error
        )
        return
      }

      if (!mounted) return

      setNotifications(data || [])
    }

    loadNotifications()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  /*
   * =========================================
   * FECHAR NOTIFICAÇÕES AO CLICAR FORA
   * =========================================
   */

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setShowNotifications(false)
      }
    }

    document.addEventListener(
      'mousedown',
      handleClickOutside
    )

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      )
    }
  }, [])

  /*
   * =========================================
   * MARCAR NOTIFICAÇÃO COMO LIDA
   * =========================================
   */

  const markAsRead = async notification => {
    if (!notification.read) {
      const { error } = await supabase
        .from('notifications')
        .update({
          read: true
        })
        .eq('id', notification.id)
        .eq('user_id', user.id)

      if (error) {
        console.error(
          'Erro ao marcar notificação como lida:',
          error
        )
        return
      }

      setNotifications(current =>
        current.map(item =>
          item.id === notification.id
            ? {
                ...item,
                read: true
              }
            : item
        )
      )
    }

    setShowNotifications(false)

    if (notification.review_id) {
      navigate(
        `/review/${notification.review_id}`
      )
      return
    }

    if (notification.convocacao_id) {
      navigate('/convocacoes')
      return
    }

    if (notification.julgamento_id) {
      navigate('/julgamento')
    }
  }

  /*
   * =========================================
   * MARCAR TODAS COMO LIDAS
   * =========================================
   */

  const markAllAsRead = async () => {
    if (
      !user?.id ||
      unreadCount === 0
    ) {
      return
    }

    const { error } = await supabase
      .from('notifications')
      .update({
        read: true
      })
      .eq('user_id', user.id)
      .eq('read', false)

    if (error) {
      console.error(
        'Erro ao marcar notificações como lidas:',
        error
      )
      return
    }

    setNotifications(current =>
      current.map(notification => ({
        ...notification,
        read: true
      }))
    )
  }

  /*
   * =========================================
   * LOGOUT
   * =========================================
   */

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  const closeMobileMenu = () => {
    setShowMobileMenu(false)
  }

  /*
   * =========================================
   * TEMPO DA NOTIFICAÇÃO
   * =========================================
   */

  const formatNotificationTime = date => {
    if (!date) return ''

    const notificationDate = new Date(date)
    const now = new Date()

    const difference = Math.floor(
      (now - notificationDate) / 1000
    )

    if (difference < 60) {
      return 'Agora'
    }

    if (difference < 3600) {
      return `${Math.floor(
        difference / 60
      )} min atrás`
    }

    if (difference < 86400) {
      return `${Math.floor(
        difference / 3600
      )} h atrás`
    }

    if (difference < 604800) {
      return `${Math.floor(
        difference / 86400
      )} d atrás`
    }

    return notificationDate.toLocaleDateString(
      'pt-BR'
    )
  }

  return (
    <div className={styles.root}>

      <header className={styles.header}>

        <div className={styles.headerInner}>

          {/* LOGO */}

          <Link
            to="/"
            className={styles.logoWrap}
          >
            <span className={styles.logo}>
              O CONSELHO BLAZE
            </span>
          </Link>

          {/* LADO DIREITO */}

          <div className={styles.headerRight}>

            {/* NAVEGAÇÃO DESKTOP */}

            <nav className={styles.nav}>

              <Link
                to="/"
                className={styles.navLink}
              >
                Avaliações
              </Link>

              <Link
                to="/convocacoes"
                className={styles.navLink}
              >
                Convocações
              </Link>

              <Link
                to="/julgamento"
                className={styles.navLink}
              >
                Julgamento
              </Link>

              <Link
                to="/links"
                className={styles.navLink}
              >
                Links
              </Link>

            </nav>

            {/* AVATAR */}

            <div
              className={styles.avatarWrap}
              onClick={() =>
                setShowMenu(value => !value)
              }
            >

              <div className={styles.avatar}>

                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                  />
                ) : (
                  <span>
                    {(
                      profile?.username || '?'
                    )[0].toUpperCase()}
                  </span>
                )}

              </div>

              {showMenu && (
                <div
                  className={styles.menu}
                  onClick={event =>
                    event.stopPropagation()
                  }
                >

                  <button
                    onClick={() => {
                      navigate(
                        `/profile/${profile?.id}`
                      )
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

            {/* NOTIFICAÇÕES */}

            <div
              className={styles.notificationWrap}
              ref={notificationRef}
            >

              <button
                className={styles.notificationBtn}
                onClick={() =>
                  setShowNotifications(
                    value => !value
                  )
                }
                aria-label="Notificações"
                title="Notificações"
              >

                <BellIcon size={20} />

                {unreadCount > 0 && (
                  <span
                    className={
                      styles.notificationBadge
                    }
                  >
                    {unreadCount > 99
                      ? '99+'
                      : unreadCount}
                  </span>
                )}

              </button>

              {showNotifications && (
                <div
                  className={
                    styles.notificationPanel
                  }
                >

                  <div
                    className={
                      styles.notificationHeader
                    }
                  >

                    <strong>
                      Notificações
                    </strong>

                    {unreadCount > 0 && (
                      <button
                        className={
                          styles.markAllBtn
                        }
                        onClick={markAllAsRead}
                      >
                        Marcar todas como lidas
                      </button>
                    )}

                  </div>

                  <div
                    className={
                      styles.notificationList
                    }
                  >

                    {notifications.length === 0 ? (

                      <div
                        className={
                          styles.emptyNotifications
                        }
                      >
                        <BellIcon size={22} />

                        <span>
                          Nenhuma notificação
                        </span>
                      </div>

                    ) : (

                      notifications.map(
                        notification => (

                          <button
                            key={notification.id}
                            className={`
                              ${styles.notificationItem}
                              ${
                                !notification.read
                                  ? styles.notificationUnread
                                  : ''
                              }
                            `}
                            onClick={() =>
                              markAsRead(
                                notification
                              )
                            }
                          >

                            <div
                              className={
                                styles.notificationDot
                              }
                            >

                              {!notification.read && (
                                <span />
                              )}

                            </div>

                            <div
                              className={
                                styles.notificationContent
                              }
                            >

                              <strong>
                                {notification.title}
                              </strong>

                              {notification.content && (
                                <span>
                                  {
                                    notification.content
                                  }
                                </span>
                              )}

                              <small>
                                {formatNotificationTime(
                                  notification.created_at
                                )}
                              </small>

                            </div>

                          </button>

                        )
                      )

                    )}

                  </div>

                </div>
              )}

            </div>

            {/* NOVA AVALIAÇÃO */}

            <button
              className={styles.addBtn}
              onClick={() =>
                setShowModal(true)
              }
              title="Nova avaliação"
            >
              <PlusIcon size={20} />
            </button>

            {/* HAMBURGER */}

            <button
              className={styles.mobileMenuBtn}
              onClick={() =>
                setShowMobileMenu(
                  value => !value
                )
              }
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

            <Link
              to="/julgamento"
              className={styles.mobileMenuItem}
              onClick={closeMobileMenu}
            >
              Julgamento
            </Link>

            <Link
              to="/links"
              className={styles.mobileMenuItem}
              onClick={closeMobileMenu}
            >
              Links
            </Link>

            <button
              className={styles.mobileMenuItem}
              onClick={() => {
                navigate(
                  `/profile/${profile?.id}`
                )
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
        <ReviewModal
          onClose={() =>
            setShowModal(false)
          }
        />
      )}

      {showMenu && (
        <div
          className={styles.backdrop}
          onClick={() =>
            setShowMenu(false)
          }
        />
      )}

    </div>
  )
}